import { Outlet, useNavigate } from "react-router-dom";
import "./ManagerPage.css";
import Sidebar from "../../components/Sidebar";

export default function ManagerPage({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="manager-layout">

      <div className="manager-body">
        <Sidebar onLogout={onLogout} />
        <div className="manager-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}