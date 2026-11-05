import { db } from "../firebase/config";

type ProductRecord = { id: string; [key: string]: any };
type CategoryRecord = { id: string; [key: string]: any };

// Shared in-memory cache: screens reuse the same catalogue instead of each
// issuing their own collection query. Firestore's native SDK also persists
// its own offline cache on Android/iOS.
const CACHE_TTL_MS = 5 * 60 * 1000;

let productsCache: ProductRecord[] | null = null;
let productsCachedAt = 0;
let productsRequest: Promise<ProductRecord[]> | null = null;
let productsListenerUnsubscribe: (() => void) | null = null;
const productSubscribers = new Set<{
  onData: (products: ProductRecord[]) => void;
  onError?: (error: any) => void;
}>();

let categoriesCache: CategoryRecord[] | null = null;
let categoriesCachedAt = 0;
let categoriesRequest: Promise<CategoryRecord[]> | null = null;

const isFresh = (cachedAt: number) => Date.now() - cachedAt < CACHE_TTL_MS;

/**
 * Multiplex one Firestore catalogue listener across all app consumers.
 * Screen subscriptions receive the same updates without opening duplicate
 * collection listeners.
 */
export const subscribeToProducts = (
  onData: (products: ProductRecord[]) => void,
  onError?: (error: any) => void
): (() => void) => {
  const subscriber = { onData, onError };
  productSubscribers.add(subscriber);

  if (productsCache) onData(productsCache);

  if (!productsListenerUnsubscribe) {
    productsListenerUnsubscribe = db.collection("products").onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ProductRecord[];
        productsCache = data;
        productsCachedAt = Date.now();
        productSubscribers.forEach((current) => current.onData(data));
      },
      (error) => {
        productSubscribers.forEach((current) => current.onError?.(error));
      }
    );
  }

  return () => {
    productSubscribers.delete(subscriber);
    if (productSubscribers.size === 0 && productsListenerUnsubscribe) {
      productsListenerUnsubscribe();
      productsListenerUnsubscribe = null;
    }
  };
};

export const getProducts = async (
  options: { forceRefresh?: boolean } = {}
): Promise<ProductRecord[]> => {
  if (!options.forceRefresh && productsCache && (productsListenerUnsubscribe || isFresh(productsCachedAt))) {
    return productsCache;
  }

  if (productsRequest) return productsRequest;

  productsRequest = (async () => {
    const snapshot = await db.collection("products").get();
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductRecord[];

    productsCache = data;
    productsCachedAt = Date.now();
    return data;
  })();

  try {
    return await productsRequest;
  } finally {
    productsRequest = null;
  }
};

export const getCategories = async (
  options: { forceRefresh?: boolean } = {}
): Promise<CategoryRecord[]> => {
  if (!options.forceRefresh && categoriesCache && isFresh(categoriesCachedAt)) {
    return categoriesCache;
  }

  if (categoriesRequest) return categoriesRequest;

  categoriesRequest = (async () => {
    const snapshot = await db.collection("categories").orderBy("position").get();
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CategoryRecord[];

    categoriesCache = data;
    categoriesCachedAt = Date.now();
    return data;
  })();

  try {
    return await categoriesRequest;
  } finally {
    categoriesRequest = null;
  }
};

export const getProductById = async (id: string) => {
  // Reuse the catalogue document when it is already in the shared cache.
  if (productsCache && (productsListenerUnsubscribe || isFresh(productsCachedAt))) {
    const cachedProduct = productsCache.find((product) => product.id === id);
    if (cachedProduct) return cachedProduct;
  }

  const productSnap = await db.collection("products").doc(id).get();
  if (!productSnap.exists()) return null;

  const product = {
    id: productSnap.id,
    ...productSnap.data(),
  } as ProductRecord;

  if (productsCache) {
    productsCache = [
      ...productsCache.filter((item) => item.id !== id),
      product,
    ];
  }

  return product;
};

export const invalidateProductCache = () => {
  productsCache = null;
  productsCachedAt = 0;
};

export const invalidateCategoryCache = () => {
  categoriesCache = null;
  categoriesCachedAt = 0;
};
