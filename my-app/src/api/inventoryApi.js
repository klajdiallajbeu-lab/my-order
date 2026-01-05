// src/api/inventoryApi.js
import { api } from "./http.js";

// helper që shton businessId automatikisht
const withBusinessId = (extraParams = {}) => {
  const businessId = (localStorage.getItem("businessId") || "").trim();
  if (!businessId) throw new Error("Mungon businessId. Hyr sërish.");
  return { businessId, ...extraParams };
};

// 📦 Inventari – përmbledhje sipas periudhës
// GET /api/inventory/summary?businessId=...&from=...&to=...
export const getInventorySummary = async (from, to) => {
  const params = withBusinessId({ from, to });
  const res = await api.get("/inventory/summary", { params });
  return res.data;
};

// ➕ Shto furnizim të ri në inventar
// POST /api/inventory/supply { businessId, productName, qty, unitPrice, note }
export const addSupplyApi = async ({ productName, qty, unitPrice, note }) => {
  const body = withBusinessId({
    productName,
    qty,
    unitPrice,
    note,
  });

  const res = await api.post("/inventory/supply", body);
  return res.data;
};
s