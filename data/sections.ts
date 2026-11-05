import { products } from "./products";

export const sections = [
  {
    title: "Groceries",
    data: products.filter(
      (item) => item.category === "Groceries"
    ),
  },

  {
    title: "Snacks",
    data: products.filter(
      (item) => item.category === "Snacks"
    ),
  },

  {
    title: "Palacharakk",
    data: products.filter(
      (item) => item.category === "Palacharakk"
    ),
  },
];