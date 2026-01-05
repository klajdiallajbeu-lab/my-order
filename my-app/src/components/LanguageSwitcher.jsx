export default function LanguageSwitcher({ lang, setLang }) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <button onClick={() => setLang("sq")} disabled={lang === "sq"}>
        🇦🇱 SQ
      </button>
      <button onClick={() => setLang("en")} disabled={lang === "en"}>
        🇬🇧 EN
      </button>
      <button onClick={() => setLang("it")} disabled={lang === "it"}>
        🇮🇹 IT
      </button>
    </div>
  );
}
