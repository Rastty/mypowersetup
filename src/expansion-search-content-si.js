const SI_GROWTH_CONTENT = Object.freeze({
  "/si/vodici/kapaciteta-baterije-avtodom/": Object.freeze({
    title: "Kakšno kapaciteto baterije potrebuje avtodom?",
    description: "Izračun baterije za avtodom v Wh in Ah glede na dnevno porabo, avtonomijo, LiFePO4 ali AGM ter 12/24 V sistem.",
    body: `
<section data-si-search-growth="kapaciteta-baterije-avtodom">
  <h2>Kratek odgovor: najprej izračunaj Wh na dan</h2>
  <p>Oznaka 100 Ah sama ne pove, ali bo baterija zadostovala. Najprej seštej dnevno energijo vseh porabnikov, nato upoštevaj dneve brez polnjenja, varnostno rezervo, uporabni delež baterije in sistemsko napetost.</p>
  <p>MyPowerSetup za dimenzioniranje uporablja približek <strong>nazivna energija baterije ≈ dnevna poraba × dnevi avtonomije × 1,15 ÷ uporabni delež</strong>. V modelu je uporabni delež 80 % za LiFePO₄ in 50 % za AGM/svinčeno baterijo. Končne omejitve vedno določa podatkovni list konkretne baterije in BMS.</p>
  <h2>Primer: 830 Wh/dan in dva dneva avtonomije</h2>
  <p>Hladilnik 450 Wh, prenosnik 260 Wh, luči 90 Wh in črpalka 30 Wh skupaj pomenijo 830 Wh/dan.</p>
  <ul><li><strong>LiFePO₄:</strong> 830 × 2 × 1,15 ÷ 0,80 ≈ 2.386 Wh, zato kalkulator zaokroži približno na 2.400 Wh.</li><li><strong>AGM:</strong> 830 × 2 × 1,15 ÷ 0,50 ≈ 3.818 Wh, zato kalkulator zaokroži približno na 3.900 Wh.</li></ul>
  <p>Pri 12 V je 2.400 Wh približno 200 Ah, pri 24 V pa približno 100 Ah. Zato Ah vedno primerjaj skupaj z napetostjo.</p>
  <h2>Kdaj razmišljati o 24 V</h2>
  <p>Pri isti moči 24 V približno prepolovi tok glede na 12 V. To je uporabno pri večjih baterijah in močnejših inverterjih, ker zmanjša zahteve glede toka in izgub. Samodejni način MyPowerSetup preklopi na 24 V pri izračunani bateriji nad 2.400 Wh ali inverterju nad 1.200 W.</p>
  <h2>Pred nakupom preveri</h2>
  <ul><li>dejansko porabo v Wh/dan;</li><li>največji neprekinjeni tok BMS;</li><li>dovoljeni polnilni tok in temperaturne omejitve;</li><li>združljivost z MPPT, DC-DC in 230 V polnilnikom;</li><li>mere, maso, priključke in prostor za vgradnjo.</li></ul>
</section>`,
    faq: Object.freeze([
      ["Koliko Ah baterije potrebujem v avtodomu?", "Ni univerzalnega števila. Najprej izračunaj Wh na dan, avtonomijo, kemijo baterije in napetost sistema, šele nato pretvori rezultat v Ah."],
      ["Ali je 200 Ah pri 12 V enako kot 200 Ah pri 24 V?", "Ne. Pri 24 V ima 200 Ah približno dvakrat več nazivno shranjene energije kot pri 12 V."],
      ["Lahko AGM preprosto zamenjam z LiFePO4?", "Ne vedno. Preveriti je treba BMS, alternator oziroma DC-DC, MPPT, 230 V polnilnik, kable in polnilne napetosti."],
    ]),
  }),
  "/si/vodici/koliko-soncnih-panelov-avtodom/": Object.freeze({
    title: "Koliko sončnih panelov potrebuje avtodom?",
    description: "Izračun potrebne solarne moči avtodoma iz Wh/dan, sezone, izgub, prostora na strehi ter omejitev MPPT regulatorja.",
    body: `
<section data-si-search-growth="koliko-soncnih-panelov-avtodom">
  <h2>Wp izhaja iz porabe, ne iz občutka</h2>
  <p>Vprašanje, ali je 200 W dovolj, nima dobrega odgovora brez dnevne porabe. MyPowerSetup dnevne Wh deli z uporabnimi sončnimi urami, upošteva 75 % skupno učinkovitost sistema in doda 15 % rezerve.</p>
  <p>Načrtovalni približek je <strong>Wp ≈ Wh/dan × 1,15 ÷ (ekvivalentne sončne ure × 0,75)</strong>.</p>
  <h2>Primer za 900 Wh porabe na dan</h2>
  <ul><li><strong>Poletje, 4,5 h:</strong> približno 307 W → kalkulator zaokroži okoli 350 Wp.</li><li><strong>Pomlad/jesen, 3 h:</strong> približno 460 W → okoli 500 Wp.</li><li><strong>Zima, 1,5 h:</strong> približno 920 W → okoli 950 Wp.</li></ul>
  <p>Sezonske vrednosti v kalkulatorju so splošne predpostavke. Za konkreten kraj in mesec preveri rezultat tudi v <a href="https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en" rel="external noopener">PVGIS Evropske komisije</a>.</p>
  <h2>Streha je pogosto dejanska omejitev</h2>
  <p>Izmeri uporabno površino med strešnimi okni, klimo, antenami in nosilci. Delna senca lahko močno zmanjša proizvodnjo. Če izračunana moč ne gre na streho, je bolj smiselno zmanjšati porabo ali kombinirati solar z DC-DC polnjenjem in 230 V kot pa predpostaviti, da bo manjši panel proizvedel enako energijo.</p>
  <h2>Panele in MPPT preveri skupaj</h2>
  <p>Vezava v serijo zvišuje napetost, vzporedna vezava pa tok. Pred nakupom preveri Voc, Isc, temperaturni vpliv in največjo dovoljeno PV napetost regulatorja.</p>
</section>`,
    faq: Object.freeze([
      ["Je 200 W solarja dovolj za avtodom?", "Lahko je dovolj pri majhni porabi in dobrih poletnih pogojih, vendar je pravilen odgovor odvisen od Wh/dan, sezone, lokacije in senčenja."],
      ["Ali lahko za zimo uporabim isti solarni izračun kot za poletje?", "Ne. Razpoložljiva sončna energija se po sezonah zelo spreminja, zato mora biti zimski scenarij bistveno bolj konservativen."],
      ["Najprej izberem panele ali MPPT?", "Najprej oceni potrebno Wp, nato pa končno konfiguracijo panelov in MPPT preveri skupaj glede na Wp, Voc, Isc in napetost baterije."],
    ]),
  }),
  "/si/vodici/lifepo4-ali-agm-avtodom/": Object.freeze({
    title: "LiFePO4 ali AGM za avtodom?",
    description: "Primerjava LiFePO4 in AGM baterij za avtodom glede uporabne energije, mase, polnjenja, BMS in združljivosti obstoječega sistema.",
    body: `
<section data-si-search-growth="lifepo4-ali-agm-avtodom">
  <h2>Primerjaj uporabno energijo, ne samo Ah</h2>
  <p>Dve 100 Ah bateriji ne pomenita nujno enake praktične avtonomije. Pri dimenzioniranju so pomembni napetost, nazivna energija, načrtovan uporabni delež in združljivost polnilnega sistema.</p>
  <p>MyPowerSetup uporablja konservativno predpostavko 80 % uporabne kapacitete za LiFePO₄ in 50 % za AGM. Specifikacija konkretne baterije ima vedno prednost.</p>
  <h2>Isti scenarij lahko zahteva zelo različno nazivno kapaciteto</h2>
  <p>Pri 830 Wh/dan, dveh dneh avtonomije in 15 % rezervi model oceni približno 2,4 kWh LiFePO₄ oziroma 3,9 kWh AGM. Razlika se nato pokaže tudi v masi in prostoru.</p>
  <h2>Prehod na LiFePO4 ni nujno samo zamenjava baterije</h2>
  <p>Preveri alternator oziroma DC-DC, solarni regulator, 230 V polnilnik, največji polnilni tok in BMS. Posebej preveri polnjenje pri nizkih temperaturah; nekatere LiFePO₄ baterije potrebujejo blokado polnjenja pod določeno temperaturo.</p>
  <h2>Kdaj je AGM še smiselna izbira</h2>
  <p>AGM je lahko smiselna pri majhnem, občasno uporabljenem in že združljivem sistemu, kjer sta nižja začetna cena in preprostost pomembnejši od mase ter večje uporabne energije.</p>
</section>`,
    faq: Object.freeze([
      ["Ali LiFePO4 pri enakih Ah zagotovi več uporabne energije kot AGM?", "Običajno da, vendar je dejanski uporabni delež odvisen od konkretne baterije in omejitev BMS."],
      ["Ali pri prehodu na LiFePO4 potrebujem DC-DC?", "Odvisno od vozila, alternatorja in baterije. Pri sodobnih vozilih DC-DC pogosto omogoči bolj nadzorovan tok in ustrezen polnilni profil."],
      ["Je AGM še primerna za avtodom?", "Da. Pri preprostih in manj pogosto uporabljenih sistemih je lahko še vedno razumna izbira, če ustrezajo masa, uporabna energija in način polnjenja."],
    ]),
  }),
  "/si/vodici/mppt-regulator-avtodom/": Object.freeze({
    title: "Kako izbrati MPPT regulator za avtodom?",
    description: "Dimenzioniranje MPPT regulatorja po moči panelov, toku polnjenja, Voc, Isc, napetosti baterije ter serijski ali vzporedni vezavi.",
    body: `
<section data-si-search-growth="mppt-regulator-avtodom">
  <h2>Oznaka 30 A ni dovolj za pravilno izbiro</h2>
  <p>MPPT mora ustrezati tako PV strani kot bateriji. Preveriti je treba največjo PV napetost, dovoljeno moč oziroma tok panelov in največji polnilni tok proti bateriji.</p>
  <p>MyPowerSetup izhodni tok ocenjuje kot <strong>solarna moč ÷ napetost baterije × 1,25</strong>. Pri 400 W in 12 V je to približno 41,7 A, zato bi bil 30 A regulator za to načrtovalno predpostavko premajhen.</p>
  <h2>Voc mora ostati pod dovoljeno mejo</h2>
  <p>Napetost odprtega kroga panelov pri nižjih temperaturah naraste. Pri serijski vezavi se Voc sešteva, zato mora konfiguracija ostati pod največjo PV napetostjo regulatorja tudi v hladnih pogojih.</p>
  <p>Končno konfiguracijo preveri v podatkovnih listih panelov in regulatorja. <a href="https://www.victronenergy.si/solar-charge-controllers" rel="external noopener">Dokumentacija proizvajalca MPPT regulatorjev</a> navaja meje napetosti, toka in moči za posamezne modele.</p>
  <h2>Serijsko ali vzporedno?</h2>
  <p>V seriji se seštevajo napetosti, pri vzporedni vezavi pa tokovi. Izbira je odvisna od panelov, kablov, senčenja in vhodnih omejitev regulatorja.</p>
  <h2>Preveri tudi profil baterije</h2>
  <p>Regulator mora omogočiti polnilni profil, ki ustreza AGM ali LiFePO₄ bateriji. Ne predpostavljaj, da je nastavitev za eno kemijo primerna tudi za drugo.</p>
</section>`,
    faq: Object.freeze([
      ["Kakšen MPPT potrebujem za 400 W panelov pri 12 V?", "Kot groba ocena toka 400 W ÷ 12 V × 1,25 pomeni približno 42 A. Končna izbira mora preveriti tudi Voc, Isc in omejitve proizvajalca."],
      ["Ali lahko za kratek čas presežem največjo PV napetost MPPT?", "Ne načrtuj sistema tako. Voc mora ostati pod dovoljeno mejo regulatorja tudi v najhladnejših pričakovanih pogojih."],
      ["Ali isti MPPT deluje za AGM in LiFePO4?", "Samo če regulator omogoča ustrezen polnilni profil in napetosti za konkretno baterijo."],
    ]),
  }),
  "/si/vodici/inverter-avtodom-moc/": Object.freeze({
    title: "Kakšno moč inverterja potrebuje avtodom?",
    description: "Izbira inverterja za avtodom po hkratnih AC obremenitvah, zagonskem sunku, čistem sinusu, napetosti baterije in DC toku.",
    body: `
<section data-si-search-growth="inverter-avtodom-moc">
  <h2>Inverter dimenzioniraj po realni hkratni obremenitvi</h2>
  <p>Stalna moč mora pokriti naprave na 230 V, ki lahko delujejo hkrati, kratkotrajna moč pa zagon motorjev ali kompresorjev. Večji inverter sam po sebi ne reši premajhne baterije, BMS ali kablov.</p>
  <p>MyPowerSetup uporabi 25 % rezerve nad ocenjeno hkratno AC obremenitvijo in rezultat primerja z največjim navedenim zagonskim sunkom.</p>
  <h2>1.500 W pri 12 V pomeni zelo velik DC tok</h2>
  <p>Že brez izgub je 1.500 W ÷ 12 V približno 125 A. Pri 24 V je približno 62,5 A. Ker inverter ni 100 % učinkovit, je dejanski tok iz baterije še nekoliko večji.</p>
  <p>Zato morajo biti inverter, napetost sistema, BMS, varovalka in presek kablov dimenzionirani skupaj.</p>
  <h2>Čisti ali modificirani sinus</h2>
  <p>Za konservativno priporočilo MyPowerSetup daje prednost inverterjem s čistim sinusom, kadar je to jasno potrjeno v specifikacijah. Občutljiva elektronika, motorji in nekateri polnilniki lahko z modificiranim sinusom delujejo slabše ali sploh ne.</p>
  <h2>Pogoste napake</h2>
  <ul><li>zamenjava oglaševane kratkotrajne moči za stalno moč;</li><li>ignoriranje največjega toka BMS;</li><li>predolgi ali pretanki 12 V kabli;</li><li>namestitev inverterja predaleč od baterije;</li><li>seštevanje naprav, ki v resnici nikoli ne delujejo hkrati.</li></ul>
</section>`,
    faq: Object.freeze([
      ["Kakšen inverter potrebujem za napravo z močjo 1.000 W?", "Preveri tudi druge naprave, ki lahko delujejo hkrati, zagonski sunek in dodaj smiselno rezervo. Sama nazivna moč naprave ni dovolj."],
      ["Je 3.000 W inverter vedno boljši od 1.500 W?", "Ne. Večji inverter je smiseln le, če ga potrebujejo porabniki in ga lahko varno podprejo baterija, BMS, kabli ter zaščite."],
      ["Ali je čisti sinus smiseln v avtodomu?", "Je konservativna izbira za občutljivo elektroniko in zahtevnejše naprave. Vedno preveri zahteve konkretnega porabnika."],
    ]),
  }),
});

function schemaFor(route, item) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: item.title, description: item.description, mainEntityOfPage: `https://mypowersetup.com${route}`, inLanguage: "sl-SI", publisher: { "@type": "Organization", name: "MyPowerSetup", url: "https://mypowersetup.com/" } },
      { "@type": "FAQPage", mainEntity: item.faq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
}

export function sloveniaGrowthContent(route) { return SI_GROWTH_CONTENT[route] || null; }

export function enhanceSloveniaSearchContent(html, market, route) {
  if (market !== "si" || typeof html !== "string") return html;
  const item = sloveniaGrowthContent(route);
  if (!item || html.includes("data-si-search-growth=")) return html;
  if (!html.includes('<aside class="cta">') || !html.includes("</head>")) return html;
  const schema = `<script type="application/ld+json" data-si-search-growth-schema>${JSON.stringify(schemaFor(route, item))}</script>`;
  let output = html.replace("</head>", `${schema}</head>`);
  output = output.replace('<aside class="cta">', `${item.body}<aside class="cta">`);
  return output;
}
