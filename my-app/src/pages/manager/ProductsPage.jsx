// src/pages/manager/ProductsPage.jsx
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import "./ProductsPage.css";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/productApi.js";

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v || "");
  } catch {
    return v || "";
  }
};

export default function ProductsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const categoryTypeRaw = params.get("type") || "";
  const subCategoryRaw = params.get("cat") || "";

  const categoryType = useMemo(
    () => safeDecode(categoryTypeRaw).trim().toLowerCase(),
    [categoryTypeRaw]
  );

  const subCategory = useMemo(
    () => safeDecode(subCategoryRaw).trim(),
    [subCategoryRaw]
  );

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const isNumberOnly =
    categoryType &&
    subCategory &&
    (categoryType === "cadra" || categoryType === "dhoma") &&
    subCategory.toLowerCase() === "numrat";

  if (!categoryType || !subCategory) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 18 }}>
        ❌ <b>Gabim:</b> Nuk u gjet nën-kategoria.
      </div>
    );
  }

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // ---------- ADD MODAL ----------
  const [showAdd, setShowAdd] = useState(false);
  const [addPrice, setAddPrice] = useState("");
  const [addNameSq, setAddNameSq] = useState("");
  const [addNameEn, setAddNameEn] = useState("");
  const [addNameIt, setAddNameIt] = useState("");
  const [addDescSq, setAddDescSq] = useState("");
  const [addDescEn, setAddDescEn] = useState("");
  const [addDescIt, setAddDescIt] = useState("");
  const [addDepartment, setAddDepartment] = useState("kuzhine");



  // ---------- EDIT MODAL ----------
  const [editId, setEditId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editPrice, setEditPrice] = useState("");
  const [editNameSq, setEditNameSq] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameIt, setEditNameIt] = useState("");
  const [editDescSq, setEditDescSq] = useState("");
  const [editDescEn, setEditDescEn] = useState("");
  const [editDescIt, setEditDescIt] = useState("");
  const [editDepartment, setEditDepartment] = useState("kuzhine");

  const resetAddForm = () => {
    setAddPrice("");
    setAddNameSq("");
    setAddNameEn("");
    setAddNameIt("");
    setAddDescSq("");
    setAddDescEn("");
    setAddDescIt("");
  };

  const closeAdd = () => {
    setShowAdd(false);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditId(null);
  };

  // ====== LOAD PRODUCTS ======
  const reloadProducts = useCallback(async () => {
    if (!businessId) {
      setProducts([]);
      return;
    }

    try {
      setLoading(true);
      const data = await getProducts({ businessId, categoryType, subCategory });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ getProducts error:", err?.response?.data || err);
      setProducts([]);
      alert(
        err?.response?.data?.message ||
          "Nuk po arrij të marr produktet nga serveri."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, categoryType, subCategory]);

  useEffect(() => {
    reloadProducts();
  }, [reloadProducts]);

  // ====== ADD PRODUCT (MODAL) ======
  const handleAdd = async () => {
    if (isNumberOnly) {
      if (!addNameSq.trim()) return alert("Shkruaj numrin!");
    } else {
      if (!addNameSq.trim()) return alert("Emri (Shqip) është i detyrueshëm!");
      const p = Number(addPrice);
      if (!p || p <= 0) return alert("Vendos çmim të vlefshëm!");
    }

    try {
      await createProduct({
        businessId,
        data: {
          categoryType,
          subCategory,

          nameSq: addNameSq.trim(),
          nameEn: addNameEn.trim(),
          nameIt: addNameIt.trim(),

          descSq: addDescSq.trim(),
          descEn: addDescEn.trim(),
          descIt: addDescIt.trim(),

          // fallback
          name: addNameSq.trim(),

          price: isNumberOnly ? null : Number(addPrice),
        },
      });

      closeAdd();
      resetAddForm();
      await reloadProducts();
    } catch (err) {
      console.error("❌ createProduct:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Gabim gjatë shtimit të produktit.");
    }
  };

  // ====== OPEN EDIT ======
  const openEdit = (p) => {
    setEditId(p._id);

    setEditNameSq((p.nameSq ?? p.name ?? "").toString());
    setEditNameEn((p.nameEn ?? "").toString());
    setEditNameIt((p.nameIt ?? "").toString());

    setEditDescSq((p.descSq ?? "").toString());
    setEditDescEn((p.descEn ?? "").toString());
    setEditDescIt((p.descIt ?? "").toString());

    setEditPrice(p.price ?? "");
    setShowEdit(true);
    setEditDepartment(p.destination || "kuzhine");

  };

  // ====== SAVE EDIT ======
  const handleSaveEdit = async () => {
    if (!editId) return;

    if (isNumberOnly) {
      if (!editNameSq.trim()) return alert("Numri nuk mund të jetë bosh.");
    } else {
      if (!editNameSq.trim()) return alert("Emri (Shqip) është i detyrueshëm!");
      const p = Number(editPrice);
      if (!p || p <= 0) return alert("Vendos çmim të vlefshëm!");
    }

    try {
      await updateProduct({
        id: editId,
        businessId,
        data: {
          nameSq: editNameSq.trim(),
          nameEn: editNameEn.trim(),
          nameIt: editNameIt.trim(),

          descSq: editDescSq.trim(),
          descEn: editDescEn.trim(),
          descIt: editDescIt.trim(),

          name: editNameSq.trim(), // fallback
          price: isNumberOnly ? null : Number(editPrice),
        },
      });

      closeEdit();
      await reloadProducts();
    } catch (err) {
      console.error("❌ updateProduct:", err?.response?.data || err);
      alert(
        err?.response?.data?.message ||
          "Gabim gjatë përditësimit të produktit."
      );
    }
  };

  // ====== DELETE ======
  const removeProduct = async (productId) => {
    const ok = window.confirm("Je i sigurt që do ta fshish këtë produkt?");
    if (!ok) return;

    try {
      await deleteProduct({ id: productId, businessId });
      await reloadProducts();
    } catch (err) {
      console.error("❌ deleteProduct:", err?.response?.data || err);
      alert(err?.response?.data?.message || "Gabim gjatë fshirjes së produktit.");
    }
  };

  const renderCardTitle = (p) => (p.nameSq ?? p.name ?? "").trim() || "Pa emër";

  return (
    <div className="prod-page">
      {/* ====================== HEADER ======================= */}
      <div className="prod-top">
        <button
          className="prod-back"
          onClick={() =>
            navigate(
              `/manager/subcategory?type=${encodeURIComponent(categoryType)}`
            )
          }
          title="Kthehu"
        >
          ←
        </button>

        <div className="prod-title-wrap">
          <h1 className="prod-title">{subCategory.toUpperCase()}</h1>
          <div className="prod-subtitle">
            Menaxho produktet e kësaj nën-kategorie
          </div>
        </div>

        <button className="prod-add-open" onClick={() => setShowAdd(true)}>
          + Shto
        </button>
      </div>

      {/* ====================== LIST ======================= */}
      <div className="prod-content">
        {loading ? (
          <div className="prod-empty">Duke ngarkuar...</div>
        ) : products.length === 0 ? (
          <div className="prod-empty">Nuk ka produkte. Shto të parin.</div>
        ) : (
          <div className="prod-grid">
            {products.map((p) => {
              const title = renderCardTitle(p);
              return (
                <div className="prod-card" key={p._id}>
                  <div className="prod-card-row">
                    <div className="prod-card-left">
                      <div className="prod-card-name" title={title}>
                        {title}
                      </div>

                      {!isNumberOnly && (
                        <div className="prod-card-price">
                          {(Number(p.price) || 0).toFixed(2)} €
                        </div>
                      )}

                      {!isNumberOnly && (p.descSq || p.descEn || p.descIt) ? (
                        <div className="prod-card-desc">
                          {(p.descSq || p.descEn || p.descIt || "")
                            .toString()
                            .slice(0, 72)}
                          {(p.descSq || p.descEn || p.descIt || "").toString()
                            .length > 72
                            ? "..."
                            : ""}
                        </div>
                      ) : null}
                    </div>

                    <div className="prod-card-actions">
                      <button
                        className="prod-icon edit"
                        onClick={() => openEdit(p)}
                        title="Ndrysho"
                      >
                        ✏️
                      </button>
                      <button
                        className="prod-icon del"
                        onClick={() => removeProduct(p._id)}
                        title="Fshi"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====================== ADD MODAL ======================= */}
      {showAdd && (
        <div className="prod-modal-overlay" onClick={closeAdd}>
          <div className="prod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prod-modal-head">
              <h2>Shto {isNumberOnly ? "Numër" : "Produkt"}</h2>
              <button className="prod-modal-x" onClick={closeAdd}>
                ✕
              </button>
            </div>

            {isNumberOnly ? (
              <div className="prod-form-grid onecol">
                <input
                  placeholder="Numri (p.sh. 1, 2, 3...)"
                  value={addNameSq}
                  onChange={(e) => setAddNameSq(e.target.value)}
                />
              </div>
            ) : (
              <div className="prod-form-grid modal-3rows">
                {/* RRESHTI 1 (EMRI) */}
                <input
                  className="f-name-sq"
                  placeholder="Emri (Shqip)"
                  value={addNameSq}
                  onChange={(e) => setAddNameSq(e.target.value)}
                />
                <input
                  className="f-name-en"
                  placeholder="Name (English)"
                  value={addNameEn}
                  onChange={(e) => setAddNameEn(e.target.value)}
                />
                <input
                  className="f-name-it"
                  placeholder="Nome (Italiano)"
                  value={addNameIt}
                  onChange={(e) => setAddNameIt(e.target.value)}
                />

                {/* RRESHTI 2 (PERSHKRIMI) */}
                <input
                  className="f-desc-sq"
                  placeholder="Përshkrimi (Shqip)"
                  value={addDescSq}
                  onChange={(e) => setAddDescSq(e.target.value)}
                />
                <input
                  className="f-desc-en"
                  placeholder="Description (English)"
                  value={addDescEn}
                  onChange={(e) => setAddDescEn(e.target.value)}
                />
                <input
                  className="f-desc-it"
                  placeholder="Descrizione (Italiano)"
                  value={addDescIt}
                  onChange={(e) => setAddDescIt(e.target.value)}
                />

                {/* RRESHTI 3 (CMIMI - vetem) */}
                <input
                  className="f-price"
                  placeholder="Çmimi (€)"
                  type="number"
                  value={addPrice}
                  onChange={(e) => setAddPrice(e.target.value)}
                />
              </div>
            )}

            <div className="prod-modal-actions">
              <button className="btn ghost" onClick={closeAdd}>
                Mbyll
              </button>
              <button className="btn primary" onClick={handleAdd}>
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================== EDIT MODAL ======================= */}
      {showEdit && (
        <div className="prod-modal-overlay" onClick={closeEdit}>
          <div className="prod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prod-modal-head">
              <h2>Ndrysho {isNumberOnly ? "Numrin" : "Produktin"}</h2>
              <button className="prod-modal-x" onClick={closeEdit}>
                ✕
              </button>
            </div>

            {isNumberOnly ? (
              <div className="prod-form-grid onecol">
                <input
                  placeholder="Numri"
                  value={editNameSq}
                  onChange={(e) => setEditNameSq(e.target.value)}
                />
              </div>
            ) : (
              <div className="prod-form-grid modal-3rows">
                {/* RRESHTI 1 (EMRI) */}
                <input
                  className="f-name-sq"
                  placeholder="Emri (Shqip)"
                  value={editNameSq}
                  onChange={(e) => setEditNameSq(e.target.value)}
                />
                <input
                  className="f-name-en"
                  placeholder="Name (English)"
                  value={editNameEn}
                  onChange={(e) => setEditNameEn(e.target.value)}
                />
                <input
                  className="f-name-it"
                  placeholder="Nome (Italiano)"
                  value={editNameIt}
                  onChange={(e) => setEditNameIt(e.target.value)}
                />

                {/* RRESHTI 2 (PERSHKRIMI) */}
                <input
                  className="f-desc-sq"
                  placeholder="Përshkrimi (Shqip)"
                  value={editDescSq}
                  onChange={(e) => setEditDescSq(e.target.value)}
                />
                <input
                  className="f-desc-en"
                  placeholder="Description (English)"
                  value={editDescEn}
                  onChange={(e) => setEditDescEn(e.target.value)}
                />
                <input
                  className="f-desc-it"
                  placeholder="Descrizione (Italiano)"
                  value={editDescIt}
                  onChange={(e) => setEditDescIt(e.target.value)}
                />

                {/* RRESHTI 3 (CMIMI - vetem) */}
                <input
                  className="f-price"
                  placeholder="Çmimi (€)"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
            )}

            <div className="prod-modal-actions">
              <button className="btn ghost" onClick={closeEdit}>
                Mbyll
              </button>
              <button className="btn primary" onClick={handleSaveEdit}>
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
