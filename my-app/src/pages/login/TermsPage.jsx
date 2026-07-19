import { useNavigate } from "react-router-dom";
import "./PolicyPages.css";

export default function TermsPage() {
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
          <h1>Kushtet e Përdorimit</h1>
          <p className="policy-date">Përditësuar: Qershor 2026</p>

          <div className="policy-body">

            <section>
              <h2>1. Pranimi i kushteve</h2>
              <p>Duke përdorur platformën myOrder, pranoni këto kushte të përdorimit. Nëse nuk jeni dakord, ju lutemi mos përdorni shërbimin.</p>
            </section>

            <section>
              <h2>2. Përshkrimi i shërbimit</h2>
              <p>myOrder ofron një platformë dixhitale për menaxhimin e porosive, produkteve, stafit dhe raporteve për hotele, bare dhe restorante.</p>
            </section>

            <section>
              <h2>3. Llogaria juaj</h2>
              <p>Jeni përgjegjës për:</p>
              <ul>
                <li>Saktësinë e të dhënave që jepni gjatë regjistrimit</li>
                <li>Ruajtjen e konfidencialitetit të fjalëkalimit tuaj</li>
                <li>Të gjitha aktivitetet që ndodhin nën llogarinë tuaj</li>
              </ul>
            </section>

            <section>
              <h2>4. Përdorimi i lejuar</h2>
              <p>Platformën mund ta përdorni vetëm për qëllime legjitime biznesi. Ndalohet:</p>
              <ul>
                <li>Çdo aktivitet i paligjshëm ose mashtrues</li>
                <li>Ndërhyrja në funksionimin e platformës</li>
                <li>Aksesi i paautorizuar në llogaritë e të tjerëve</li>
                <li>Shpërndarja e malware ose kodit të dëmshëm</li>
              </ul>
            </section>

            <section>
              <h2>5. Pagesa dhe abonimi</h2>
              <p>Shërbimi ofrohet me abonim mujor ose vjetor. Tarifat janë të specifikuara në ofertën tuaj individuale. myOrder rezervon të drejtën të ndryshojë tarifat me njoftim 30-ditor paraprak.</p>
            </section>

            <section>
              <h2>6. Ndërprerja e shërbimit</h2>
              <p>myOrder mund të pezullojë ose ndërpresë llogarinë tuaj në rast të shkeljes së këtyre kushteve, pas njoftimit paraprak me email.</p>
            </section>

            <section>
              <h2>7. Kufizimi i përgjegjësisë</h2>
              <p>myOrder nuk mban përgjegjësi për humbje indirekte, të ardhura të humbura ose dëme që rrjedhin nga ndërprerja e përkohshme e shërbimit për arsye teknike.</p>
            </section>

            <section>
              <h2>8. Ndryshimet e kushteve</h2>
              <p>Rezervojmë të drejtën të përditësojmë këto kushte. Ju do të njoftoheni me email për çdo ndryshim material. Vazhdimi i përdorimit të platformës pas njoftimit konsiderohet pranim.</p>
            </section>

            <section>
              <p>Për çdo pyetje lidhur me këto kushte: <strong>info.myorderal@gmail.com</strong></p>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}