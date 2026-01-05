// src/api/subCategoryApi.js
import { api } from "./http.js";

/* =========================
   SUBCATEGORIES
========================= */

export const getSubCategories = async ({ businessId, categoryType }) => {
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.get("/subcategories", {
    params: { businessId: bid, categoryType },
  });

  return res.data;
};

export const createSubCategory = async ({ businessId, categoryType, name }) => {
  const bid = (businessId || "").trim();
  const cname = (name || "").trim();

  if (!bid) throw new Error("Mungon businessId.");
  if (!categoryType) throw new Error("Mungon categoryType.");
  if (!cname) throw new Error("Mungon emri i subCategory.");

  const res = await api.post("/subcategories", {
    businessId: bid,
    categoryType,
    name: cname,
  });

  return res.data;
};

export const deleteSubCategory = async ({ id, businessId }) => {
  if (!id) throw new Error("Mungon id.");
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.delete(`/subcategories/${id}`, {
    params: { businessId: bid },
  });

  return res.data;
};
// UPDATE SUB CATEGORY
export const updateSubCategory = async ({ id, businessId, data }) => {
  if (!id) throw new Error("Missing subCategory id");
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Missing businessId");

  const res = await api.patch(`/subcategories/${id}`, data, {
    params: { businessId: bid },
  });

  return res.data;
};


