import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
  const kontrolloAdminin = () => {
    const adminId = localStorage.getItem("adminId");
    const adminToken = localStorage.getItem("adminToken");

    if (!adminId || !adminToken) {
      window.location.replace("/admin");
    }
  };

  kontrolloAdminin();

  window.addEventListener("pageshow", kontrolloAdminin);
  window.addEventListener("popstate", kontrolloAdminin);

  return () => {
    window.removeEventListener("pageshow", kontrolloAdminin);
    window.removeEventListener("popstate", kontrolloAdminin);
  };
}, []);

  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalManagers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    systemStatus: "active",
  });

  const [businessStats, setBusinessStats] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [history, setHistory] = useState([]);
  const [priceRecommendation, setPriceRecommendation] = useState(null);
  const [loadingBusinessStats, setLoadingBusinessStats] = useState(true);
  const [businessStatsError, setBusinessStatsError] = useState("");
  const logout = () => {
  localStorage.removeItem("adminId");
  localStorage.removeItem("adminToken");

  sessionStorage.removeItem("adminId");
  sessionStorage.removeItem("adminToken");

  window.location.replace("/admin");
};

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const statsRes = await fetch("/api/admin/stats", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        });

        const statsData = await statsRes.json();

        if (statsRes.ok) {
          setStats({
            totalBusinesses: Number(statsData.totalBusinesses) || 0,
            totalManagers: Number(statsData.totalManagers) || 0,
            totalOrders: Number(statsData.totalOrders) || 0,
            totalRevenue: Number(statsData.totalRevenue) || 0,
            systemStatus: statsData.systemStatus || "active",
          });
        }
      } catch (err) {
        console.error("Gabim te stats:", err);
      }

      try {
        setLoadingBusinessStats(true);
        setBusinessStatsError("");

        const usageRes = await fetch(
          "/api/admin/business-usage-stats",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
          }
        );

        const usageData = await usageRes.json();

        if (!usageRes.ok) {
          setBusinessStats([]);
          setBusinessStatsError(
            usageData?.message || "Gabim gjatë marrjes së statistikave."
          );
          return;
        }

        if (Array.isArray(usageData)) {
          setBusinessStats(usageData);
          if (usageData.length > 0) {
            setSelectedBusiness(usageData[0]);
          }
        } else {
          setBusinessStats([]);
          setBusinessStatsError("API nuk ktheu listë biznesesh.");
        }
      } catch (err) {
        console.error("Gabim te business stats:", err);
        setBusinessStats([]);
        setBusinessStatsError("Gabim serveri gjatë ngarkimit.");
      } finally {
        setLoadingBusinessStats(false);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    if (!selectedBusiness?.businessId) return;

    const loadBusinessDetails = async () => {
      try {
        const historyRes = await fetch(
          `/api/admin/business/${selectedBusiness.businessId}/history`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
          }
        );

        const historyData = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err) {
        console.error("Gabim te history:", err);
        setHistory([]);
      }

      try {
        const priceRes = await fetch(
          `/api/admin/business/${selectedBusiness.businessId}/price-recommendation`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            },
          }
        );

        const priceData = await priceRes.json();
        setPriceRecommendation(priceRes.ok ? priceData : null);
      } catch (err) {
        console.error("Gabim te recommendation:", err);
        setPriceRecommendation(null);
      }
    };

    loadBusinessDetails();
  }, [selectedBusiness]);

  return (
    <div className="admin-dashboard-container">
      <aside className="admin-sidebar">
        <h2 className="admin-logo">Admin Panel</h2>

        <nav className="admin-menu">
          <button
            className="admin-btn"
            onClick={() => navigate("/admin/business/create")}
          >
            Krijo Biznes
          </button>

          <button
            className="admin-btn"
            onClick={() => navigate("/admin/business/list")}
          >
            Shiko Bizneset
          </button>
        </nav>

        <button className="admin-btn logout" onClick={logout}>
          Dil
        </button>
      </aside>

      <main className="admin-main">
        <div className="dashboard-topbar">
          <div className="topbar-left">
            <h1>Mirësevjen, Administrator</h1>
            <p>Analiza e bizneseve, historiku i përdorimit dhe sugjerimi i çmimit</p>
          </div>

          <span className="system-pill">
            {stats.systemStatus === "active" ? "Sistem Aktiv" : "Sistem Joaktiv"}
          </span>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">B</div>
            <div>
              <p className="stat-label">Bizneset totale</p>
              <h2 className="stat-value">{stats.totalBusinesses}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">M</div>
            <div>
              <p className="stat-label">Menaxherë total</p>
              <h2 className="stat-value">{stats.totalManagers}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">P</div>
            <div>
              <p className="stat-label">Porosi totale</p>
              <h2 className="stat-value">{stats.totalOrders}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue">A</div>
            <div>
              <p className="stat-label">Xhiro totale</p>
              <h2 className="stat-value">
                {(Number(stats.totalRevenue) || 0).toLocaleString("sq-AL")} ALL
              </h2>
            </div>
          </div>
        </div>

        <div className="business-usage-section">
          <h2>Aktiviteti i Bizneseve</h2>

          {loadingBusinessStats ? (
            <div className="empty-box">Duke ngarkuar të dhënat...</div>
          ) : businessStatsError ? (
            <div className="empty-box error-box">{businessStatsError}</div>
          ) : (
            <div className="table-wrapper">
              <table className="business-table">
                <thead>
                  <tr>
                    <th>Biznesi</th>
                    <th>Menaxheri</th>
                    <th>Porosi</th>
                    <th>Xhiro</th>
                    <th>Produkte</th>
                    <th>User</th>
                    <th>Vende</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {businessStats.map((b) => (
                    <tr
                      key={b.businessId}
                      className={
                        selectedBusiness?.businessId === b.businessId
                          ? "row-selected"
                          : ""
                      }
                      onClick={() => setSelectedBusiness(b)}
                    >
                      <td>{b.businessName || "-"}</td>
                      <td>{b.ownerName || "-"}</td>
                      <td>{Number(b.ordersCount) || 0}</td>
                      <td>
                        {(Number(b.totalRevenue) || 0).toLocaleString("sq-AL")} ALL
                      </td>
                      <td>{Number(b.productsCount) || 0}</td>
                      <td>{Number(b.usersCount) || 0}</td>
                      <td>{Number(b.placesCount) || 0}</td>
                      <td>
                        <span
                          className={
                            b.status === "Aktiv" ? "status active" : "status expired"
                          }
                        >
                          {b.status || "Pa status"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="details-grid">
          <div className="chart-card">
            <h2>
              Historiku i përdorimit
              {selectedBusiness?.businessName
                ? ` - ${selectedBusiness.businessName}`
                : ""}
            </h2>

            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ordersCount" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="recommendation-card">
            <h2>Rekomandim çmimi</h2>

            {!priceRecommendation ? (
              <div className="empty-box">Nuk ka të dhëna.</div>
            ) : (
              <div className="recommendation-content">
                <div className="recommendation-price">
                  {priceRecommendation.recommendedPrice} €
                </div>
                <div className="recommendation-tier">
                  {priceRecommendation.tier}
                </div>
                <p className="recommendation-reason">
                  {priceRecommendation.reason}
                </p>

                <div className="recommendation-list">
                  <div>
                    <strong>Porosi:</strong> {priceRecommendation.ordersCount}
                  </div>
                  <div>
                    <strong>User:</strong> {priceRecommendation.usersCount}
                  </div>
                  <div>
                    <strong>Produkte:</strong> {priceRecommendation.productsCount}
                  </div>
                  <div>
                    <strong>Vende:</strong> {priceRecommendation.placesCount}
                  </div>
                  <div>
                    <strong>Xhiro:</strong>{" "}
                    {(Number(priceRecommendation.totalRevenue) || 0).toLocaleString(
                      "sq-AL"
                    )}{" "}
                    ALL
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}