import "../../qz-signing";
// src/pages/manager/ProductsPage.jsx
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { FiTrash2, FiChevronRight, FiX, FiEdit2, FiPlus } from "react-icons/fi";
import "./ProductsPage.css";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/productApi.js";
import {
  getSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../../api/subCategoryApi.js";
import { api } from "../../api/http.js";

const pickSubCatName = (sc) => String(sc?.nameSq ?? sc?.name ?? "").trim();

const getImageUrl = (img) => {
  if (!img) return "";
  if (String(img).startsWith("http")) return img;
  return img;
};

const emptyForm = {
  nameSq: "",
  nameEn: "",
  nameIt: "",
  descSq: "",
  descEn: "",
  descIt: "",
  price: "",
  destination: "kuzhine",
};

const emptyCatForm = {
  nameSq: "",
  nameEn: "",
  nameIt: "",
  destination: "kuzhine",
};

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const categoryType = (params.get("type") || "ushqime").toLowerCase();
  const tabLabel = categoryType === "pije" ? "Bar" : "Restorant";

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const [subCats, setSubCats] = useState([]);
  const [subCatsLoading, setSubCatsLoading] = useState(false);
  const [activeChip, setActiveChip] = useState("all");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState(null); // "edit" | "add" | null

  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [existingThumbnail, setExistingThumbnail] = useState("");

  const [showManageCats, setShowManageCats] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [catForm, setCatForm] = useState(emptyCatForm);
  const [editCatId, setEditCatId] = useState(null);

  const activeSubCat = useMemo(
    () => subCats.find((sc) => String(sc._id) === String(activeChip)) || null,
    [subCats, activeChip]
  );

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const clearForm = () => {
    setForm(emptyForm);
    setImage(null);
    setImagePreview("");
    setExistingThumbnail("");
  };

  const uploadImage = async (file) => {
    if (!file) return { imageUrl: "", thumbnailUrl: "" };

    const formData = new FormData();
    formData.append("image", file);

    const res = await api.post("/products/upload-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return {
      imageUrl: res?.data?.imageUrl || "",
      thumbnailUrl: res?.data?.thumbnailUrl || "",
    };
  };

  const reloadSubCats = useCallback(async () => {
    if (!businessId || !categoryType) {
      setSubCats([]);
      return;
    }

    try {
      setSubCatsLoading(true);
      const res = await getSubCategories({ businessId, categoryType });
      const data = res?.data ?? res ?? [];
      setSubCats(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ getSubCategories error:", err?.response?.data || err);
      setSubCats([]);
    } finally {
      setSubCatsLoading(false);
    }
  }, [businessId, categoryType]);

useEffect(() => {
    reloadSubCats();
  }, [reloadSubCats]);

  useEffect(() => {
    if (activeChip === "all" && subCats.length > 0) {
      setActiveChip(subCats[0]._id);
    }
  }, [subCats, activeChip]);

  const openEdit = (p) => {
    setSelectedId(p._id);
    setMode("edit");

    setForm({
      nameSq: (p.nameSq ?? p.name ?? "").toString(),
      nameEn: (p.nameEn ?? "").toString(),
      nameIt: (p.nameIt ?? "").toString(),
      descSq: (p.descSq ?? "").toString(),
      descEn: (p.descEn ?? "").toString(),
      descIt: (p.descIt ?? "").toString(),
      price: p.price ?? "",
      destination: p.destination || "kuzhine",
    });

    setImage(null);
    setImagePreview(getImageUrl(p.image || p.imageUrl || ""));
    setExistingThumbnail(p.thumbnail || "");
  };

  const reloadProducts = useCallback(
    async (keepSelection = true) => {
      if (!businessId || !categoryType) {
        setProducts([]);
        return;
      }

      try {
        setLoading(true);

        const data = await getProducts({ businessId, categoryType });
        const list = Array.isArray(data) ? data : [];

        setProducts(list);

        if (!keepSelection) {
          setSelectedId(null);
          setMode(null);
        }
      } catch (err) {
        console.error("❌ getProducts error:", err?.response?.data || err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [businessId, categoryType]
  );

  useEffect(() => {
    reloadProducts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, categoryType]);

  const openAdd = () => {
    setSelectedId(null);
    setMode("add");
    clearForm();
  };

  const closePanel = () => {
    setSelectedId(null);
    setMode(null);
    clearForm();
  };

  const handleSave = async () => {
    if (!form.nameSq.trim()) return;
    const p = Number(form.price);
    if (!p || p <= 0) return;

    try {
      let imageUrl = imagePreview;
      let thumbnailUrl = existingThumbnail;

      if (image) {
        const uploaded = await uploadImage(image);
        imageUrl = uploaded.imageUrl;
        thumbnailUrl = uploaded.thumbnailUrl;
      }

      const subCatName =
        activeChip !== "all" ? pickSubCatName(activeSubCat) : "";

      const payload = {
        categoryType,
        subCategory: subCatName,
        subCategoryId: activeChip !== "all" ? activeChip : undefined,

        nameSq: form.nameSq.trim(),
        nameEn: form.nameEn.trim(),
        nameIt: form.nameIt.trim(),

        descSq: form.descSq.trim(),
        descEn: form.descEn.trim(),
        descIt: form.descIt.trim(),

        name: form.nameSq.trim(),
        price: Number(form.price),
        destination: form.destination,

        image: imageUrl,
        thumbnail: thumbnailUrl,
      };

      if (mode === "add") {
        await createProduct({ businessId, data: payload });
      } else if (mode === "edit" && selectedId) {
        await updateProduct({ id: selectedId, businessId, data: payload });
      }

      await reloadProducts(mode === "edit");
      if (mode === "add") closePanel();
    } catch (err) {
      console.error("❌ save product:", err?.response?.data || err);
    }
  };

  const removeProduct = async () => {
    if (!selectedId) return;
    const ok = window.confirm("Je i sigurt që do ta fshish këtë produkt?");
    if (!ok) return;

    try {
      await deleteProduct({ id: selectedId, businessId });
      closePanel();
      await reloadProducts(false);
    } catch (err) {
      console.error("❌ deleteProduct:", err?.response?.data || err);
    }
  };

  const filteredProducts = useMemo(() => {
    let list = products;

    if (activeChip !== "all") {
      const name = pickSubCatName(activeSubCat).toLowerCase();
      list = list.filter((p) => {
        const pid = String(p?.subCategoryId?._id || p?.subCategoryId || "");
        if (pid && pid === String(activeChip)) return true;
        const pname = String(
          p?.subCategoryId?.nameSq ?? p?.subCategory ?? ""
        ).toLowerCase();
        return pname === name;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.nameSq || p.name || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, activeChip, activeSubCat, search]);

  const renderCardTitle = (p) => (p.nameSq ?? p.name ?? "").trim() || "Pa emër";

  // ============ MANAGE CATEGORIES ============
  const openAddCat = () => {
    setEditCatId(null);
    setCatForm(emptyCatForm);
    setShowAddCat(true);
  };

  const openEditCat = (sc) => {
    setEditCatId(sc._id);
    setCatForm({
      nameSq: (sc.nameSq ?? sc.name ?? "").toString(),
      nameEn: (sc.nameEn ?? "").toString(),
      nameIt: (sc.nameIt ?? "").toString(),
      destination: sc.destination === "banak" ? "banak" : "kuzhine",
    });
    setShowAddCat(true);
  };

  const saveCat = async () => {
    const sq = catForm.nameSq.trim();
    if (!sq) return;

    try {
      if (editCatId) {
        await updateSubCategory({
          id: editCatId,
          businessId,
          data: {
            nameSq: sq,
            nameEn: catForm.nameEn.trim(),
            nameIt: catForm.nameIt.trim(),
            name: sq,
            destination: catForm.destination,
          },
        });
      } else {
        await createSubCategory({
          businessId,
          categoryType,
          nameSq: sq,
          nameEn: catForm.nameEn.trim(),
          nameIt: catForm.nameIt.trim(),
          destination: catForm.destination,
        });
      }

      setShowAddCat(false);
      setEditCatId(null);
      setCatForm(emptyCatForm);
      await reloadSubCats();
    } catch (err) {
      console.error("❌ save subcategory:", err?.response?.data || err);
    }
  };

  const removeCat = async (sc) => {
    const title = pickSubCatName(sc);
    const ok = window.confirm(`Fshi kategorinë "${title}"?`);
    if (!ok) return;

    try {
      await deleteSubCategory({ id: sc._id, businessId });
      if (String(activeChip) === String(sc._id)) setActiveChip("all");
      await reloadSubCats();
    } catch (err) {
      console.error("❌ deleteSubCategory:", err?.response?.data || err);
    }
  };

  return (
    <div className="prod-page">
      <div className="prod-top">
        <h1 className="prod-title">Produktet</h1>
      </div>

      <div className="prod-chips-row">
        <div className="prod-chips">

          {subCats.map((sc) => (
            <button
              key={sc._id}
              type="button"
              className={String(activeChip) === String(sc._id) ? "chip active" : "chip"}
              onClick={() => setActiveChip(sc._id)}
            >
              {pickSubCatName(sc)}
            </button>
          ))}

          <button
            type="button"
            className="chip chip-add"
            onClick={() => setShowManageCats(true)}
          >
            <FiPlus /> Kategoritë
          </button>
        </div>
      </div>

      <div className="prod-split">
        <div className="prod-list-panel">
          <div className="prod-list-head">
            <h2>Produktet e {tabLabel.toLowerCase()}it</h2>
            <p>Totali: {filteredProducts.length} produkte</p>
          </div>

          <div className="prod-list-toolbar">
            <input
              className="prod-search"
              placeholder="Kërko produktin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button className="prod-add-btn" onClick={openAdd} disabled={subCatsLoading}>
              + Shto produkt
            </button>
          </div>

          <div className="prod-list">
            {loading ? (
              <div className="prod-empty">Duke ngarkuar...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="prod-empty">Nuk ka produkte.</div>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p._id}
                  className={`prod-list-item ${selectedId === p._id ? "active" : ""}`}
                  onClick={() => openEdit(p)}
                  type="button"
                >
                  <div className="prod-list-item-text">
                    <span className="name">{renderCardTitle(p)}</span>
                    <span className="price">
                      {(Number(p.price) || 0).toFixed(2)} ALL
                    </span>
                  </div>
                  <FiChevronRight className="chev" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="prod-detail-panel">
          {!mode ? (
            <div className="prod-detail-empty">
              Zgjidh një produkt nga lista, ose shto një të ri.
            </div>
          ) : (
            <>
              <div className="prod-detail-head">
                <h2>{mode === "add" ? "Shto Produktin" : "Ndrysho Produktin"}</h2>

                <div className="prod-detail-head-actions">
                  {mode === "edit" && (
                    <button className="prod-delete-btn" onClick={removeProduct} type="button">
                      <FiTrash2 /> Fshi produktin
                    </button>
                  )}

                  <button className="prod-close-btn" onClick={closePanel} type="button">
                    <FiX />
                  </button>
                </div>
              </div>

              <div className="prod-detail-form">
                <div className="field">
                  <label>Emri (Shqip)</label>
                  <input
                    value={form.nameSq}
                    onChange={(e) => setField("nameSq", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Emri (English)</label>
                  <input
                    value={form.nameEn}
                    onChange={(e) => setField("nameEn", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Emri (Italiano)</label>
                  <input
                    value={form.nameIt}
                    onChange={(e) => setField("nameIt", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Përshkrimi (Shqip)</label>
                  <input
                    value={form.descSq}
                    onChange={(e) => setField("descSq", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Description (English)</label>
                  <input
                    value={form.descEn}
                    onChange={(e) => setField("descEn", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Descrizione (Italiano)</label>
                  <input
                    value={form.descIt}
                    onChange={(e) => setField("descIt", e.target.value)}
                  />
                </div>

                <div className="field span-price">
                  <label>Çmimi (ALL)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                  />
                </div>

                <div className="field span-dest">
                  <label>Destinacioni</label>
                  <div className="dest-toggle">
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

              {imagePreview && (
                <img src={imagePreview} alt="preview" className="prod-detail-image" />
              )}

              <label className="prod-image-label">
                {imagePreview ? "Ndrysho foto produkti" : "Zgjidh foto produkti"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setImage(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
              </label>

              <div className="prod-detail-actions">
                <button className="btn ghost" onClick={closePanel} type="button">
                  Anulo
                </button>
                <button className="btn primary" onClick={handleSave} type="button">
                  Ruaj ndryshimet
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============ MANAGE CATEGORIES MODAL ============ */}
      {showManageCats && (
        <div className="cat-modal-overlay" onClick={() => setShowManageCats(false)}>
          <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h2>Kategoritë e {tabLabel.toLowerCase()}it</h2>
              <button className="prod-close-btn" onClick={() => setShowManageCats(false)}>
                <FiX />
              </button>
            </div>

            <button className="prod-add-btn cat-add-full" onClick={openAddCat} type="button">
              + Shto kategori
            </button>

            <div className="cat-list">
              {subCats.length === 0 ? (
                <div className="prod-empty">Nuk ka kategori ende.</div>
              ) : (
                subCats.map((sc) => (
                  <div className="cat-row" key={sc._id}>
                    <span className="cat-row-name">{pickSubCatName(sc)}</span>
                    <span className={`cat-row-dest ${sc.destination === "banak" ? "banak" : "kuzhine"}`}>
                      {sc.destination === "banak" ? "Banak" : "Kuzhinë"}
                    </span>

                    <div className="cat-row-actions">
                      <button onClick={() => openEditCat(sc)} type="button">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => removeCat(sc)} type="button" className="del">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ ADD/EDIT CATEGORY MODAL ============ */}
      {showAddCat && (
        <div className="cat-modal-overlay" onClick={() => setShowAddCat(false)}>
          <div className="cat-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h2>{editCatId ? "Ndrysho kategorinë" : "Shto kategori"}</h2>
              <button className="prod-close-btn" onClick={() => setShowAddCat(false)}>
                <FiX />
              </button>
            </div>

            <div className="field">
              <label>Emri (Shqip)</label>
              <input
                value={catForm.nameSq}
                onChange={(e) => setCatForm((p) => ({ ...p, nameSq: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Name (English)</label>
              <input
                value={catForm.nameEn}
                onChange={(e) => setCatForm((p) => ({ ...p, nameEn: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Nome (Italiano)</label>
              <input
                value={catForm.nameIt}
                onChange={(e) => setCatForm((p) => ({ ...p, nameIt: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Destinacioni</label>
              <div className="dest-toggle">
                <button
                  type="button"
                  className={catForm.destination === "kuzhine" ? "active" : ""}
                  onClick={() => setCatForm((p) => ({ ...p, destination: "kuzhine" }))}
                >
                  Kuzhinë
                </button>
                <button
                  type="button"
                  className={catForm.destination === "banak" ? "active" : ""}
                  onClick={() => setCatForm((p) => ({ ...p, destination: "banak" }))}
                >
                  Banak
                </button>
              </div>
            </div>

            <div className="prod-detail-actions">
              <button className="btn ghost" onClick={() => setShowAddCat(false)} type="button">
                Anulo
              </button>
              <button className="btn primary" onClick={saveCat} type="button">
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}