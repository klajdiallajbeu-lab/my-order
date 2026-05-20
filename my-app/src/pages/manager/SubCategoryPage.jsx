// src/pages/manager/SubCategoryPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiChevronRight,
  FiGrid,
  FiCoffee,
  FiHome,
  FiMapPin,
  FiPackage,
} from "react-icons/fi";

import "./SubCategoryPage.css";

import {
  getSubCategories,
  createSubCategory,
  deleteSubCategory,
  updateSubCategory,
} from "../../api/subCategoryApi.js";

const safeDecode = (v) => {
  try {
    return decodeURIComponent(v || "");
  } catch {
    return v || "";
  }
};

const getTitleMeta = (type) => {
  const t = (type || "").toLowerCase();

  if (t === "ushqime") {
    return {
      label: "Restorant",
      icon: <FiGrid />,
    };
  }

  if (t === "pije") {
    return {
      label: "Bar",
      icon: <FiCoffee />,
    };
  }

  if (t === "cadra") {
    return {
      label: "Çadra",
      icon: <FiMapPin />,
      description: "Menaxho kodet dhe aktivizimin për përdorim me QR.",
    };
  }

  if (t === "dhoma") {
    return {
      label: "Dhoma",
      icon: <FiHome />,
      description: "Menaxho dhomat dhe kodet e lidhura me porositë nga klientët.",
    };
  }

  return {
    label: type || "Kategori",
    icon: <FiPackage />,
    description: "Menaxho elementët e kësaj kategorie.",
  };
};

const deptLabel = (d) => (d === "banak" ? "Banak" : "Kuzhinë");

