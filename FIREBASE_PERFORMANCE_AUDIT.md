# Poruthur Stores / BonMart – Firebase performance audit

## Scope inspected

- Expo Router app using React Native Firebase (`@react-native-firebase/*`)
- Firestore product, category, address, user, settings and order access
- Product cards, category cards, product detail, cart and checkout image rendering
- Cloud Functions that process orders, restore stock and send notifications

## Changes included in this optimization pass

1. Added a shared in-memory product/category cache in `services/products.ts`.
   - 5-minute TTL.
   - Deduplicates concurrent product/category fetches.
   - Reuses a product already present in the catalogue cache for product detail.
   - Exposes explicit cache invalidation functions for future admin/catalogue refresh flows.
2. Home now fetches products once per focus and rebuilds category sections locally. Navigating back to Home reuses the cache until its TTL expires.
3. Home and section screens use the shared category/product services instead of independent collection subscriptions/queries.
4. Section no longer subscribes to the entire products collection and separately downloads the same catalogue again to calculate its sidebar.
5. Search uses the shared product service rather than issuing its own product collection query.
6. Product/category/cart/checkout image rendering now uses the already-installed `expo-image` package with `memory-disk` caching and short transitions.

## Findings still requiring a separate implementation pass

### High priority

- `app/_layout.tsx`: the profile/onboarding effect depends on `segments`; it reads the user document and queries addresses whenever navigation segments change. Cache the onboarding result per authenticated user and invalidate it after profile/address mutations.
- Checkout currently trusts client-supplied product prices and totals when creating an order. The order-processing Cloud Function validates stock but does not recalculate authoritative prices. Move price/discount/delivery calculation to a trusted backend before production use.
- Product catalogue cache is intentionally time-limited. Do not use cached stock or prices as the final authority for order acceptance.

### Medium priority

- `app/(tabs)/orders.tsx`: orders listener has no `limit()` or pagination. Add cursor pagination for older history while keeping a small recent-orders listener if real-time status is required.
- `app/(tabs)/profile.tsx`: user profile uses a real-time listener although most profile fields change infrequently. Consider a one-time fetch or a shared user cache, refreshing after profile edits.
- `app/checkout.tsx`: addresses and payment QR are fetched on every focus. Share/cache these values with a short TTL; still revalidate delivery rules at order placement.
- `app/address.tsx`: setting a default address queries all addresses and writes `isDefault: false` to every document, even those already false. Write only documents whose value changes and the selected address.
- `services/notification.ts`: `initializeNotifications()` registers token-refresh and foreground-message listeners but does not retain/unsubscribe their handlers. Make initialization idempotent to prevent duplicate handlers if invoked more than once.
- `app/(tabs)/home.tsx`: address and delivery-settings listeners are reasonable if instant updates are required; otherwise consider one-time reads with refresh on focus. Keep the delivery validation at checkout authoritative.

## Firestore persistence note

The app uses React Native Firebase's native Firestore SDK. On Android/iOS, the native SDK's offline persistence is enabled by default unless explicitly disabled elsewhere. It is separate from the JavaScript in-memory cache added here. The in-memory catalogue cache is cleared when the app process ends; the native Firestore cache can persist across launches and is managed by the SDK.

## Cost interpretation

- A collection `get()` costs reads for the documents returned.
- A listener incurs initial reads and additional reads when matching documents change; leaving a listener active also maintains a connection.
- Writes in the order-processing Cloud Function (order status/stock) are business-critical and should not be removed merely to reduce usage.
- The cache reduces duplicate client catalogue/category fetches across screens; it does not change the necessary stock-validation and order writes.

## Validation still required on a development build

- Run `npx tsc --noEmit` and `npx expo lint` after installing dependencies.
- Test online first load, navigation between Home/Section/Search/Product Detail, offline launch, and returning to Home after the 5-minute TTL.
- Verify product/category changes become visible after cache expiry or an explicit `forceRefresh` call.
- Confirm images render correctly on Android and iOS and are reused after navigating away/back and after app restart.
- Compare Firestore Usage before/after under the same scripted navigation path.
