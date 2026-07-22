import "../../qz-signing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  UtensilsCrossed,
  Beer,
  Search,
  Plus,
  X,
  Trash2,
  ImagePlus,
  ChevronRight,
} from "lucide-react";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/productApi.js";
import { getSubCategories } from "../../api/subCategoryApi.js";
import { api } from "../../api/http.js";
import "./ProductsMobilePage.css";

const emptyForm = {
  nameSq: "",
  price: "",
  descSq: "",
  destination: "kuzhine",
  subCategoryId: "",
};

const pickSubCatName = (sc) =>
  (sc?.nameSq || sc?.name || sc?.nameEn || "").toString().trim() || "Pa emër";

const pickProductName = (p) =>
  (p?.nameSq || p?.name || p?.nameEn || "").toString().trim() || "Pa emër";

const thumbOf = (p) =>
  p?.thumbnail || p?.thumbnailUrl || p?.imageUrl || p?.image || "";

export default function ProductsMobilePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlType = String(searchParams.get("type") || "").toLowerCase();
  const [type, setType] = useState(urlType === "pije" ? "pije" : "ushqime");

  const [subCats, setSubCats] = useState([]);
  const [activeChip, setActiveChip] = useState("all");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // sheet edit/add
  const [sheetMode, setSheetMode] = useState(null); // "add" | "edit" | null
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---------- data ---------- */

  const loadAll = useCallback(async () => {
    if (!businessId) {
      setError("Mungon businessId. Hyni si menaxher.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [scRes, prodRes] = await Promise.all([
        getSubCategories({ businessId, categoryType: type }),
        getProducts({ businessId, categoryType: type }),
      ]);

      setSubCats(Array.isArray(scRes) ? scRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim rrjeti.");
      setSubCats([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, type]);

  useEffect(() => {
    setActiveChip("all");
    setSearch("");
    loadAll();
  }, [loadAll]);

  const pickType = (t) => {
    setType(t);
    setSearchParams({ type: t }, { replace: true });
  };

  const visible = useMemo(() => {
    let list = products;

    if (activeChip !== "all") {
      list = list.filter(
        (p) =>
          String(p.subCategoryId || p.subCategory?._id || "") ===
          String(activeChip)
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        pickProductName(p).toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, activeChip, search]);

  /* ---------- sheet ---------- */

  const openAdd = () => {
    setForm({
      ...emptyForm,
      destination: type === "pije" ? "banak" : "kuzhine",
      subCategoryId: activeChip !== "all" ? String(activeChip) : "",
    });
    setImageFile(null);
    setImagePreview("");
    setEditId(null);
    setError("");
    setSheetMode("add");
  };

  const openEdit = (p) => {
    setForm({
      nameSq: pickProductName(p),
      price: String(p.price ?? ""),
      descSq: (p.descSq ?? p.desc ?? "").toString(),
      destination: p.destination === "banak" ? "banak" : "kuzhine",
      subCategoryId: String(p.subCategoryId || p.subCategory?._id || ""),
    });
    setImageFile(null);
    setImagePreview(thumbOf(p));
    setEditId(p._id);
    setError("");
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setEditId(null);
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("businessId", businessId);

    const res = await api.post("/products/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  };

  const saveProduct = async () => {
    const name = form.nameSq.trim();
    const price = Number(form.price);

    if (!name) {
      setError("Vendos emrin e produktit.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Vendos një çmim të vlefshëm.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      let imageUrl;
      let thumbnailUrl;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        imageUrl = uploaded.imageUrl;
        thumbnailUrl = uploaded.thumbnailUrl;
      }

      const data = {
        nameSq: name,
        price,
        descSq: form.descSq.trim(),
        categoryType: type,
        destination: form.destination,
        subCategoryId: form.subCategoryId || undefined,
        ...(imageUrl ? { image: imageUrl, imageUrl } : {}),
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      };

      if (sheetMode === "edit" && editId) {
        await updateProduct({ id: editId, businessId, data });
      } else {
        await createProduct({ businessId, data });
      }

      closeSheet();
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim.");
    } finally {
      setBusy(false);
    }
  };

  const removeProduct = async () => {
    if (!editId) return;

    const ok = window.confirm("Fshi këtë produkt?");
    if (!ok) return;

    setBusy(true);

    try {
      await deleteProduct({ id: editId, businessId });
      closeSheet();
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Gabim.");
    } finally {
      setBusy(false);
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="prm-page">
      {/* HERO */}
      <section className="prm-hero">
        <h1>Produktet</h1>

        <div className="prm-segment">
          <button
            type="button"
            className={type === "ushqime" ? "active" : ""}
            onClick={() => pickType("ushqime")}
          >
            <UtensilsCrossed size={16} strokeWidth={2.4} />
            Restoranti
          </button>

          <button
            type="button"
            className={type === "pije" ? "active" : ""}
            onClick={() => pickType("pije")}
          >
            <Beer size={16} strokeWidth={2.4} />
            Bari
          </button>
        </div>
      </section>

      <div className="prm-body">
        {/* KËRKIMI */}
        <div className="prm-search">
          <Search size={16} strokeWidth={2.4} />
          <input
            type="search"
            placeholder="Kërko produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* CHIPS nënkategorish */}
        <div className="prm-chips">
          <button
            type="button"
            className={activeChip === "all" ? "active" : ""}
            onClick={() => setActiveChip("all")}
          >
            Të gjitha
          </button>

          {subCats.map((sc) => (
            <button
              key={sc._id}
              type="button"
              className={
                String(activeChip) === String(sc._id) ? "active" : ""
              }
              onClick={() => setActiveChip(sc._id)}
            >
              {pickSubCatName(sc)}
            </button>
          ))}
        </div>

        {error && !sheetMode && <div className="prm-error">{error}</div>}

        {/* LISTA */}
        {loading ? (
          <div className="prm-empty">Duke ngarkuar…</div>
        ) : visible.length === 0 ? (
          <div className="prm-empty">
            {search
              ? `S'u gjet asnjë për "${search}".`
              : "Nuk ka produkte këtu. Shto të parin me butonin +."}
          </div>
        ) : (
          <ul className="prm-list">
            {visible.map((p) => {
              const thumb = thumbOf(p);

              return (
                <li key={p._id}>
                  <button
                    type="button"
                    className="prm-item"
                    onClick={() => openEdit(p)}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="prm-item-img" />
                    ) : (
                      <span className="prm-item-img prm-item-noimg">
                        {pickProductName(p).charAt(0).toUpperCase()}
                      </span>
                    )}

                    <span className="prm-item-text">
                      <strong>{pickProductName(p)}</strong>
                      <em>
                        {p.destination === "banak" ? "Banak" : "Kuzhinë"}
                      </em>
                    </span>

                    <span className="prm-item-price">
                      {Number(p.price || 0).toLocaleString("sq-AL")}{" "}
                      <i>ALL</i>
                    </span>

                    <ChevronRight
                      size={16}
                      strokeWidth={2.4}
                      className="prm-item-arrow"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* BUTONI + */}
      <button
        type="button"
        className="prm-add"
        onClick={openAdd}
        aria-label="Shto produkt"
      >
        <Plus size={24} strokeWidth={2.6} />
      </button>

      {/* SHEET: ADD / EDIT */}
      {sheetMode && (
        <>
          <div className="prm-overlay" onClick={closeSheet} />

          <div className="prm-sheet">
            <div className="prm-sheet-grip" />

            <div className="prm-sheet-head">
              <h3>
                {sheetMode === "edit" ? "Ndrysho produktin" : "Produkt i ri"}
              </h3>

              <button type="button" className="prm-close" onClick={closeSheet}>
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* FOTO */}
            <label className="prm-photo">
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <span className="prm-photo-empty">
                  <ImagePlus size={22} strokeWidth={2} />
                  Shto foto
                </span>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={onPickImage}
                hidden
              />
            </label>

            <div className="prm-field">
              <label>Emri</label>
              <input
                type="text"
                value={form.nameSq}
                onChange={(e) => setField("nameSq", e.target.value)}
                placeholder="p.sh. Makarona me gjalp"
              />
            </div>

            <div className="prm-row">
              <div className="prm-field">
                <label>Çmimi (ALL)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="prm-field">
                <label>Destinacioni</label>
                <div className="prm-dest">
                  <button
                    type="button"
                    className={form.destination === "kuzhine" ? "active" : ""}
                    onClick={() => setField("destination", "kuzhine")}
                  >
                    Kuzhinë
                  </button>
                  <button
                    type="button"
                    className={form.destination === "banak" ? "active" : ""}
                    onClick={() => setField("destination", "banak")}
                  >
                    Banak
                  </button>
                </div>
              </div>
            </div>

            <div className="prm-field">
              <label>Kategoria</label>
              <select
                value={form.subCategoryId}
                onChange={(e) => setField("subCategoryId", e.target.value)}
              >
                <option value="">— Pa kategori —</option>
                {subCats.map((sc) => (
                  <option key={sc._id} value={sc._id}>
                    {pickSubCatName(sc)}
                  </option>
                ))}
              </select>
            </div>

            <div className="prm-field">
              <label>Përshkrimi (opsional)</label>
              <textarea
                rows={2}
                value={form.descSq}
                onChange={(e) => setField("descSq", e.target.value)}
                placeholder="p.sh. pasta shtëpie me gjalp dhe mocarela"
              />
            </div>

            {error && <div className="prm-error">{error}</div>}

            <button
              type="button"
              className="prm-save"
              onClick={saveProduct}
              disabled={busy}
            >
              {busy
                ? "Duke ruajtur…"
                : sheetMode === "edit"
                ? "Ruaj ndryshimet"
                : "Shto produktin"}
            </button>

            {sheetMode === "edit" && (
              <button
                type="button"
                className="prm-delete"
                onClick={removeProduct}
                disabled={busy}
              >
                <Trash2 size={16} strokeWidth={2.3} />
                Fshi produktin
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}