import { Navigate, useSearchParams } from "react-router-dom";

// Faqe e vjetër — s'lidhet më nga asnjë menu (u zëvendësua nga
// ProductsPage e bashkuar). E mbajmë vetëm si redirect sigurie
// në rast se dikush hap URL-in e vjetër manualisht.
export default function SubCategoryPage() {
  const [params] = useSearchParams();
  const type = (params.get("type") || "").toLowerCase();

  if (type === "ushqime" || type === "pije") {
    return <Navigate to={`/manager/products?type=${type}`} replace />;
  }

  return <Navigate to="/manager/places" replace />;
}