import { Navigate } from "react-router-dom";

// Faqe e vjetër — funksioni u zhvendos brenda PlacesPage
// (tabet Menu/Tavolina/Dhoma/Çadra). E mbajmë si redirect sigurie.
export default function QrPage() {
  return <Navigate to="/manager/places" replace />;
}