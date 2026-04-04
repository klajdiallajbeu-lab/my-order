import { api } from "./http.js";

/* =======================
   HELPERS
======================= */
const getBusinessId = () => {
  const businessId = (localStorage.getItem("businessId") || "").trim();
  if (!businessId || businessId === "undefined" || businessId === "null") {
    throw new Error("Mungon businessId. Dil dhe hyr sërish.");
  }
  return businessId;
};

const toYMD = (d) => {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d).trim();
  return s || undefined;
};

/* =======================
   GET INVENTORY SUMMARY
======================= */
export const getInventorySummary = async ({ from, to } = {}) => {
  const businessId = getBusinessId();

  const params = { businessId };
  const f = toYMD(from);
  const t = toYMD(to);
  if (f) params.from = f;
  if (t) params.to = t;

  const res = await api.get("/inventory/summary", { params });
  return res.data;
};

/* =======================
   ADD SUPPLY
   - unitPrice = kosto furnizimi
   - newPrice = çmimi i ri i produktit (shitje) (opsional)
======================= */
export const addSupplyApi = async ({
  productId,
  qty,
  unitPrice = 0,
  newPrice,
  note = "",
}) => {
  const businessId = getBusinessId();

  const pid = String(productId || "").trim();
  if (!pid) throw new Error("Mungon productId.");

  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) throw new Error("Sasia duhet të jetë numër > 0.");

  const up = Number(unitPrice);
  const safeUnitPrice = Number.isFinite(up) && up >= 0 ? up : 0;

  const np =
    newPrice === "" || newPrice == null ? undefined : Number(newPrice);

  const body = {
    businessId,
    productId: pid,
    qty: q,
    unitPrice: safeUnitPrice,
    newPrice: Number.isFinite(np) && np >= 0 ? np : undefined,
    note: String(note || ""),
  };

  const res = await api.post("/inventory/supply", body);
  return res.data;
};
