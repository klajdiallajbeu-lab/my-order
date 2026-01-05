import { useState, useEffect } from "react";
import { translations } from "./translations";

export function useLanguage() {
  const [lang, setLang] = useState(
    localStorage.getItem("lang") || "sq"
  );

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const t = translations[lang];

  return { lang, setLang, t };
}
