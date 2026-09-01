const CONTENT = Object.freeze({
  pt: Object.freeze({
    route: "/pt/guias/power-station-ou-instalacao-fixa-autocaravana/",
    locale: "pt-PT",
    marker: "power-station-ou-instalacao-fixa-autocaravana",
    title: "Power station ou instalação fixa na autocaravana?",
    description: "Compara power station portátil e instalação fixa por Wh, potência, solar, saída 12 V, carregamento e expansão antes de comprar.",
    faqTitle: "Perguntas frequentes",
    body: `
<h2>Resposta rápida</h2>
<p>Uma <strong>power station</strong> é normalmente a escolha mais simples para utilização ocasional, consumos moderados e equipamento que queres retirar da autocaravana. Uma <strong>instalação fixa</strong> costuma ser mais adequada quando dependes diariamente de frigorífico, bomba, iluminação, portátil, inversor potente ou carregamento frequente por solar e alternador.</p>
<p>Não decidas apenas pelos Wh anunciados. A opção tem de cumprir simultaneamente energia diária, potência AC contínua e de pico, corrente disponível a 12 V, entrada solar e velocidade de recarga. A <a href="/pt/#calculator-preview">calculadora para autocaravanas</a> transforma primeiro o teu uso nesses requisitos.</p>

<h2>Capacidade e potência são limites diferentes</h2>
<p>A capacidade em Wh indica durante quanto tempo a energia pode durar. A potência em W indica o que pode funcionar naquele momento. Uma estação de 2 000 Wh não alimenta necessariamente uma máquina de café de 1 400 W: o inversor tem de suportar a potência contínua, o pico de arranque e a forma de onda exigida.</p>
<p>Exemplo: 800 Wh/dia durante dois dias representam 1 600 Wh úteis antes de reserva e perdas. A capacidade nominal não é toda entregue às tomadas, porque existem limites de descarga e conversão. Numa instalação fixa, aplica a mesma disciplina à bateria e confirma o inversor no <a href="/pt/guias/inversor-autocaravana-potencia/">guia de potência e picos</a>.</p>

<h2>O limite de 12 V pode decidir a compra</h2>
<p>Frigoríficos, bombas e outros equipamentos DC não usam a saída AC. Confirma a tensão, a corrente contínua e a corrente de pico da tomada 12 V. Uma saída de 10 A fornece aproximadamente 120 W a 12 V; isso pode ser insuficiente para dois consumidores em simultâneo mesmo quando a estação tem muita capacidade e um inversor AC potente.</p>
<p>Numa instalação fixa, os circuitos DC podem ser distribuídos a partir da bateria com cabos e proteções próprios. Essa flexibilidade exige projeto: consulta o <a href="/pt/guias/cabos-fusiveis-12v-autocaravana/">guia de cabos e fusíveis</a> e nunca alimentes a instalação do veículo através de uma tomada de saída improvisada.</p>

<h2>Solar: verifica W, V e A</h2>
<p>“Aceita solar” não prova compatibilidade. Confirma potência máxima, intervalo de tensão MPPT, corrente permitida e conectores. Os painéis ligados em série aumentam tensão; em paralelo aumentam corrente. O manual da estação tem prioridade sobre qualquer regra genérica. Os fabricantes também exigem que a tensão de entrada permaneça dentro do intervalo seguro.</p>
<p>Uma instalação fixa permite escolher painéis e <a href="/pt/guias/como-escolher-controlador-mppt/">controlador MPPT</a> separadamente e expandir cada parte dentro dos limites elétricos. Em ambos os casos, mede o tejadilho e dimensiona Wp a partir dos Wh/dia e da época do ano.</p>
<p>Como fontes primárias, consulta o <a href="https://manuals.ecoflow.com/eu/product/delta-3-plus?lang=en_US">manual do modelo portátil</a> para entradas, saídas e condições de operação, e um <a href="https://www.victronenergy.com/upload/documents/Van-Motorhome-Manual-%26-Drawing-3-monitoring-setups-MultiPlus-3kVA-12V-230V-50Hz-Li-SuperPack-NG.pdf">esquema oficial de sistema fixo para autocaravana</a> para perceber como bateria, proteções, distribuição e carregadores formam um conjunto. Usa sempre a documentação dos componentes realmente escolhidos.</p>

<h2>Como vais recuperar a energia?</h2>
<p>Compara o tempo real de carregamento por 230 V, solar e veículo. Uma tomada 12 V do automóvel pode repor energia muito mais lentamente do que a potência AC máxima sugere. Uma instalação fixa pode usar um <a href="/pt/guias/carregador-dc-dc-autocaravana/">carregador DC-DC</a> dimensionado para alternador e bateria, além de MPPT e <a href="/pt/guias/carregador-230v-bateria-autocaravana/">carregador de 230 V</a>.</p>
<p>Não somes cegamente as potências máximas de todas as entradas. Confirma no manual quais podem funcionar em simultâneo, os limites térmicos e a redução de corrente perto da carga completa.</p>

<h2>Três decisões típicas</h2>
<ul>
  <li><strong>Fins de semana e equipamento portátil:</strong> a power station pode reduzir montagem e ser usada fora da autocaravana.</li>
  <li><strong>Viagens longas com consumos DC permanentes:</strong> a instalação fixa oferece distribuição, carregamento e expansão mais integrados.</li>
  <li><strong>Ainda não conheces o uso real:</strong> mede primeiro durante algumas viagens e evita comprar um sistema grande apenas por precaução.</li>
</ul>

<h2>Checklist antes de escolher</h2>
<ul>
  <li>Wh/dia e dias de autonomia;</li>
  <li>potência AC contínua, pico e onda sinusoidal;</li>
  <li>saída 12 V contínua e de pico;</li>
  <li>limites PV em W, V e A;</li>
  <li>tempo de carga por rede, solar e veículo;</li>
  <li>peso, ventilação, ruído, temperatura e garantia;</li>
  <li>possibilidade e custo de expansão;</li>
  <li>proteções e instalação segura de todos os circuitos.</li>
</ul>
<p>Calcula o teu cenário e compara apenas produtos que cubram todos os limites. O MyPowerSetup mostra uma ligação de compra só quando a página exata e as especificações críticas estão verificadas.</p>`,
    faq: Object.freeze([
      ["Uma power station pode alimentar diretamente a instalação 12 V da autocaravana?", "Só através de uma ligação prevista e dimensionada para esse fim. Não uses uma tomada ou cabo improvisado para alimentar circuitos ao contrário; confirma corrente, fusível, polaridade e instruções dos fabricantes."],
      ["Quantos Wh deve ter a power station?", "Parte dos Wh consumidos por dia, multiplica pelos dias sem carregamento e acrescenta reserva para perdas e uso real. Depois verifica separadamente potência AC, saída 12 V e recarga."],
      ["Posso ligar qualquer painel solar?", "Não. A tensão de circuito aberto, corrente, potência e conectores do conjunto têm de ficar dentro dos limites de entrada publicados para o modelo concreto."],
    ]),
  }),
  ro: Object.freeze({
    route: "/ro/ghiduri/statie-portabila-sau-instalatie-fixa-autorulota/",
    locale: "ro-RO",
    marker: "statie-portabila-sau-instalatie-fixa-autorulota",
    title: "Stație portabilă sau instalație fixă în autorulotă?",
    description: "Compară stația portabilă și instalația fixă după Wh, putere, solar, ieșire 12 V, încărcare și extindere înainte de cumpărare.",
    faqTitle: "Întrebări frecvente",
    body: `
<h2>Răspuns pe scurt</h2>
<p>O <strong>stație portabilă</strong> este de obicei mai simplă pentru ieșiri ocazionale, consum moderat și echipament pe care vrei să îl folosești și în afara autorulotei. O <strong>instalație fixă</strong> devine mai potrivită când te bazezi zilnic pe frigider, pompă, iluminat, laptop, invertor puternic ori încărcare constantă din solar și alternator.</p>
<p>Nu alege doar după valoarea Wh din reclamă. Soluția trebuie să acopere simultan energia zilnică, puterea AC continuă și de vârf, curentul disponibil la 12 V, intrarea solară și viteza de reîncărcare. <a href="/ro/#calculator-preview">Calculatorul pentru autorulotă</a> transformă modul tău de utilizare în aceste cerințe.</p>

<h2>Capacitatea și puterea răspund la întrebări diferite</h2>
<p>Capacitatea în Wh arată cât timp poate dura energia. Puterea în W arată ce poate funcționa în acel moment. O stație de 2.000 Wh nu alimentează automat un espressor de 1.400 W: invertorul trebuie să suporte puterea continuă, vârful de pornire și forma de undă necesară.</p>
<p>Exemplu: 800 Wh/zi pentru două zile înseamnă 1.600 Wh utili înainte de rezervă și pierderi. Capacitatea nominală nu ajunge integral la prize din cauza limitelor de descărcare și conversie. Pentru o instalație fixă aplică aceeași disciplină bateriei și verifică invertorul în <a href="/ro/ghiduri/invertor-autorulota-putere/">ghidul de dimensionare</a>.</p>

<h2>Ieșirea de 12 V poate fi adevăratul blocaj</h2>
<p>Frigiderul, pompa și alți consumatori DC nu folosesc invertorul AC. Verifică tensiunea, curentul continuu și vârful prizei de 12 V. O ieșire de 10 A furnizează aproximativ 120 W la 12 V; poate fi insuficientă pentru doi consumatori simultan, chiar dacă stația are capacitate mare și invertor AC puternic.</p>
<p>În instalația fixă, circuitele DC pot pleca din baterie prin distribuție, cabluri și siguranțe dedicate. Flexibilitatea cere proiectare corectă: folosește <a href="/ro/ghiduri/cabluri-sigurante-12v-autorulota/">ghidul pentru cabluri și protecții</a> și nu alimenta instalația vehiculului printr-o ieșire improvizată.</p>

<h2>Solar: verifică W, V și A</h2>
<p>Mențiunea „acceptă panouri solare” nu dovedește compatibilitatea. Verifică puterea maximă, intervalul de tensiune MPPT, curentul admis și conectorii. Legarea în serie crește tensiunea, iar legarea în paralel crește curentul. Manualul modelului are prioritate, iar tensiunea de intrare trebuie să rămână în intervalul sigur publicat.</p>
<p>O instalație fixă permite alegerea separată a panourilor și a <a href="/ro/ghiduri/regulator-mppt-autorulota/">regulatorului MPPT</a>, apoi extinderea fiecărei părți în limitele electrice. În ambele cazuri măsoară plafonul și dimensionează Wp din Wh/zi și sezon.</p>
<p>Ca surse primare, verifică <a href="https://manuals.ecoflow.com/eu/product/delta-3-plus?lang=en_US">manualul modelului portabil</a> pentru intrări, ieșiri și condițiile de funcționare, iar pentru arhitectura fixă consultă o <a href="https://www.victronenergy.com/upload/documents/Van-Motorhome-Manual-%26-Drawing-3-monitoring-setups-MultiPlus-3kVA-12V-230V-50Hz-Li-SuperPack-NG.pdf">schemă oficială de autorulotă</a> care tratează bateria, protecțiile, distribuția și încărcătoarele ca un sistem. Documentația componentelor alese are întotdeauna prioritate.</p>

<h2>Cum refaci energia consumată?</h2>
<p>Compară timpul real de încărcare la 230 V, din solar și din vehicul. Priza de 12 V a mașinii poate încărca mult mai lent decât sugerează puterea maximă AC. Instalația fixă poate folosi un <a href="/ro/ghiduri/incarcator-dc-dc-autorulota/">încărcător DC-DC</a> potrivit alternatorului și bateriei, împreună cu MPPT și <a href="/ro/ghiduri/incarcator-230v-baterie-autorulota/">încărcător de rețea</a>.</p>
<p>Nu aduna automat puterile maxime ale tuturor intrărilor. Manualul trebuie să confirme ce intrări pot funcționa simultan, limitele termice și reducerea curentului aproape de încărcarea completă.</p>

<h2>Trei situații tipice</h2>
<ul>
  <li><strong>Weekend și utilizare portabilă:</strong> stația poate reduce munca de montaj și poate fi scoasă din autorulotă.</li>
  <li><strong>Călătorii lungi cu sarcini DC permanente:</strong> instalația fixă integrează mai bine distribuția, încărcarea și extinderea.</li>
  <li><strong>Nu cunoști încă consumul:</strong> măsoară câteva călătorii înainte să cumperi preventiv un sistem supradimensionat.</li>
</ul>

<h2>Checklist înainte de alegere</h2>
<ul>
  <li>Wh/zi și zilele de autonomie;</li>
  <li>puterea AC continuă, vârful și sinusul;</li>
  <li>ieșirea 12 V continuă și de vârf;</li>
  <li>limitele PV în W, V și A;</li>
  <li>durata încărcării din rețea, solar și vehicul;</li>
  <li>masa, ventilația, zgomotul, temperatura și garanția;</li>
  <li>posibilitatea și costul extinderii;</li>
  <li>protecția și instalarea sigură a circuitelor.</li>
</ul>
<p>Calculează scenariul propriu și compară doar produse care acoperă toate limitele. MyPowerSetup afișează un link de cumpărare numai când pagina exactă și specificațiile critice sunt verificate.</p>`,
    faq: Object.freeze([
      ["Pot alimenta direct instalația de 12 V dintr-o stație portabilă?", "Numai printr-o conexiune prevăzută și dimensionată pentru acest scop. Nu folosi cabluri improvizate pentru alimentare inversă; verifică amperajul, siguranța, polaritatea și instrucțiunile producătorilor."],
      ["De câți Wh am nevoie?", "Calculează Wh consumați zilnic, înmulțește cu zilele fără încărcare și adaugă rezervă pentru pierderi și utilizare reală. Verifică separat puterea AC, ieșirea 12 V și reîncărcarea."],
      ["Pot conecta orice panou solar?", "Nu. Tensiunea în gol, curentul, puterea și conectorii ansamblului trebuie să se încadreze în limitele de intrare publicate pentru modelul concret."],
    ]),
  }),
  si: Object.freeze({
    route: "/si/vodici/prenosna-elektrarna-ali-fiksna-instalacija-avtodom/",
    locale: "sl-SI",
    marker: "prenosna-elektrarna-ali-fiksna-instalacija-avtodom",
    title: "Prenosna elektrarna ali fiksna instalacija v avtodomu?",
    description: "Primerjaj prenosno elektrarno in fiksno instalacijo po Wh, moči, solarnem vhodu, 12 V izhodu, polnjenju in razširitvi.",
    faqTitle: "Pogosta vprašanja",
    body: `
<h2>Kratek odgovor</h2>
<p><strong>Prenosna elektrarna</strong> je običajno preprostejša za občasne izlete, zmerno porabo in opremo, ki jo želiš uporabljati tudi zunaj avtodoma. <strong>Fiksna instalacija</strong> je primernejša, ko se vsak dan zanašaš na hladilnik, črpalko, luči, prenosnik, močan inverter ali redno polnjenje iz solarja in alternatorja.</p>
<p>Ne izbiraj samo po oglaševanih Wh. Rešitev mora hkrati pokriti dnevno energijo, stalno in konično AC moč, razpoložljivi tok pri 12 V, solarni vhod ter hitrost ponovnega polnjenja. <a href="/si/#calculator-preview">Kalkulator za avtodom</a> tvoj način uporabe najprej pretvori v te zahteve.</p>

<h2>Kapaciteta in moč nista ista omejitev</h2>
<p>Kapaciteta v Wh pove, kako dolgo lahko energija zdrži. Moč v W pove, kaj lahko deluje v danem trenutku. Elektrarna z 2.000 Wh ne napaja nujno kavnega aparata z močjo 1.400 W: inverter mora podpirati stalno moč, zagonsko konico in zahtevano obliko napetosti.</p>
<p>Primer: 800 Wh/dan za dva dni pomeni 1.600 Wh uporabne energije še pred rezervo in izgubami. Nazivna kapaciteta se zaradi praznjenja in pretvorbe ne dostavi v celoti do vtičnic. Pri fiksnem sistemu enako previdno dimenzioniraj baterijo in preveri <a href="/si/vodici/inverter-avtodom-moc/">moč inverterja</a>.</p>

<h2>12 V izhod je lahko pravo ozko grlo</h2>
<p>Hladilnik, črpalka in drugi DC porabniki ne uporabljajo AC inverterja. Preveri napetost ter stalni in konični tok 12 V vtičnice. Izhod 10 A zagotavlja približno 120 W pri 12 V; za dva sočasna porabnika je lahko prešibek, tudi če ima elektrarna veliko kapaciteto in zmogljiv AC inverter.</p>
<p>Pri fiksni instalaciji lahko DC tokokroge razdeliš neposredno iz baterije z lastnimi kabli in zaščito. Ta prilagodljivost zahteva pravilen načrt: uporabi <a href="/si/vodici/kabli-varovalke-12v-avtodom/">vodnik za kable in varovalke</a> in instalacije vozila ne napajaj prek improviziranega izhoda.</p>

<h2>Solar: preveri W, V in A</h2>
<p>Trditev »podpira solar« še ne pomeni združljivosti. Preveri največjo moč, napetostno območje MPPT, dovoljeni tok in priključke. Zaporedna vezava poveča napetost, vzporedna pa tok. Priročnik konkretnega modela ima prednost in vhodna napetost mora vedno ostati znotraj objavljenega varnega območja.</p>
<p>Fiksna instalacija omogoča ločeno izbiro panelov in <a href="/si/vodici/mppt-regulator-avtodom/">MPPT regulatorja</a> ter razširitev posameznih delov znotraj električnih omejitev. V obeh primerih izmeri streho in Wp določi iz Wh/dan ter letnega časa.</p>
<p>Kot primarna vira preveri <a href="https://manuals.ecoflow.com/eu/product/delta-3-plus?lang=en_US">priročnik konkretne prenosne elektrarne</a> za vhode, izhode in pogoje delovanja ter <a href="https://www.victronenergy.com/upload/documents/Van-Motorhome-Manual-%26-Drawing-3-monitoring-setups-MultiPlus-3kVA-12V-230V-50Hz-Li-SuperPack-NG.pdf">uradno shemo fiksnega sistema za avtodom</a>, kjer baterija, zaščita, distribucija in polnilniki tvorijo celoto. Vedno imajo prednost navodila dejansko izbranih komponent.</p>

<h2>Kako boš nadomestil porabljeno energijo?</h2>
<p>Primerjaj dejanski čas polnjenja iz 230 V, solarja in vozila. Avtomobilska 12 V vtičnica lahko polni veliko počasneje, kot nakazuje največja AC moč. Fiksna instalacija lahko uporabi <a href="/si/vodici/dc-dc-polnilnik-avtodom/">DC-DC polnilnik</a>, prilagojen alternatorju in bateriji, skupaj z MPPT in <a href="/si/vodici/230v-polnilnik-baterije-avtodom/">230 V polnilnikom</a>.</p>
<p>Največjih moči vseh vhodov ne seštevaj samodejno. Priročnik mora potrditi, kateri vhodi lahko delujejo hkrati, kakšne so temperaturne omejitve in kako se tok zmanjša blizu polne baterije.</p>

<h2>Trije značilni primeri</h2>
<ul>
  <li><strong>Vikendi in prenosna uporaba:</strong> elektrarna zmanjša obseg montaže in jo lahko odneseš iz avtodoma.</li>
  <li><strong>Dolge poti s stalnimi DC porabniki:</strong> fiksna instalacija bolje poveže distribucijo, polnjenje in razširitev.</li>
  <li><strong>Porabe še ne poznaš:</strong> najprej meri nekaj potovanj in ne kupuj velikega sistema samo za vsak primer.</li>
</ul>

<h2>Kontrolni seznam pred izbiro</h2>
<ul>
  <li>Wh/dan in dnevi avtonomije;</li>
  <li>stalna AC moč, konica in čisti sinus;</li>
  <li>stalni in konični 12 V izhod;</li>
  <li>PV omejitve v W, V in A;</li>
  <li>čas polnjenja iz omrežja, solarja in vozila;</li>
  <li>masa, prezračevanje, hrup, temperatura in garancija;</li>
  <li>možnost in strošek razširitve;</li>
  <li>zaščita in varna namestitev vseh tokokrogov.</li>
</ul>
<p>Izračunaj svoj scenarij in primerjaj samo izdelke, ki pokrijejo vse omejitve. MyPowerSetup prikaže nakupno povezavo le, ko so preverjeni točna stran izdelka in ključne specifikacije.</p>`,
    faq: Object.freeze([
      ["Lahko s prenosno elektrarno neposredno napajam 12 V instalacijo avtodoma?", "Samo prek povezave, ki je načrtovana in dimenzionirana za ta namen. Ne uporabljaj improviziranih kablov za povratno napajanje; preveri tok, varovalko, polariteto in navodila proizvajalcev."],
      ["Koliko Wh naj ima prenosna elektrarna?", "Začni z Wh na dan, pomnoži z dnevi brez polnjenja in dodaj rezervo za izgube ter dejansko uporabo. Nato ločeno preveri AC moč, 12 V izhod in ponovno polnjenje."],
      ["Lahko priključim katerikoli solarni panel?", "Ne. Napetost odprtega kroga, tok, moč in priključki celotnega polja morajo ostati znotraj objavljenih vhodnih omejitev konkretnega modela."],
    ]),
  }),
});

