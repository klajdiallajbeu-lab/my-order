// src/api/productApi.js
import { api } from "./http.js";

// getProducts({ businessId, categoryType, subCategory })
export const getProducts = async ({ businessId, categoryType, subCategory }) => {
  const bid = (businessId || "").trim();

  if (!bid || bid === "undefined" || bid === "null") {
    throw new Error("Mungon businessId. Dil dhe hyr sërish.");
  }

  const params = { businessId: bid };
  if (categoryType) params.categoryType = categoryType;
  if (subCategory) params.subCategory = subCategory;

  const res = await api.get("/products", { params });
  return res.data;
};

export const createProduct = async ({ businessId, data }) => {
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");

  const body = { ...data, businessId: bid };
  const res = await api.post("/products", body);
  return res.data;
};

// ✅ UPDATE (query businessId)
export const updateProduct = async ({ id, businessId, data }) => {
  if (!id) throw new Error("Mungon id.");
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.put(`/products/${id}`, data, {
    params: { businessId: bid },
  });

  return res.data;
};

// ✅ DELETE (query businessId)
export const deleteProduct = async ({ id, businessId }) => {
  if (!id) throw new Error("Mungon id.");
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.delete(`/products/${id}`, {
    params: { businessId: bid },
  });
  return res.data;
};

// ✅ Fshi category nga produktet (soft delete)
export const deleteCategoryFromProducts = async ({ businessId, categoryType }) => {
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");
  if (!categoryType) throw new Error("Mungon categoryType.");

  const res = await api.delete("/products/category", {
    params: { businessId: bid, categoryType },
  });
  return res.data;
};

// ✅ Fshi subCategory nga produktet (soft delete)
export const deleteSubCategoryFromProducts = async ({
  businessId,
  categoryType,
  subCategory,
}) => {
  const bid = (businessId || "").trim();
  if (!bid) throw new Error("Mungon businessId.");
  if (!categoryType) throw new Error("Mungon categoryType.");
  if (!subCategory) throw new Error("Mungon subCategory.");

  const res = await api.delete("/products/subcategory", {
    params: { businessId: bid, categoryType, subCategory },
  });
  return res.data;
};
