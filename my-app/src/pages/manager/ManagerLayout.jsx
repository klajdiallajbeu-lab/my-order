import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import "./ManagerPage.css";

export default function ManagerLayout({ setIsLoggedIn }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate("/login");
  };

}