function faqHtml(entry) {
  return `<section class="related" data-power-station-faq><h2>${entry.faqTitle}</h2>${entry.faq.map(([question, answer]) => `<h3>${question}</h3><p>${answer}</p>`).join("")}</section>`;
}

function schema(entry) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: entry.title, description: entry.description, mainEntityOfPage: `https://mypowersetup.com${entry.route}`, inLanguage: entry.locale, publisher: { "@type": "Organization", name: "MyPowerSetup", url: "https://mypowersetup.com/" } },
      { "@type": "FAQPage", mainEntity: entry.faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  }).replace(/</g, "\\u003c");
}

export function enhanceExpansionPowerStationContent(html, market, route) {
  const entry = CONTENT[market];
  if (!entry || entry.route !== route || typeof html !== "string") return html;
  if (html.includes("data-power-station-growth=")) return html;
  if (!html.includes('<aside class="cta">') || !html.includes("</head>")) return html;
  const body = `<section data-power-station-growth="${entry.marker}">${entry.body}</section>${faqHtml(entry)}`;
  return html
    .replace('<aside class="cta">', `${body}<aside class="cta">`)
    .replace("</head>", `<script type="application/ld+json" data-power-station-schema>${schema(entry)}</script></head>`);
}

export const EXPANSION_POWER_STATION_ROUTES = Object.freeze(Object.fromEntries(Object.entries(CONTENT).map(([market, entry]) => [market, entry.route])));
