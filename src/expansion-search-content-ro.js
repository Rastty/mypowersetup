const RO_GROWTH_CONTENT = Object.freeze({
  "/ro/ghiduri/capacitate-baterie-autorulota/": Object.freeze({
    title: "Ce capacitate trebuie să aibă bateria unei autorulote?",
    description: "Calculează bateria unei autorulote în Wh și Ah, cu autonomie, marjă de siguranță, LiFePO4 vs AGM și alegerea între 12 V și 24 V.",
    body: `
<section data-ro-search-growth="capacitate-baterie-autorulota">
  <h2>Răspunsul scurt: începe cu Wh pe zi, nu cu Ah</h2>
  <p>O baterie de 100 Ah nu este automat „prea mică”, iar una de 300 Ah nu este automat „mai bună”. Mai întâi trebuie estimată energia consumată într-o zi. Abia apoi contează numărul de zile fără încărcare, tensiunea sistemului și partea din capacitatea nominală pe care vrei să o folosești în mod normal.</p>
  <p>MyPowerSetup folosește pentru dimensionare relația <strong>energie nominală baterie ≈ consum zilnic × zile de autonomie × 1,15 ÷ fracția utilizabilă</strong>. Modelul folosește 80% capacitate utilizabilă pentru LiFePO₄ și 50% pentru AGM/plumb. Acestea sunt ipoteze de proiectare ale calculatorului; limitele producătorului și BMS-ul bateriei reale au prioritate.</p>

  <h2>Exemplu: 830 Wh/zi și două zile de autonomie</h2>
  <p>Un frigider cu compresor poate reprezenta aproximativ 450 Wh/zi, un laptop 260 Wh, iluminatul 90 Wh și pompa de apă 30 Wh. Totalul exemplului este <strong>830 Wh/zi</strong>.</p>
  <ul>
    <li><strong>LiFePO₄:</strong> 830 × 2 × 1,15 ÷ 0,80 ≈ 2 386 Wh nominal; calculatorul rotunjește conservator la aproximativ 2 400 Wh.</li>
    <li><strong>AGM/plumb:</strong> 830 × 2 × 1,15 ÷ 0,50 ≈ 3 818 Wh nominal; calculatorul rotunjește la aproximativ 3 900 Wh.</li>
  </ul>
  <p>Conversia în Ah se face numai după ce știi tensiunea. 2 400 Wh înseamnă aproximativ 200 Ah la 12 V, dar aproximativ 100 Ah la 24 V.</p>

  <h2>Când merită luat în calcul un sistem de 24 V</h2>
  <p>Pentru aceeași putere, un sistem de 24 V cere aproximativ jumătate din curentul unui sistem de 12 V. Asta poate reduce pierderile și poate face mai realistă cablarea la puteri mari. În modul automat, MyPowerSetup trece la 24 V când bateria calculată depășește 2 400 Wh sau când invertorul necesar depășește 1 200 W.</p>
  <p>Nu este o regulă universală de instalație. Înainte de a schimba tensiunea trebuie verificate toate echipamentele: consumatori DC, MPPT, încărcător DC-DC, încărcător de la 230 V și invertor.</p>

  <h2>Ce verifici înainte să cumperi bateria</h2>
  <ul>
    <li>consumul real în Wh/zi și autonomia dorită;</li>
    <li>tensiunea nominală a sistemului;</li>
    <li>curentul maxim continuu și de vârf al BMS-ului;</li>
    <li>curentul maxim de încărcare;</li>
    <li>comportamentul la temperaturi joase;</li>
    <li>compatibilitatea cu MPPT, DC-DC și încărcătorul de 230 V;</li>
    <li>dimensiunile, masa, bornele și spațiul disponibil.</li>
  </ul>
</section>`,
    faq: Object.freeze([
      ["De câți Ah am nevoie în autorulotă?", "Nu există un număr universal. Calculează mai întâi consumul în Wh/zi, autonomia, chimia bateriei și tensiunea sistemului, apoi convertește energia nominală necesară în Ah."],
      ["200 Ah la 12 V înseamnă același lucru ca 200 Ah la 24 V?", "Nu. La 24 V, aceeași valoare de 200 Ah reprezintă aproximativ dublul energiei nominale față de 12 V."],
      ["Pot înlocui direct o baterie AGM cu LiFePO4?", "Nu întotdeauna. Trebuie verificate profilurile de încărcare, alternatorul sau DC-DC-ul, MPPT-ul, încărcătorul de 230 V, cablurile și limitele BMS."],
    ]),
  }),

  "/ro/ghiduri/cate-panouri-solare-autorulota/": Object.freeze({
    title: "Câte panouri solare sunt necesare pentru o autorulotă?",
    description: "Dimensionează puterea solară a autorulotei din consumul zilnic, sezon, pierderi, spațiul de pe plafon și limitele regulatorului MPPT.",
    body: `
<section data-ro-search-growth="cate-panouri-solare-autorulota">
  <h2>Puterea panourilor pornește de la consumul zilnic</h2>
  <p>Întrebarea „ajung 200 W?” nu are un răspuns corect fără consum. MyPowerSetup pornește de la Wh/zi și aplică ore solare echivalente pe sezon, 75% eficiență globală și o marjă suplimentară de 15%.</p>
  <p>Formula de planificare este <strong>Wp ≈ Wh/zi × 1,15 ÷ (ore solare echivalente × 0,75)</strong>, apoi rezultatul este rotunjit în sus. Este o estimare conservatoare, nu o promisiune de producție.</p>

  <h2>Exemplu pentru 900 Wh consumați pe zi</h2>
  <ul>
    <li><strong>Vară, 4,5 h echivalente:</strong> aproximativ 307 W calculați → circa 350 Wp după rotunjire.</li>
    <li><strong>Primăvară/toamnă, 3 h:</strong> aproximativ 460 W → circa 500 Wp.</li>
    <li><strong>Iarnă, 1,5 h:</strong> aproximativ 920 W → circa 950 Wp.</li>
  </ul>
  <p>Valorile sezoniere din calculator sunt ipoteze generale. Pentru un loc și o lună concrete din România sau din țara în care călătorești, compară rezultatul cu <a href="https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en" rel="external noopener">PVGIS al Comisiei Europene</a>.</p>

  <h2>Plafonul autorulotei poate deveni limita reală</h2>
  <p>Puterea calculată trebuie să încapă fizic. Măsoară zona liberă dintre trape, antene, aer condiționat și alte echipamente. Umbra parțială poate reduce producția mult mai mult decât sugerează simpla suprafață ocupată.</p>
  <p>Dacă necesarul calculat nu încape, nu presupune că un panou mai mic va produce aceeași energie. Redu consumul sau combină sursele: solar la staționare, DC-DC în mers și 230 V atunci când este disponibil.</p>

  <h2>Serie, paralel și limitele MPPT</h2>
  <p>Panourile legate în serie adună tensiunile, iar cele legate în paralel adună curenții. De aceea puterea totală în Wp nu este suficientă pentru alegerea regulatorului. Trebuie verificate Voc și Isc pentru configurația reală și limita de tensiune a MPPT-ului inclusiv la temperaturi scăzute.</p>
</section>`,
    faq: Object.freeze([
      ["Sunt suficienți 200 W de panouri pentru autorulotă?", "Pot fi suficienți pentru un consum redus și condiții bune de vară, dar dimensionarea corectă pornește de la Wh/zi și sezon."],
      ["Pot folosi același calcul solar pentru vară și iarnă?", "Nu este recomandat. Producția disponibilă diferă mult după sezon, locație, orientare și umbrire."],
      ["Aleg întâi panourile sau MPPT-ul?", "Poți estima întâi puterea solară necesară, dar configurația finală de panouri și MPPT trebuie verificată împreună pentru Wp, Voc, Isc și tensiunea bateriei."],
    ]),
  }),

  "/ro/ghiduri/lifepo4-sau-agm-autorulota/": Object.freeze({
    title: "LiFePO4 sau AGM în autorulotă?",
    description: "Compară LiFePO4 și AGM pentru autorulotă după energie utilizabilă, capacitate, masă, încărcare, BMS și compatibilitatea instalației.",
    body: `
<section data-ro-search-growth="lifepo4-sau-agm-autorulota">
  <h2>Compară energia utilizabilă, nu doar Ah</h2>
  <p>Două baterii de 100 Ah nu oferă neapărat aceeași rezervă practică. Pentru dimensionare contează tensiunea, energia nominală, cât din ea este planificat să fie folosit și dacă sistemul de încărcare este compatibil.</p>
  <p>MyPowerSetup folosește ca ipoteză conservatoare <strong>80% capacitate utilizabilă pentru LiFePO₄ și 50% pentru AGM/plumb</strong>. Fișa tehnică și BMS-ul modelului real rămân referința finală.</p>

  <h2>Același consum poate cere capacități nominale foarte diferite</h2>
  <p>În exemplul cu 830 Wh/zi, două zile de autonomie și 15% rezervă, modelul cere aproximativ 2,4 kWh nominal în LiFePO₄ și aproximativ 3,9 kWh în AGM/plumb. Diferența se vede apoi în Ah, masă și spațiul ocupat.</p>
  <p>Pentru o autorulotă, masa este importantă deoarece fiecare kilogram de instalație intră în sarcina utilă a vehiculului. Compară masa reală din fișele produselor, nu doar tehnologia bateriei.</p>

  <h2>Trecerea la LiFePO4 nu este automat plug-and-play</h2>
  <p>Verifică toate sursele de încărcare: alternator sau releu existent, DC-DC, regulator solar și încărcător de 230 V. Confirmă tensiunile de încărcare și curentul maxim acceptat de BMS. La unele baterii, încărcarea la temperaturi joase trebuie blocată sau gestionată de BMS.</p>
  <p>Un sistem care a funcționat cu AGM poate necesita schimbări chiar dacă noua baterie încape în același loc.</p>

  <h2>Când AGM poate rămâne o alegere rezonabilă</h2>
  <p>AGM poate avea sens într-o instalație mică, folosită rar, deja compatibilă și unde costul inițial este mai important decât masa sau energia utilizabilă. Alegerea corectă nu este o tehnologie „câștigătoare”, ci soluția care acoperă consumul și încărcarea reală fără compromisuri inutile.</p>
</section>`,
    faq: Object.freeze([
      ["LiFePO4 oferă mai multă autonomie decât AGM la aceiași Ah?", "De regulă poate oferi mai multă energie planificată ca utilizabilă, dar valoarea exactă depinde de bateria reală și de limitele BMS-ului."],
      ["Am nevoie de DC-DC când trec la LiFePO4?", "Depinde de vehicul, alternator și bateria aleasă. În multe instalații moderne un DC-DC ajută la controlul curentului și al profilului de încărcare."],
      ["AGM mai are sens într-o autorulotă?", "Da, în sisteme simple sau cu utilizare redusă poate rămâne o opțiune rezonabilă dacă masa, capacitatea utilă și încărcarea sunt acceptabile."],
    ]),
  }),

  "/ro/ghiduri/regulator-mppt-autorulota/": Object.freeze({
    title: "Cum alegi regulatorul MPPT pentru autorulotă",
    description: "Alege regulatorul MPPT după puterea panourilor, curentul de încărcare, Voc, Isc, tensiunea bateriei și configurația serie/paralel.",
    body: `
<section data-ro-search-growth="regulator-mppt-autorulota">
  <h2>Un regulator de „30 A” nu este definit doar de cei 30 A</h2>
  <p>La un MPPT trebuie verificate separat partea fotovoltaică și partea bateriei: tensiunea maximă PV, curentul sau puterea admisă de la panouri și curentul maxim de încărcare spre baterie.</p>
  <p>MyPowerSetup estimează curentul de ieșire prin <strong>putere solară ÷ tensiunea bateriei × 1,25</strong> și rotunjește în sus. De exemplu, 400 W pe un sistem de 12 V înseamnă aproximativ 41,7 A după marjă, deci un regulator de 30 A ar fi prea mic pentru această ipoteză.</p>

  <h2>Voc este limita care nu trebuie depășită</h2>
  <p>Tensiunea în gol a panourilor crește când temperatura celulelor scade. Dacă panourile sunt legate în serie, Voc se adună. Configurația trebuie să rămână sub tensiunea maximă PV admisă de regulator chiar și în condiții reci.</p>
  <p>Pentru verificarea finală folosește fișa tehnică a panourilor și manualul regulatorului. Documentația <a href="https://www.victronenergy.ro/solar-charge-controllers" rel="external noopener">producătorilor de regulatoare MPPT</a> oferă limitele de tensiune, curent și putere pentru fiecare model.</p>

  <h2>Serie sau paralel?</h2>
  <ul>
    <li><strong>Serie:</strong> tensiunile se adună, curentul rămâne aproximativ cel al unui șir.</li>
    <li><strong>Paralel:</strong> curenții se adună, tensiunea rămâne aproximativ cea a unui panou sau șir.</li>
  </ul>
  <p>Alegerea depinde de panouri, cabluri, umbrire și limitele regulatorului. Nu există o configurație universal mai bună.</p>

  <h2>MPPT-ul trebuie să fie compatibil și cu bateria</h2>
  <p>Confirmă că regulatorul are un profil potrivit chimiei bateriei și că tensiunile de absorbție/menținere sunt conforme cu instrucțiunile bateriei. Pentru LiFePO₄, verifică și modul în care sistemul gestionează temperaturile joase și semnalele BMS dacă sunt disponibile.</p>
</section>`,
    faq: Object.freeze([
      ["Ce MPPT îmi trebuie pentru 400 W de panouri la 12 V?", "Ca estimare de curent, 400 W ÷ 12 V × 1,25 înseamnă aproximativ 42 A. Alegerea finală trebuie să verifice și Voc, Isc și limitele exacte ale producătorului."],
      ["Pot depăși tensiunea PV maximă a MPPT-ului pentru scurt timp?", "Nu este o practică sigură. Configurația panourilor trebuie proiectată astfel încât Voc să rămână sub limita regulatorului inclusiv în condiții reci."],
      ["MPPT-ul pentru AGM funcționează automat și cu LiFePO4?", "Nu presupune asta. Verifică dacă regulatorul oferă profilul și tensiunile cerute de bateria LiFePO4 reală."],
    ]),
  }),

  "/ro/ghiduri/invertor-autorulota-putere/": Object.freeze({
    title: "Ce putere de invertor este necesară într-o autorulotă?",
    description: "Dimensionează invertorul autorulotei după sarcinile AC simultane, vârful de pornire, sinus pur, tensiunea bateriei și curentul DC.",
    body: `
<section data-ro-search-growth="invertor-autorulota-putere">
  <h2>Invertorul se alege după sarcina reală, nu după cel mai mare număr de pe cutie</h2>
  <p>Puterea continuă trebuie să acopere consumatorii de 230 V care pot funcționa simultan, iar puterea de vârf trebuie să suporte pornirea echipamentelor cu motor sau compresor. Un invertor mult supradimensionat nu rezolvă o baterie sau o cablare insuficientă.</p>
  <p>MyPowerSetup aplică o marjă de 25% peste sarcina AC simultană estimată și compară rezultatul cu cel mai mare vârf de pornire declarat. Apoi rotunjește în sus la o treaptă practică de putere.</p>

  <h2>Exemplu: 1 500 W la 12 V înseamnă curent mare pe partea DC</h2>
  <p>Chiar înainte de pierderi, 1 500 W ÷ 12 V înseamnă aproximativ 125 A. La 24 V ar fi aproximativ 62,5 A. În realitate, invertorul nu are eficiență de 100%, deci curentul din baterie va fi mai mare.</p>
  <p>De aceea puterea invertorului, tensiunea sistemului, BMS-ul, siguranța și secțiunea cablurilor trebuie dimensionate împreună.</p>

  <h2>Sinus pur sau sinus modificat?</h2>
  <p>Pentru o recomandare conservatoare, MyPowerSetup preferă invertoare cu undă sinusoidală pură atunci când există dovezi clare în specificații. Unele aparate pot funcționa pe sinus modificat, dar motoarele, electronica sensibilă, încărcătoarele și echipamentele audio pot avea probleme sau funcționa mai puțin eficient.</p>

  <h2>Greșeli frecvente</h2>
  <ul>
    <li>folosirea puterii de vârf din reclamă ca și cum ar fi putere continuă;</li>
    <li>ignorarea curentului maxim al BMS-ului;</li>
    <li>cabluri prea lungi sau prea subțiri pe partea de 12 V;</li>
    <li>montarea invertorului departe de baterie fără recalcularea căderii de tensiune;</li>
    <li>dimensionarea invertorului fără a verifica ce consumatori chiar funcționează simultan.</li>
  </ul>
</section>`,
    faq: Object.freeze([
      ["Ce invertor îmi trebuie pentru un aparat de 1 000 W?", "Nu te uita doar la cei 1 000 W. Verifică sarcinile care funcționează simultan, vârful de pornire și adaugă o marjă rezonabilă."],
      ["Un invertor de 3 000 W este mai bun decât unul de 1 500 W?", "Doar dacă instalația și consumatorii au nevoie de acea putere. Un invertor mai mare cere de obicei curenți DC mai mari și poate necesita baterie, BMS, cabluri și protecții mai robuste."],
      ["Merită sinus pur în autorulotă?", "Este alegerea conservatoare pentru electronice și sarcini sensibile. Verifică întotdeauna cerințele aparatelor pe care vrei să le alimentezi."],
    ]),
  }),
  "/ro/ghiduri/incarcator-dc-dc-autorulota/": Object.freeze({
    title: "Cum alegi încărcătorul DC-DC pentru autorulotă?",
    description: "Alege încărcătorul DC-DC după bateria auxiliară, alternator, timpul de condus, sistemul 12/24 V și comportamentul alternatorului inteligent.",
    body: `
<section data-ro-search-growth="incarcator-dc-dc-autorulota">
  <h2>Răspuns scurt: curentul este limitat de baterie și alternator</h2>
  <p>Un încărcător DC-DC controlează energia transferată de la bateria de pornire și alternator către bateria de servicii. Nu alege 30 A, 40 A sau 50 A doar după capacitatea în Ah. Verifică <strong>curentul de încărcare acceptat de baterie și BMS, rezerva reală a alternatorului și energia pe care vrei să o recuperezi în orele de condus</strong>.</p>
  <p>La aproximativ 14 V, 30 A înseamnă ordinul a 400–450 W, iar 50 A aproximativ 700 W. În două ore ar putea fi transferați circa 0,8 kWh, respectiv 1,4 kWh înainte de pierderi și limitări. Temperatura, tensiunea de intrare, starea bateriei și reducerea automată a puterii pot micșora rezultatul.</p>

  <h2>Alternator inteligent și vehicule Euro 6</h2>
  <p>Un alternator controlat de ECU poate varia tensiunea sau se poate opri temporar în mers. Manualul oficial <a href="https://www.victronenergy.com/upload/documents/Orion_XS_12-12-70A_DC-DC_Battery_Charger/124067-Orion_XS_DC-DC_battery_charger-pdf-en.pdf" rel="external noopener">Victron Orion XS</a> descrie valori variabile de aproximativ 12,5–15 V și situații Euro 6 în care detecția implicită a motorului trebuie verificată pentru vehiculul concret.</p>
  <p>Confirmă dacă instalația folosește detecția tensiunii, un semnal de contact sau o comandă externă. O configurare forțată greșită poate consuma bateria de pornire când motorul este oprit.</p>

  <h2>LiFePO₄ și protecția alternatorului</h2>
  <p>Bateriile cu litiu pot accepta curent mare datorită rezistenței interne reduse. Documentația <a href="https://www.victronenergy.com/upload/documents/Orion-Tr_Smart_DC-DC_Charger_-_Isolated/34439-Orion-Tr_Smart_DC-DC_Charger-pdf-en.pdf" rel="external noopener">Orion-Tr Smart</a> explică rolul încărcării controlate pentru protecția alternatorului și pentru aplicarea unui profil de încărcare în trepte. Limita BMS-ului, temperatura și curentul continuu al încărcătorului rămân obligatorii.</p>

  <h2>Exemplu: vrei să recuperezi 900 Wh</h2>
  <p>Pentru 900 Wh în trei ore de condus ai nevoie de aproximativ 300 W utili în medie. Un DC-DC de 30 A la 12 V poate fi în zona corectă dacă alternatorul și bateria îl permit. Dacă ai doar o oră de condus, un model mai puternic nu devine automat sigur: verifică alternatorul, bateria, cablurile și disiparea termică.</p>
  <p>La conversia 12→24 V, curentul de intrare de pe partea alternatorului este mai mare decât curentul de ieșire spre bateria de 24 V. Dimensionează separat ambele trasee.</p>

  <h2>Checklist înainte de cumpărare</h2>
  <ul>
    <li>tensiunea corectă de intrare și ieșire;</li>
    <li>curentul continuu la temperatura reală de montaj;</li>
    <li>curentul maxim de încărcare permis de baterie și BMS;</li>
    <li>rezerva alternatorului după consumatorii originali ai vehiculului;</li>
    <li>compatibilitatea cu alternatorul inteligent și metoda de activare;</li>
    <li>profilul LiFePO₄, AGM sau plumb necesar;</li>
    <li>versiune izolată sau neizolată conform arhitecturii;</li>
    <li>siguranțe și cabluri pe ambele părți, calculate după curent, lungime și cădere de tensiune;</li>
    <li>ventilație, temperatură și protecția locului de montaj.</li>
  </ul>
  <p>Nu copia secțiunea cablului sau valoarea siguranței din altă autorulotă. Respectă manualul produsului și verifică instalația reală.</p>
</section>`,
    faq: Object.freeze([
      ["Ce curent DC-DC este potrivit pentru o baterie LiFePO4 de 100 Ah?", "Depinde de limita bateriei și BMS-ului, alternator, timpul de condus, temperatură și cabluri. Capacitatea de 100 Ah singură nu stabilește curentul corect."],
      ["Am nevoie de DC-DC pentru un alternator inteligent?", "Este frecvent soluția controlată, dar trebuie verificată strategia vehiculului și metoda de detecție sau activare recomandată de producător."],
      ["Pot conecta direct bateria LiFePO4 la alternator?", "Nu presupune că este sigur. Curentul necontrolat poate solicita alternatorul, iar bateria are nevoie de un profil de încărcare compatibil."],
    ]),
  }),

});

function schemaFor(route, item) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: item.title,
        description: item.description,
        mainEntityOfPage: `https://mypowersetup.com${route}`,
        inLanguage: "ro-RO",
        publisher: { "@type": "Organization", name: "MyPowerSetup", url: "https://mypowersetup.com/" },
      },
      {
        "@type": "FAQPage",
        mainEntity: item.faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}

export function romanianGrowthContent(route) {
  return RO_GROWTH_CONTENT[route] || null;
}

export function enhanceRomaniaSearchContent(html, market, route) {
  if (market !== "ro" || typeof html !== "string") return html;
  const item = romanianGrowthContent(route);
  if (!item || html.includes("data-ro-search-growth=")) return html;
  if (!html.includes('<aside class="cta">') || !html.includes("</head>")) return html;

  const schema = `<script type="application/ld+json" data-ro-search-growth-schema>${JSON.stringify(schemaFor(route, item))}</script>`;
  let output = html.replace("</head>", `${schema}</head>`);
  output = output.replace('<aside class="cta">', `${item.body}<aside class="cta">`);
  return output;
}
