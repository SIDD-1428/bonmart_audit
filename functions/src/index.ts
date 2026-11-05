import * as admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();


//notifications
async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string
) {
  const userSnap = await db.collection("users").doc(userId).get();

  if (!userSnap.exists) return;

  const token = userSnap.data()?.fcmToken;

  if (!token) {
    console.log("No FCM token for", userId);
    return;
  }

  try{await getMessaging().send({
    token,
    notification: {
      title,
      body,
    },
    android: {
      priority: "high",
    },
  });
console.log("Notification sent");
}catch (error: any) {
  console.error("Notification Error:", error);

  if (
    error.code === "messaging/registration-token-not-registered" ||
    error.code === "messaging/invalid-registration-token"
  ) {
    await db.collection("users").doc(userId).update({
      fcmToken: admin.firestore.FieldValue.delete(),
    });
  }
}

  
}


export const restoreStockAfterCancellation = onDocumentUpdated(
  
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },
  async (event) => {
    console.log("Function started");
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    console.log("CANCEL TRIGGER");
    console.log("Order:", event.params.orderId);
    console.log("Before Status:", before.status);
    console.log("After Status:", after.status);
    console.log("Stock Deducted:", after.stockDeducted);
    console.log("Stock Restored:", after.stockRestored);

    if (
      before.status === "Pending" &&
      after.status === "Cancelled" &&
      after.stockDeducted === true &&
      after.stockRestored === false
    ) {
      try {
        await db.runTransaction(async (transaction) => {
        const orderRef = db.collection("orders").doc(event.params.orderId);

        for (const item of after.items || []) {
          transaction.update(
            db.collection("products").doc(item.productId),
            {
              stock: admin.firestore.FieldValue.increment(item.quantity),
            }
          );
        }

        transaction.update(orderRef, {
          stockRestored: true,
          "payment.status": "Cancelled",
        });
      });
      console.log(`stock restored for order ${event.params.orderId}`);
      }
       catch (err) {
        console.error("Restore Stock Error:", err);
      }
    } else {
      console.log("Conditions not satisfied. Skipping restore.");
    }
  }
);

export const processNewOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },
  async (event) => {
    const order = event.data?.data();

    if (!order) return;

    if (order.stockDeducted) return;

    const orderRef = db.collection("orders").doc(event.params.orderId);

    try {
      await db.runTransaction(async (transaction) => {
        const updates: {
          ref: FirebaseFirestore.DocumentReference;
          newStock: number;
        }[] = [];

        const latestOrderSnap = await transaction.get(orderRef);

        if (!latestOrderSnap.exists) return;

        const latestOrder = latestOrderSnap.data();

        if (!latestOrder) return;

        if (latestOrder.status === "Cancelled") {
          console.log(
            `Order ${event.params.orderId} already cancelled.`
          );
          return;
        }

        if (!Array.isArray(latestOrder.items) || latestOrder.items.length === 0) {
          throw new Error("EMPTY_ORDER: No products were submitted.");
        }

        let calculatedSubtotal = 0;

        for (const item of latestOrder.items) {
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error(`INVALID_QUANTITY:${item.name ?? item.productId}`);
          }

          const productRef = db
            .collection("products")
            .doc(item.productId);

          const productSnap = await transaction.get(productRef);

          if (!productSnap.exists) {
            throw new Error(`${item.name} not found`);
          }

          const product = productSnap.data();

          if (!product) {
            throw new Error(`${item.name} not found`);
          }

          const currentPrice = Number(product.price);
          const submittedPrice = Number(item.unitPrice);
          if (!Number.isFinite(currentPrice) || submittedPrice !== currentPrice) {
            throw new Error(
              `PRICE_CHANGED:${item.name ?? product.name ?? item.productId}:₹${currentPrice}`
            );
          }

          const currentStock = Number(product.stock ?? 0);
          if (currentStock < quantity) {
            throw new Error(`${item.name ?? product.name} is out of stock`);
          }
          if (product.isAvailable === false || product.isActive === false) {
            throw new Error(`${item.name ?? product.name} is currently unavailable`);
          }
          if (product.maxOrderQty != null && quantity > Number(product.maxOrderQty)) {
            throw new Error(`ORDER_LIMIT:${item.name ?? product.name}: maximum ${product.maxOrderQty}`);
          }

          calculatedSubtotal += currentPrice * quantity;
          updates.push({ ref: productRef, newStock: currentStock - quantity });
        }

        const expectedDeliveryCharge = calculatedSubtotal >= 999 ? 0 : 30;
        const expectedGrandTotal = calculatedSubtotal + expectedDeliveryCharge;
        const submittedSubtotal = Number(latestOrder.pricing?.subtotal);
        const submittedDeliveryCharge = Number(latestOrder.pricing?.deliveryCharge);
        const submittedDiscount = Number(latestOrder.pricing?.discount ?? 0);
        const submittedTotal = Number(latestOrder.pricing?.grandTotal);
        const submittedOrderTotal = Number(latestOrder.total);
        if (
          !Number.isFinite(submittedSubtotal) ||
          !Number.isFinite(submittedDeliveryCharge) ||
          !Number.isFinite(submittedDiscount) ||
          !Number.isFinite(submittedTotal) ||
          !Number.isFinite(submittedOrderTotal) ||
          Math.abs(submittedSubtotal - calculatedSubtotal) > 0.01 ||
          Math.abs(submittedDeliveryCharge - expectedDeliveryCharge) > 0.01 ||
          Math.abs(submittedDiscount) > 0.01 ||
          Math.abs(submittedTotal - expectedGrandTotal) > 0.01 ||
          Math.abs(submittedOrderTotal - expectedGrandTotal) > 0.01
        ) {
          throw new Error("ORDER_TOTAL_MISMATCH: Please refresh your cart and try again.");
        }

        for (const update of updates) {
          transaction.update(update.ref, {
            stock: update.newStock,
          });
        }

        transaction.update(orderRef, {
          stockDeducted: true,
          processedAt:admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log(`Processed order ${event.params.orderId}`);
      await sendNotificationToUser(
      order.userId,
      "Order Placed",
      "We've received your order and will start preparing it shortly."
    );

    } catch (err: any) {
      console.error(err);

      await orderRef.update({
        status: "Rejected",
        rejectionReason: err.message,
        "payment.status": "Failed",
      });
    }
  }
);

export const notifyCustomerOrderUpdates = onDocumentUpdated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },
  async (event) => {

    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    if (before.status === after.status) return;

    let title = "";
    let body = "";

    switch (after.status) {

      case "Accepted":
        title = "Order Accepted";
        body = "Your order has been accepted.";
        break;

      case "Packed":
        title = "Order Packed";
        body = "Your order has been packed.";
        break;

      case "Out For Delivery":
        title = "Out for Delivery";
        body = "Your order is on the way.";
        break;

      case "Delivered":
        title = "Delivered";
        body = "Your order has been delivered.";
        break;

      case "Cancelled":
        title = "Order Cancelled";
        body = "Your order has been cancelled.";
        break;

      case "Rejected":
        title = "Order Rejected";
        body = after.rejectionReason ?? "Order rejected.";
        break;

      default:
        return;
    }

    await sendNotificationToUser(
      after.userId,
      title,
      body
    );

  }
);