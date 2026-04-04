// src/api/subCategoryApi.js
import { api } from "./http.js";

const norm = (v) => String(v ?? "").trim();

/* =========================
   SUBCATEGORIES
========================= */

export const getSubCategories = async ({ businessId, categoryType }) => {
  const bid = norm(businessId);
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.get("/subcategories", {
    params: { businessId: bid, categoryType },
  });

  return res.data;
};

export const createSubCategory = async ({
  businessId,
  categoryType,

  // multi
  nameSq,
  nameEn,
  nameIt,

  // fallback
  name,

  // destination
  destination,
}) => {
  const bid = norm(businessId);
  const ct = norm(categoryType);

  const sq = norm(nameSq || name);
  if (!bid) throw new Error("Mungon businessId.");
  if (!ct) throw new Error("Mungon categoryType.");
  if (!sq) throw new Error("Mungon emri (Shqip).");

  const res = await api.post("/subcategories", {
    businessId: bid,
    categoryType: ct,

    nameSq: sq,
    nameEn: norm(nameEn),
    nameIt: norm(nameIt),
    name: sq, // fallback

    destination: norm(destination) || "kuzhine",
  });

  return res.data;
};

export const updateSubCategory = async ({ id, businessId, data }) => {
  if (!id) throw new Error("Missing subCategory id");
  const bid = norm(businessId);
  if (!bid) throw new Error("Missing businessId");

  // normalize pak edhe këtu
  const payload = {
    ...data,
    nameSq: data?.nameSq ? norm(data.nameSq) : data?.nameSq,
    nameEn: data?.nameEn !== undefined ? norm(data.nameEn) : data?.nameEn,
    nameIt: data?.nameIt !== undefined ? norm(data.nameIt) : data?.nameIt,
    name: data?.name ? norm(data.name) : data?.name,
    destination:
      data?.destination !== undefined ? norm(data.destination) : data?.destination,
  };

  const res = await api.patch(`/subcategories/${id}`, payload, {
    params: { businessId: bid },
  });

  return res.data;
};

export const deleteSubCategory = async ({ id, businessId }) => {
  if (!id) throw new Error("Mungon id.");
  const bid = norm(businessId);
  if (!bid) throw new Error("Mungon businessId.");

  const res = await api.delete(`/subcategories/${id}`, {
    params: { businessId: bid },
  });

  return res.data;
};