export default function SubCategoryPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const categoryTypeRaw = params.get("type") || "";
  const categoryType = useMemo(
    () => safeDecode(categoryTypeRaw).trim().toLowerCase(),
    [categoryTypeRaw]
  );

  const businessId = useMemo(
    () => (localStorage.getItem("businessId") || "").trim(),
    []
  );

  const { icon, label, description } = useMemo(
    () => getTitleMeta(categoryType),
    [categoryType]
  );

  const [subCats, setSubCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const isSimpleType = categoryType === "cadra" || categoryType === "dhoma";

  // =========================
  // ADD MODAL
  // =========================
  const [showAdd, setShowAdd] = useState(false);
  const [addSq, setAddSq] = useState("");
  const [addEn, setAddEn] = useState("");
  const [addIt, setAddIt] = useState("");
  const [addDepartment, setAddDepartment] = useState("kuzhine");

  const resetAdd = () => {
    setAddSq("");
    setAddEn("");
    setAddIt("");
    setAddDepartment("kuzhine");
  };

  // =========================
  // EDIT MODAL
  // =========================
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editSq, setEditSq] = useState("");
  const [editEn, setEditEn] = useState("");
  const [editIt, setEditIt] = useState("");
  const [editDepartment, setEditDepartment] = useState("kuzhine");

  const openEdit = (sc) => {
    setEditId(sc._id);
    setEditSq((sc.nameSq ?? sc.name ?? "").toString());
    setEditEn((sc.nameEn ?? "").toString());
    setEditIt((sc.nameIt ?? "").toString());
    setEditDepartment(sc.destination === "banak" ? "banak" : "kuzhine");
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditId(null);
    setEditSq("");
    setEditEn("");
    setEditIt("");
    setEditDepartment("kuzhine");
  };

  const fetchSubCats = useCallback(async () => {
    try {
      setLoading(true);
      setErr("");

      if (!businessId || businessId === "undefined" || businessId === "null") {
        throw new Error("Mungon businessId. Hyr sërish si menaxher.");
      }

      if (!categoryType) {
        throw new Error("Mungon 'type' në URL.");
      }

      const res = await getSubCategories({ businessId, categoryType });
      const data = res?.data ?? res ?? [];
      setSubCats(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("SubCategoryPage fetch error:", e);
      setErr(
        e?.response?.data?.message ||
          e?.message ||
          "Nuk mund të ngarkoj nën-kategoritë."
      );
      setSubCats([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, categoryType]);

  useEffect(() => {
    if (!isSimpleType) fetchSubCats();
  }, [fetchSubCats, isSimpleType]);

  const handleDeleteSub = async (subId, subName) => {
    const ok = window.confirm(`Fshi nën-kategorinë "${subName}"?`);
    if (!ok) return;

    try {
      await deleteSubCategory({ id: subId, businessId });
      await fetchSubCats();
    } catch (e) {
      console.error("deleteSubCategory error:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Gabim gjatë fshirjes.");
    }
  };

  const handleAddSub = async () => {
    const sq = String(addSq || "").trim();
    const en = String(addEn || "").trim();
    const it = String(addIt || "").trim();

    if (!sq) return alert("Emri (Shqip) është i detyrueshëm.");

    const exists = subCats.some((s) => {
      const current = (s.nameSq ?? s.name ?? "").toLowerCase().trim();
      return current === sq.toLowerCase();
    });

    if (exists) return alert("Kjo nën-kategori ekziston tashmë.");

    try {
      await createSubCategory({
        businessId,
        categoryType,
        nameSq: sq,
        nameEn: en,
        nameIt: it,
        name: sq,
        destination: addDepartment === "banak" ? "banak" : "kuzhine",
      });

      resetAdd();
      setShowAdd(false);
      await fetchSubCats();
    } catch (e) {
      console.error("createSubCategory error:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Gabim gjatë shtimit.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editId) return;

    const sq = String(editSq || "").trim();
    const en = String(editEn || "").trim();
    const it = String(editIt || "").trim();

    if (!sq) return alert("Emri (Shqip) është i detyrueshëm.");

    try {
      await updateSubCategory({
        id: editId,
        businessId,
        data: {
          nameSq: sq,
          nameEn: en,
          nameIt: it,
          name: sq,
          destination: editDepartment === "banak" ? "banak" : "kuzhine",
        },
      });

      closeEdit();
      await fetchSubCats();
    } catch (e) {
      console.error("updateSubCategory error:", e?.response?.data || e);
      alert(e?.response?.data?.message || "Gabim gjatë përditësimit.");
    }
  };

  const totalCount = subCats.length;
  const kitchenCount = subCats.filter(
    (s) => (s.destination || "kuzhine") !== "banak"
  ).length;
  const barCount = subCats.filter((s) => s.destination === "banak").length;

  // =========================
  // UI: CADRA / DHOMA
  // =========================
  if (isSimpleType) {
    return (
      <div className="subcat-page">
        <div className="subcat-hero">
          <div className="subcat-hero-left">
            <div className="subcat-hero-icon">{icon}</div>
            <div>
              <h1 className="subcat-title">{label} – Numrat</h1>
              <p className="subcat-subtitle">{description}</p>
            </div>
          </div>
        </div>

        <div className="subcat-grid">
          <button
            className="subcat-card"
            onClick={() => {
              const placeType = categoryType === "dhoma" ? "room" : "umbrella";
              navigate(`/manager/places?type=${encodeURIComponent(placeType)}`);
            }}
          >
            <div className="subcat-card-left">
              <div className="subcat-card-badge">
                <FiGrid />
              </div>

              <div className="subcat-card-text">
                <div className="subcat-card-title">Menaxho kodet</div>
                <div className="subcat-card-desc">
                  Shto, aktivizo ose çaktivizo kodet që përdoren nga QR.
                </div>
              </div>
            </div>

            <div className="subcat-card-arrow">
              <FiChevronRight />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // UI: USHQIME / PIJE
  // =========================
  return (
    <div className="subcat-page">
      <div className="subcat-hero">
        <div className="subcat-hero-left">
          <div className="subcat-hero-icon">{icon}</div>
          <div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#64748b",
                marginBottom: "4px",
              }}
            >
              Menaxhim produktesh
            </div>

            <h1 className="subcat-title">{label} – Nën-kategoritë</h1>
            <p className="subcat-subtitle">{description}</p>
          </div>
        </div>

        <div className="subcat-hero-actions">
          <button className="subcat-add" onClick={() => setShowAdd(true)}>
            <FiPlus />
            <span>Shto</span>
          </button>
        </div>
      </div>

      {loading && <p className="subcat-info">Duke ngarkuar...</p>}
      {!loading && err && <p className="subcat-error">{err}</p>}

      {!loading && !err && (
        <div className="subcat-grid">
          {subCats.length === 0 ? (
            <div className="subcat-empty">
              <div className="subcat-empty-icon">
                <FiPackage />
              </div>
              <div className="subcat-empty-title">Nuk ka nën-kategori</div>
              <div className="subcat-empty-desc">
                Shto nën-kategorinë e parë për të organizuar më mirë produktet.
              </div>
            </div>
          ) : (
            subCats.map((sc) => {
              const title = (sc.nameSq ?? sc.name ?? "").trim() || "Pa emër";
              const dept = sc.destination === "banak" ? "banak" : "kuzhine";

              return (
                <div
                  key={sc._id}
                  className="subcat-card"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(
                      `/manager/products?type=${encodeURIComponent(
                        categoryType
                      )}&subCategoryId=${encodeURIComponent(sc._id)}`
  )
}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate(
                        `/manager/products?type=${encodeURIComponent(
                          categoryType
                        )}&subCategoryId=${encodeURIComponent(sc._id)}`
                      );
                    }
                  }}
                >
                  <div className="subcat-card-left">
                    <div className="subcat-card-badge">
                      <FiGrid />
                    </div>

                    <div className="subcat-card-text">
                      <div className="subcat-card-title">{title}</div>

                      <div className="subcat-card-desc">
                        <span
                          className={
                            dept === "banak"
                              ? "subcat-dept-tag banak"
                              : "subcat-dept-tag kuzhine"
                          }
                          title="Ku shkon porosia?"
                        >
                          {deptLabel(dept)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="subcat-card-right">
                    <button
                      className="subcat-icon edit"
                      title="Ndrysho"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(sc);
                      }}
                    >
                      <FiEdit2 className="i" />
                    </button>

                    <button
                      className="subcat-icon del"
                      title="Fshi"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSub(sc._id, title);
                      }}
                    >
                      <FiTrash2 className="i" />
                    </button>

                    <div className="subcat-card-arrow">
                      <FiChevronRight />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= ADD MODAL ================= */}
      {showAdd && (
        <div className="subcat-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="subcat-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Shto Nën-kategori</h2>

            <div className="subcat-3grid">
              <input
                placeholder="Emri (Shqip)"
                value={addSq}
                onChange={(e) => setAddSq(e.target.value)}
              />
              <input
                placeholder="Name (English)"
                value={addEn}
                onChange={(e) => setAddEn(e.target.value)}
              />
              <input
                placeholder="Nome (Italiano)"
                value={addIt}
                onChange={(e) => setAddIt(e.target.value)}
              />
            </div>

            <div className="subcat-dept-pick">
              <div className="subcat-dept-label">Ku shkon porosia?</div>

              <div className="subcat-dept-buttons">
                <button
                  type="button"
                  className={
                    addDepartment === "kuzhine"
                      ? "subcat-dept-btn active kuzhine"
                      : "subcat-dept-btn kuzhine"
                  }
                  onClick={() => setAddDepartment("kuzhine")}
                >
                  Kuzhinë
                </button>

                <button
                  type="button"
                  className={
                    addDepartment === "banak"
                      ? "subcat-dept-btn active banak"
                      : "subcat-dept-btn banak"
                  }
                  onClick={() => setAddDepartment("banak")}
                >
                  Banak
                </button>
              </div>

              <div className="subcat-dept-hint">
                Kjo zgjedhje vlen për të gjithë produktet brenda kësaj
                nën-kategorie.
              </div>
            </div>

            <div className="subcat-modal-actions">
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>
                Mbyll
              </button>
              <button className="btn-primary" onClick={handleAddSub}>
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {showEdit && (
        <div className="subcat-modal-overlay" onClick={closeEdit}>
          <div className="subcat-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Ndrysho Nën-kategorinë</h2>

            <div className="subcat-3grid">
              <input
                placeholder="Emri (Shqip)"
                value={editSq}
                onChange={(e) => setEditSq(e.target.value)}
              />
              <input
                placeholder="Name (English)"
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
              />
              <input
                placeholder="Nome (Italiano)"
                value={editIt}
                onChange={(e) => setEditIt(e.target.value)}
              />
            </div>

            <div className="subcat-dept-pick">
              <div className="subcat-dept-label">Ku shkon porosia?</div>

              <div className="subcat-dept-buttons">
                <button
                  type="button"
                  className={
                    editDepartment === "kuzhine"
                      ? "subcat-dept-btn active kuzhine"
                      : "subcat-dept-btn kuzhine"
                  }
                  onClick={() => setEditDepartment("kuzhine")}
                >
                  Kuzhinë
                </button>

                <button
                  type="button"
                  className={
                    editDepartment === "banak"
                      ? "subcat-dept-btn active banak"
                      : "subcat-dept-btn banak"
                  }
                  onClick={() => setEditDepartment("banak")}
                >
                  Banak
                </button>
              </div>

              <div className="subcat-dept-hint">
                Përditëso destinacionin ku do të dërgohen porositë për këtë
                nën-kategori.
              </div>
            </div>

            <div className="subcat-modal-actions">
              <button className="btn-secondary" onClick={closeEdit}>
                Mbyll
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}