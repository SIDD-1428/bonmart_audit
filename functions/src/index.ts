import * as admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();

type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  name?: string;
};

class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function aggregateItems(items: unknown): Map<string, { quantity: number; name: string }> {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw new OrderValidationError("INVALID_ORDER: The order must contain between 1 and 100 items.");
  }

  const aggregated = new Map<string, { quantity: number; name: string }>();

  for (const rawItem of items) {
    const item = rawItem as Partial<OrderItem>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = Number(item.quantity);

    if (!productId) {
      throw new OrderValidationError("INVALID_PRODUCT: An order item has no valid product ID.");
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new OrderValidationError(`INVALID_QUANTITY: ${item.name ?? productId}`);
    }

    const existing = aggregated.get(productId);
    if (existing) {
      existing.quantity += quantity;
      if (!Number.isSafeInteger(existing.quantity)) {
        throw new OrderValidationError(`INVALID_QUANTITY: ${item.name ?? productId}`);
      }
    } else {
      aggregated.set(productId, {
        quantity,
        name: typeof item.name === "string" ? item.name : productId,
      });
    }
  }

  return aggregated;
}

async function sendNotificationToUser(
  userId: string | undefined,
  title: string,
  body: string
): Promise<void> {
  if (!userId) return;

  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return;

    const token = userSnap.data()?.fcmToken;
    if (typeof token !== "string" || !token) return;

    await getMessaging().send({
      token,
      notification: { title, body },
      android: { priority: "high" },
    });
  } catch (error: any) {
    console.error("Notification error:", error);

    if (
      error?.code === "messaging/registration-token-not-registered" ||
      error?.code === "messaging/invalid-registration-token"
    ) {
      try {
        await db.collection("users").doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete(),
        });
      } catch (cleanupError) {
        console.error("Unable to remove invalid FCM token:", cleanupError);
      }
    }
    // FCM is best-effort; a notification failure must not fail order processing.
  }
}

/**
 * Validates a new customer order and deducts stock in one Firestore transaction.
 * The transaction re-reads the latest order and product documents before writing.
 */
