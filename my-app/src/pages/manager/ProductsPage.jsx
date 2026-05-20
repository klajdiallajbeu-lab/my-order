// src/pages/manager/ProductsPage.jsx
import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import "./ProductsPage.css";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../api/productApi.js";
import { getSubCategories } from "../../api/subCategoryApi.js";
import { api } from "../../api/http.js";

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v || "");
  } catch {
    return v || "";
  }
};

const pickSubCatName = (sc) => String(sc?.nameSq ?? sc?.name ?? "").trim();

const pickProductSubCatName = (p) =>
  String(
    p?.subCategoryId?.nameSq ??
      p?.subCategoryId?.name ??
      p?.subCategory ??
      ""
  ).trim();

const getImageUrl = (img) => {
  if (!img) return "";
  if (String(img).startsWith("http")) return img;
  return img;
};

export default function ProductsPage() {
  const [params] = useSearchParams();

  const categoryTypeRaw = params.get("type") || "";
  const subCategoryId = (params.get("subCategoryId") || "").trim();

  const categoryType = useMemo(
    () => safeDecode(categoryTypeRaw).trim().toLowerCase(),
    [categoryTypeRaw]
  );

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [subCats, setSubCats] = useState([]);
  const [subCatsLoading, setSubCatsLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addPrice, setAddPrice] = useState("");
  const [addNameSq, setAddNameSq] = useState("");
  const [addNameEn, setAddNameEn] = useState("");
  const [addNameIt, setAddNameIt] = useState("");
  const [addDescSq, setAddDescSq] = useState("");
  const [addDescEn, setAddDescEn] = useState("");
  const [addDescIt, setAddDescIt] = useState("");
  const [addDepartment, setAddDepartment] = useState("kuzhine");
  const [addImage, setAddImage] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState("");

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
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");

  const currentSubCategoryObj = useMemo(() => {
    return subCats.find((sc) => String(sc?._id) === String(subCategoryId)) || null;
  }, [subCats, subCategoryId]);

  const currentSubCategoryId = currentSubCategoryObj?._id || "";
  const currentSubCategoryName =
    pickSubCatName(currentSubCategoryObj) || "Nën-kategori";

  const isNumberOnly =
    !!categoryType &&
    !!currentSubCategoryName &&
    (categoryType === "cadra" || categoryType === "dhoma") &&
    currentSubCategoryName.toLowerCase() === "numrat";

  const hasValidParams = !!categoryType && !!subCategoryId;

  const resetAddForm = () => {
    setAddPrice("");
    setAddNameSq("");
    setAddNameEn("");
    setAddNameIt("");
    setAddDescSq("");
    setAddDescEn("");
    setAddDescIt("");
    setAddDepartment("kuzhine");
    setAddImage(null);
    setAddImagePreview("");
  };

  const closeAdd = () => setShowAdd(false);

  const closeEdit = () => {
    setShowEdit(false);
    setEditId(null);
    setEditImage(null);
    setEditImagePreview("");
  };

  const uploadImage = async (file) => {
    if (!file) return "";

    const formData = new FormData();
    formData.append("image", file);

    const res = await api.post("/products/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res?.data?.imageUrl || "";
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
    if (!hasValidParams) return;
    reloadSubCats();
  }, [reloadSubCats, hasValidParams]);

  const reloadProducts = useCallback(async () => {
    if (!businessId || !categoryType || !subCategoryId) {
      setProducts([]);
      return;
    }

    try {
      setLoading(true);

      const data = await getProducts({
        businessId,
        categoryType,
        ...(currentSubCategoryId ? { subCategoryId: currentSubCategoryId } : {}),
      });

      const list = Array.isArray(data) ? data : [];
      const filtered = list.filter((p) => {
        const pid = String(p?.subCategoryId?._id || p?.subCategoryId || "");

        if (pid && pid === String(currentSubCategoryId)) return true;

        const name = pickProductSubCatName(p).toLowerCase();
        const currentName = currentSubCategoryName.toLowerCase();

        return name === currentName;
      });

      setProducts(filtered);
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
  }, [
    businessId,
    categoryType,
    subCategoryId,
    currentSubCategoryId,
    currentSubCategoryName,
  ]);

  useEffect(() => {
    if (!hasValidParams) return;
    reloadProducts();
  }, [reloadProducts, hasValidParams]);

  const handleAdd = async () => {
    if (isNumberOnly) {
      if (!addNameSq.trim()) return alert("Shkruaj numrin!");
    } else {
      if (!addNameSq.trim()) return alert("Emri (Shqip) është i detyrueshëm!");
      const p = Number(addPrice);
      if (!p || p <= 0) return alert("Vendos çmim të vlefshëm!");
    }

    try {
      let imageUrl = "";

      if (addImage) {
        imageUrl = await uploadImage(addImage);
      }

      await createProduct({
        businessId,
        data: {
          categoryType,
          subCategory: currentSubCategoryName,
          subCategoryId: currentSubCategoryId || undefined,

          nameSq: addNameSq.trim(),
          nameEn: addNameEn.trim(),
          nameIt: addNameIt.trim(),

          descSq: addDescSq.trim(),
          descEn: addDescEn.trim(),
          descIt: addDescIt.trim(),

          name: addNameSq.trim(),
          price: isNumberOnly ? null : Number(addPrice),
          destination: addDepartment,

          image: imageUrl,
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

  const openEdit = (p) => {
    setEditId(p._id);

    setEditNameSq((p.nameSq ?? p.name ?? "").toString());
    setEditNameEn((p.nameEn ?? "").toString());
    setEditNameIt((p.nameIt ?? "").toString());

    setEditDescSq((p.descSq ?? "").toString());
    setEditDescEn((p.descEn ?? "").toString());
    setEditDescIt((p.descIt ?? "").toString());

    setEditPrice(p.price ?? "");
    setEditDepartment(p.destination || "kuzhine");

    setEditImage(null);
    setEditImagePreview(getImageUrl(p.image || p.imageUrl || ""));

    setShowEdit(true);
  };

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
      let imageUrl = editImagePreview;

      if (editImage) {
        imageUrl = await uploadImage(editImage);
      }

      await updateProduct({
        id: editId,
        businessId,
        data: {
          subCategory: currentSubCategoryName,
          subCategoryId: currentSubCategoryId || undefined,

          nameSq: editNameSq.trim(),
          nameEn: editNameEn.trim(),
          nameIt: editNameIt.trim(),

          descSq: editDescSq.trim(),
          descEn: editDescEn.trim(),
          descIt: editDescIt.trim(),

          name: editNameSq.trim(),
          price: isNumberOnly ? null : Number(editPrice),
          destination: editDepartment,

          image: imageUrl,
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

  if (!hasValidParams) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontSize: 18 }}>
        <b>Gabim:</b> Nuk u gjet nën-kategoria.
      </div>
    );
  }

  return (
    <div className="prod-page">
      <div className="prod-top">
        <div className="prod-top-left" />

        <div className="prod-title-wrap">
          <h1 className="prod-title">{currentSubCategoryName.toUpperCase()}</h1>
        </div>

        <button
          className="prod-add-open"
          onClick={() => setShowAdd(true)}
          disabled={subCatsLoading}
        >
          + Shto
        </button>
      </div>

      <div className="prod-content">
        {loading ? (
          <div className="prod-empty">Duke ngarkuar...</div>
        ) : products.length === 0 ? (
          <div className="prod-empty">Nuk ka produkte. Shto të parin.</div>
        ) : (
          <div className="prod-grid">
            {products.map((p) => {
              const title = renderCardTitle(p);
              const img = getImageUrl(p.image || p.imageUrl || "");

              return (
                <div className="prod-card" key={p._id}>

                  <div className="prod-card-row">
                    <div className="prod-card-left">
                      <div className="prod-card-name" title={title}>
                        {title}
                      </div>

                      {!isNumberOnly && (
                        <div className="prod-card-price">
                          {(Number(p.price) || 0).toFixed(2)} ALL
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
                        type="button"
                      >
                        <FiEdit2 className="i" />
                      </button>

                      <button
                        className="prod-icon del"
                        onClick={() => removeProduct(p._id)}
                        title="Fshi"
                        type="button"
                      >
                        <FiTrash2 className="i" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="prod-modal-overlay" onClick={closeAdd}>
          <div className="prod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prod-modal-head">
              <h2>Shto {isNumberOnly ? "Numër" : "Produkt"}</h2>
              <button className="prod-modal-x" onClick={closeAdd} type="button">
                ✕
              </button>
            </div>

            {isNumberOnly ? (
              <div className="prod-form-grid onecol">
                <input
                  id="add-number"
                  name="number"
                  autoComplete="off"
                  placeholder="Numri (p.sh. 1, 2, 3...)"
                  value={addNameSq}
                  onChange={(e) => setAddNameSq(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="prod-form-grid modal-3rows">
                  <input
                    id="add-name-sq"
                    name="nameSq"
                    autoComplete="off"
                    className="f-name-sq"
                    placeholder="Emri (Shqip)"
                    value={addNameSq}
                    onChange={(e) => setAddNameSq(e.target.value)}
                  />
                  <input
                    id="add-name-en"
                    name="nameEn"
                    autoComplete="off"
                    className="f-name-en"
                    placeholder="Name (English)"
                    value={addNameEn}
                    onChange={(e) => setAddNameEn(e.target.value)}
                  />
                  <input
                    id="add-name-it"
                    name="nameIt"
                    autoComplete="off"
                    className="f-name-it"
                    placeholder="Nome (Italiano)"
                    value={addNameIt}
                    onChange={(e) => setAddNameIt(e.target.value)}
                  />

                  <input
                    id="add-desc-sq"
                    name="descSq"
                    autoComplete="off"
                    className="f-desc-sq"
                    placeholder="Përshkrimi (Shqip)"
                    value={addDescSq}
                    onChange={(e) => setAddDescSq(e.target.value)}
                  />
                  <input
                    id="add-desc-en"
                    name="descEn"
                    autoComplete="off"
                    className="f-desc-en"
                    placeholder="Description (English)"
                    value={addDescEn}
                    onChange={(e) => setAddDescEn(e.target.value)}
                  />
                  <input
                    id="add-desc-it"
                    name="descIt"
                    autoComplete="off"
                    className="f-desc-it"
                    placeholder="Descrizione (Italiano)"
                    value={addDescIt}
                    onChange={(e) => setAddDescIt(e.target.value)}
                  />

                  <input
                    id="add-price"
                    name="price"
                    autoComplete="off"
                    className="f-price"
                    placeholder="Çmimi (ALL)"
                    type="number"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                  />
                </div>

                <div className="prod-image-upload">
                  {addImagePreview ? (
                    <img
                      src={addImagePreview}
                      alt="preview"
                      className="prod-image-preview"
                    />
                  ) : null}

                  <label className="prod-image-label">
                    Zgjidh foto produkti
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setAddImage(file);
                        setAddImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="prod-modal-actions">
              <button className="btn ghost" onClick={closeAdd} type="button">
                Mbyll
              </button>
              <button className="btn primary" onClick={handleAdd} type="button">
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="prod-modal-overlay" onClick={closeEdit}>
          <div className="prod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="prod-modal-head">
              <h2>Ndrysho {isNumberOnly ? "Numrin" : "Produktin"}</h2>
              <button className="prod-modal-x" onClick={closeEdit} type="button">
                ✕
              </button>
            </div>

            {isNumberOnly ? (
              <div className="prod-form-grid onecol">
                <input
                  id="edit-number"
                  name="number"
                  autoComplete="off"
                  placeholder="Numri"
                  value={editNameSq}
                  onChange={(e) => setEditNameSq(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="prod-form-grid modal-3rows">
                  <input
                    id="edit-name-sq"
                    name="nameSq"
                    autoComplete="off"
                    className="f-name-sq"
                    placeholder="Emri (Shqip)"
                    value={editNameSq}
                    onChange={(e) => setEditNameSq(e.target.value)}
                  />
                  <input
                    id="edit-name-en"
                    name="nameEn"
                    autoComplete="off"
                    className="f-name-en"
                    placeholder="Name (English)"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                  />
                  <input
                    id="edit-name-it"
                    name="nameIt"
                    autoComplete="off"
                    className="f-name-it"
                    placeholder="Nome (Italiano)"
                    value={editNameIt}
                    onChange={(e) => setEditNameIt(e.target.value)}
                  />

                  <input
                    id="edit-desc-sq"
                    name="descSq"
                    autoComplete="off"
                    className="f-desc-sq"
                    placeholder="Përshkrimi (Shqip)"
                    value={editDescSq}
                    onChange={(e) => setEditDescSq(e.target.value)}
                  />
                  <input
                    id="edit-desc-en"
                    name="descEn"
                    autoComplete="off"
                    className="f-desc-en"
                    placeholder="Description (English)"
                    value={editDescEn}
                    onChange={(e) => setEditDescEn(e.target.value)}
                  />
                  <input
                    id="edit-desc-it"
                    name="descIt"
                    autoComplete="off"
                    className="f-desc-it"
                    placeholder="Descrizione (Italiano)"
                    value={editDescIt}
                    onChange={(e) => setEditDescIt(e.target.value)}
                  />

                  <input
                    id="edit-price"
                    name="price"
                    autoComplete="off"
                    className="f-price"
                    placeholder="Çmimi (ALL)"
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>

                <div className="prod-image-upload">
                  {editImagePreview ? (
                    <img
                      src={editImagePreview}
                      alt="preview"
                      className="prod-image-preview"
                    />
                  ) : null}

                  <label className="prod-image-label">
                    Ndrysho foto produkti
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        setEditImage(file);
                        setEditImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="prod-modal-actions">
              <button className="btn ghost" onClick={closeEdit} type="button">
                Mbyll
              </button>
              <button
                className="btn primary"
                onClick={handleSaveEdit}
                type="button"
              >
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}