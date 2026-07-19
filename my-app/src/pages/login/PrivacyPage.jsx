import { useNavigate } from "react-router-dom";
import "./PolicyPages.css";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="policy-page">
      <header className="policy-header">
        <button type="button" className="policy-back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Kthehu
        </button>
        <div className="policy-logo">my<span>Order</span></div>
      </header>

      <main className="policy-main">
        <div className="policy-card">
          <h1>Politika e Privatësisë</h1>
          <p className="policy-date">Përditësuar: Qershor 2026</p>

          <div className="policy-body">

            <section>
              <h2>1. Kush jemi ne</h2>
              <p>myOrder është një platformë dixhitale për menaxhimin e hoteleve, bareve dhe restoranteve. Operatori i të dhënave është myOrder sh.p.k., me seli në Shqipëri.</p>
            </section>

            <section>
              <h2>2. Çfarë të dhënash mbledhim</h2>
              <p>Mbledhim të dhënat që ju jepni gjatë regjistrimit dhe përdorimit të platformës:</p>
              <ul>
                <li>Emri i biznesit dhe të dhënat e kontaktit</li>
                <li>Adresa email dhe numri i telefonit</li>
                <li>Të dhëna të porosive dhe faturave</li>
                <li>Të dhëna teknike si adresa IP dhe lloji i pajisjes</li>
              </ul>
            </section>

            <section>
              <h2>3. Si i përdorim të dhënat</h2>
              <p>Të dhënat tuaja përdoren për:</p>
              <ul>
                <li>Ofrimin dhe përmirësimin e shërbimeve tona</li>
                <li>Komunikimin me ju për çështje të llogarisë</li>
                <li>Sigurimin e platformës dhe parandalimin e abuzimit</li>
                <li>Përmbushjen e detyrimeve ligjore</li>
              </ul>
            </section>

            <section>
              <h2>4. Cookies</h2>
              <p>Përdorim cookies teknike të nevojshme për funksionimin e platformës (p.sh. ruajtja e sesionit të hyrjes). Nuk përdorim cookies reklamuese apo analitike pa pëlqimin tuaj.</p>
            </section>

            <section>
              <h2>5. Ndarja e të dhënave</h2>
              <p>Nuk shesim dhe nuk ndajmë të dhënat tuaja me palë të treta, me përjashtim të rasteve kur kërkohet me ligj ose kur është i nevojshëm për ofrimin e shërbimit (p.sh. ofruesit e serverëve).</p>
            </section>

            <section>
              <h2>6. Ruajtja e të dhënave</h2>
              <p>Të dhënat tuaja ruhen për aq kohë sa keni llogari aktive në platformë. Pas fshirjes së llogarisë, të dhënat fshihen brenda 30 ditëve, me përjashtim të atyre që kërkohen me ligj.</p>
            </section>

            <section>
              <h2>7. Të drejtat tuaja</h2>
              <p>Keni të drejtë të:</p>
              <ul>
                <li>Aksesoni të dhënat tuaja personale</li>
                <li>Kërkoni korrigjimin ose fshirjen e tyre</li>
                <li>Kundërshtoni përpunimin e të dhënave</li>
                <li>Merrni kopje të të dhënave tuaja</li>
              </ul>
            </section>

            <section>
              <h2>8. Kontakti</h2>
              <p>Për çdo pyetje lidhur me privatësinë tuaj, na kontaktoni në: <strong>info.myorderal@gmail.com</strong></p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}