export const processNewOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
    retry: true,
  },
  async (event) => {
    const createdOrder = event.data?.data();
    if (!createdOrder) return;

    const orderRef = db.collection("orders").doc(event.params.orderId);

    try {
      await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) return;

        const order = orderSnap.data();
        if (!order) return;

        // Duplicate events and orders already cancelled must not deduct stock.
        if (order.stockDeducted === true || order.status !== "Pending") return;

        if (typeof order.userId !== "string" || !order.userId) {
          throw new OrderValidationError("INVALID_ORDER: Missing customer ID.");
        }

        const groupedItems = aggregateItems(order.items);
        const productRefs = Array.from(groupedItems.keys()).map((id) =>
          db.collection("products").doc(id)
        );

        // Read all product documents before issuing any transaction writes.
        const productSnaps = [];
        for (const productRef of productRefs) {
          productSnaps.push(await transaction.get(productRef));
        }

        const deliverySettingsSnap = await transaction.get(
          db.collection("settings").doc("delivery")
        );
        const configuredThreshold = Number(
          deliverySettingsSnap.data()?.freeDeliveryThreshold ?? 1000
        );
        if (
          !Number.isFinite(configuredThreshold) ||
          configuredThreshold < 500 ||
          configuredThreshold > 5000
        ) {
          throw new OrderValidationError(
            "DELIVERY_SETTINGS_INVALID: The store's free-delivery settings are invalid."
          );
        }

        let calculatedSubtotal = 0;
        const stockUpdates: Array<{
          ref: FirebaseFirestore.DocumentReference;
          newStock: number;
        }> = [];

        for (let i = 0; i < productRefs.length; i++) {
          const productRef = productRefs[i];
          const productSnap = productSnaps[i];
          const productId = productRef.id;
          const grouped = groupedItems.get(productId)!;

          if (!productSnap.exists) {
            throw new OrderValidationError(`PRODUCT_NOT_FOUND: ${grouped.name}`);
          }

          const product = productSnap.data();
          if (!product) {
            throw new OrderValidationError(`PRODUCT_NOT_FOUND: ${grouped.name}`);
          }

          const currentPrice = Number(product.price);
          const currentStock = Number(product.stock ?? 0);

          if (!Number.isFinite(currentPrice) || currentPrice < 0) {
            throw new OrderValidationError(`INVALID_PRODUCT_PRICE: ${grouped.name}`);
          }
          if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
            throw new OrderValidationError(`INVALID_PRODUCT_STOCK: ${grouped.name}`);
          }
          if (currentStock < grouped.quantity) {
            throw new OrderValidationError(`OUT_OF_STOCK: ${grouped.name}`);
          }
          if (product.isAvailable === false || product.isActive === false) {
            throw new OrderValidationError(`UNAVAILABLE: ${grouped.name}`);
          }

          if (product.maxOrderQty != null) {
            const maxOrderQty = Number(product.maxOrderQty);
            if (
              !Number.isSafeInteger(maxOrderQty) ||
              maxOrderQty < 1 ||
              grouped.quantity > maxOrderQty
            ) {
              throw new OrderValidationError(
                `ORDER_LIMIT: ${grouped.name} (maximum ${product.maxOrderQty})`
              );
            }
          }

          // Validate each submitted line price against the current server price.
          const matchingLines = (order.items as OrderItem[]).filter(
            (item) => item.productId === productId
          );
          for (const line of matchingLines) {
            if (money(Number(line.unitPrice)) !== money(currentPrice)) {
              throw new OrderValidationError(
                `PRICE_CHANGED: ${grouped.name}. Current price is ₹${money(currentPrice)}.`
              );
            }
          }

          calculatedSubtotal += currentPrice * grouped.quantity;
          stockUpdates.push({
            ref: productRef,
            newStock: currentStock - grouped.quantity,
          });
        }

        calculatedSubtotal = money(calculatedSubtotal);
        const expectedDeliveryCharge = calculatedSubtotal >= configuredThreshold ? 0 : 30;
        const expectedDiscount = 0;
        const expectedGrandTotal = money(
          calculatedSubtotal + expectedDeliveryCharge - expectedDiscount
        );

        const submittedSubtotal = Number(order.pricing?.subtotal);
        const submittedDeliveryCharge = Number(order.pricing?.deliveryCharge);
        const submittedDiscount = Number(order.pricing?.discount ?? 0);
        const submittedGrandTotal = Number(order.pricing?.grandTotal);
        const submittedOrderTotal = Number(order.total);

        if (
          !Number.isFinite(submittedSubtotal) ||
          !Number.isFinite(submittedDeliveryCharge) ||
          !Number.isFinite(submittedDiscount) ||
          !Number.isFinite(submittedGrandTotal) ||
          !Number.isFinite(submittedOrderTotal) ||
          money(submittedSubtotal) !== calculatedSubtotal ||
          money(submittedDeliveryCharge) !== expectedDeliveryCharge ||
          money(submittedDiscount) !== expectedDiscount ||
          money(submittedGrandTotal) !== expectedGrandTotal ||
          money(submittedOrderTotal) !== expectedGrandTotal
        ) {
          throw new OrderValidationError(
            "ORDER_TOTAL_MISMATCH: Your cart total has changed. Please refresh your cart and try again."
          );
        }

        for (const update of stockUpdates) {
          transaction.update(update.ref, { stock: update.newStock });
        }

        transaction.update(orderRef, {
          stockDeducted: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error: any) {
      console.error(`Order processing failed (${event.params.orderId}):`, error);

      if (error instanceof OrderValidationError) {
        // Reject only if the order is still pending and stock has not been deducted.
        await db.runTransaction(async (transaction) => {
          const latestSnap = await transaction.get(orderRef);
          if (!latestSnap.exists) return;

          const latest = latestSnap.data();
          if (
            !latest ||
            latest.status !== "Pending" ||
            latest.stockDeducted === true
          ) {
            return;
          }

          transaction.update(orderRef, {
            status: "Rejected",
            rejectionReason: error.message,
            "payment.status": "Failed",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        return;
      }

      // Retry unexpected/transient failures rather than rejecting a valid order.
      throw error;
    }
  }
);

/**
 * Restores stock once when an already-processed order transitions to Cancelled.
 * This handles cancellations initiated by either a customer or an admin.
 */
export const restoreStockAfterCancellation = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
    retry: true,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    if (before.status === "Cancelled" || after.status !== "Cancelled") return;

    const orderRef = db.collection("orders").doc(event.params.orderId);

    await db.runTransaction(async (transaction) => {
      const latestOrderSnap = await transaction.get(orderRef);
      if (!latestOrderSnap.exists) return;

      const latestOrder = latestOrderSnap.data();
      if (
        !latestOrder ||
        latestOrder.status !== "Cancelled" ||
        latestOrder.stockDeducted !== true ||
        latestOrder.stockRestored === true
      ) {
        return;
      }

      const groupedItems = aggregateItems(latestOrder.items);
      const productRefs = Array.from(groupedItems.keys()).map((id) =>
        db.collection("products").doc(id)
      );

      const productSnaps = [];
      for (const productRef of productRefs) {
        productSnaps.push(await transaction.get(productRef));
      }

      const stockUpdates: Array<{
        ref: FirebaseFirestore.DocumentReference;
        newStock: number;
      }> = [];

      for (let i = 0; i < productRefs.length; i++) {
        const productRef = productRefs[i];
        const productSnap = productSnaps[i];
        const grouped = groupedItems.get(productRef.id)!;

        if (!productSnap.exists) {
          throw new Error(`Cannot restore stock: product ${productRef.id} does not exist.`);
        }

        const currentStock = Number(productSnap.data()?.stock ?? 0);
        if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
          throw new Error(`Cannot restore stock: invalid stock for ${productRef.id}.`);
        }

        const restoredStock = currentStock + grouped.quantity;
        if (!Number.isSafeInteger(restoredStock)) {
          throw new Error(`Cannot restore stock: invalid restored quantity for ${productRef.id}.`);
        }

        stockUpdates.push({ ref: productRef, newStock: restoredStock });
      }

      for (const update of stockUpdates) {
        transaction.update(update.ref, { stock: update.newStock });
      }

      transaction.update(orderRef, {
        stockRestored: true,
        "payment.status": "Cancelled",
        stockRestoredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }
);

/**
 * Sends notifications after successful stock deduction and on later status
 * changes. FCM notifications are best-effort and are not exactly-once.
 */
export const notifyCustomerOrderUpdates = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
    retry: true,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // An order is considered placed only after stock has actually been deducted.
    if (before.stockDeducted !== true && after.stockDeducted === true) {
      await sendNotificationToUser(
        after.userId,
        "Order Placed",
        "We've received your order and will start preparing it shortly."
      );
    }

    if (before.status === after.status) return;

    const notifications: Record<string, { title: string; body: string }> = {
      Accepted: {
        title: "Order Accepted",
        body: "Your order has been accepted.",
      },
      Packed: {
        title: "Order Packed",
        body: "Your order has been packed.",
      },
      "Out For Delivery": {
        title: "Out for Delivery",
        body: "Your order is on the way.",
      },
      Delivered: {
        title: "Delivered",
        body: "Your order has been delivered.",
      },
      Cancelled: {
        title: "Order Cancelled",
        body: "Your order has been cancelled.",
      },
      Rejected: {
        title: "Order Rejected",
        body: after.rejectionReason ?? "Your order could not be processed.",
      },
    };

    const notification = notifications[after.status];
    if (!notification) return;

    await sendNotificationToUser(
      after.userId,
      notification.title,
      notification.body
    );
  }
);
