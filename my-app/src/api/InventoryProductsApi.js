// src/api/InventoryProductsApi.js
// Produktet për InventoryPage: vetëm "ushqime" & "pije"

import { getProducts } from "./productApi.js";

const normalizeList = (data) => data?.items || data || [];

export const getProductsApi = async ({ businessId }) => {
  // Marrim veç e veç, sepse API pranon vetëm 1 categoryType
  const [food, drinks] = await Promise.all([
    getProducts({ businessId, categoryType: "ushqime" }),
    getProducts({ businessId, categoryType: "pije" }),
  ]);

  const foodList = normalizeList(food);
  const drinkList = normalizeList(drinks);

  // Merge pa dublime (by _id)
  const map = new Map();
  [...foodList, ...drinkList].forEach((p) => {
    if (!p?._id) return;
    map.set(String(p._id), p);
  });

  return Array.from(map.values());
};
