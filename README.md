# BonMart Phase 2A — Live Product & Cart Price Synchronization

This is a focused source patch for the existing working BonMart project. It does not change `package.json`, `app.json`, native Android files, Firebase config, or image caching.

## Files to copy into the existing project

Copy the folders/files in this patch into the matching locations in your project, allowing them to replace the existing files:

- `services/products.ts`
- `context/CartContext.tsx`
- `app/(tabs)/home.tsx`
- `app/section/[name].tsx`
- `app/search.tsx`
- `app/product/[id].tsx`
- `app/checkout.tsx`
- `functions/src/index.ts`


## What changes

1. A single shared Firestore `products` collection listener is multiplexed across the app. `CartProvider` keeps it active during an authenticated session; screens subscribe to the shared stream rather than opening their own collection listeners.
2. Home, category/section, search and product-detail views receive product changes while open.
3. Existing cart lines receive updated name, price, image, stock, order limit and availability when a product changes.
4. Adding/increasing unavailable or out-of-stock products is blocked.
5. Checkout performs a fresh read of each product in the cart before creating an order. If the price changed, it updates the cart and asks the customer to review the new total before trying again. If stock/availability/quantity limits changed, checkout stops.
6. `processNewOrder` revalidates each product's current price, stock, availability, quantity limit and the submitted subtotal/total inside the existing Firestore transaction before deducting stock. A stale/altered price therefore cannot pass the stock-deduction transaction.

## Apply and test

1. Keep a backup/commit of the current working project.
2. Copy the files above into the matching paths.
3. From the project root run `npx tsc --noEmit`.
4. Run the Android development client with `npx expo start --dev-client` and test the JS changes. No native dependency was added by this patch.
5. From the project root deploy the updated order trigger when ready: `firebase deploy --only functions:processNewOrder`.
   - Confirm the Firebase CLI is targeting the correct project first (`firebase use` / `firebase projects:list`).
   - The Firebase config's predeploy step builds the Functions code.
   - Do not test price-protection as production-secure until this function update has deployed successfully.

## Manual QA

- Keep the customer app open on Home. Change a product's price in the admin app. Confirm the product card updates without restarting the customer app.
- Open Product Details and Cart. Confirm the new price appears there too and cart subtotal/total recalculate.
- Change the price while the item is already in the cart, then open Checkout. Checkout should refresh the cart price and stop the first attempt with a price-change message. Review the new total and try again.
- Reduce stock below the cart quantity or mark the product unavailable. Checkout should stop and identify the affected product.
- After deploying the Cloud Function, submit a test order with current prices. Then test a deliberately stale/altered order only in a staging project. The function should reject it without deducting stock.

## Read/cost notes

- One active `onSnapshot` listener is shared per running app process/authenticated session, not one listener per screen.
- The listener's initial snapshot reads the product documents; changed documents are delivered as updates. A reconnect can cause Firestore to re-read documents according to SDK/cache behavior.
- Checkout intentionally performs one read per cart product for a final client-side freshness check. This is a safety trade-off at order time.
- The existing Cloud Function transaction reads each product again while checking stock and price. This is necessary server-side validation; do not remove it merely to lower read counts.
- Product descriptions/images remain cached; price/stock are live while the authenticated app session is connected. When offline, the app cannot know an admin's latest changes until connectivity returns. The server-side order validation is the final guard.

## Validation status

The modified TypeScript/TSX files passed a syntax-transpilation check. A full Expo TypeScript check, Functions type-check/build, Android device test, and Cloud Function deployment must still be run in your project environment; dependencies and your Firebase credentials are not included in this patch.
