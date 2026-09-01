const SITE_URL = "https://mypowersetup.com";
const WIRING_REFERENCE = "https://www.victronenergy.com/media/pg/The_Wiring_Unlimited_book/en/dc-wiring.html";

const GUIDES = Object.freeze({
  pt: Object.freeze({
    locale: "pt-PT",
    lang: "pt",
    base: "guias",
    slug: "sistema-12v-ou-24v-autocaravana",
    title: "Sistema 12 V ou 24 V na autocaravana: como escolher",
    heading: "12 V ou 24 V na autocaravana?",
    description: "Compara 12 V e 24 V na autocaravana pelo consumo, potência do inversor, corrente DC, cabos, queda de tensão e compatibilidade dos equipamentos.",
    intro: "A tensão certa não se escolhe pelo tamanho da autocaravana. Escolhe-se a partir da potência que o sistema tem de transportar, das correntes resultantes e dos equipamentos que já tens ou pretendes instalar.",
    calculator: "Calcular o meu sistema",
    hubLabel: "12 V ou 24 V: escolher a tensão do sistema",
    discoverHeading: "Ainda tens de escolher 12 V ou 24 V?",
    discoverText: "Compara corrente, cablagem, inversor e compatibilidade antes de fechar a arquitetura do sistema.",
    relatedRoutes: Object.freeze([
      "/pt/guias/capacidade-bateria-autocaravana/",
      "/pt/guias/inversor-autocaravana-potencia/",
      "/pt/guias/cabos-fusiveis-12v-autocaravana/",
      "/pt/guias/sistema-eletrico-completo-autocaravana/",
    ]),
    body: `
<section data-expansion-voltage-guide="pt">
  <h2>Regra física: para a mesma potência, 24 V reduz a corrente para cerca de metade</h2>
  <p>A relação básica é <strong>I ≈ P ÷ V</strong>. Ignorando perdas para perceber a ordem de grandeza, uma carga de 1 200 W pede cerca de 100 A num sistema de 12 V e cerca de 50 A a 24 V. Com 2 000 W, são aproximadamente 167 A a 12 V e 83 A a 24 V.</p>
  <p>Corrente mais baixa pode reduzir a queda de tensão e tornar mais fácil dimensionar cabos, fusíveis, barramentos e ligações para cargas elevadas. A documentação técnica <a href="${WIRING_REFERENCE}" rel="external noopener">Wiring Unlimited da Victron Energy</a> mostra o mesmo princípio: aumentando a tensão do sistema, a corrente DC desce para a mesma potência.</p>

  <h2>Quando 12 V continua a ser a escolha mais simples</h2>
  <p>Em muitas autocaravanas, 12 V encaixa naturalmente com a instalação existente: iluminação, bomba de água, frigorífico, eletrónica automóvel e vários acessórios já trabalham a 12 V. Se as cargas AC forem moderadas e os percursos de cabo forem controláveis, mudar todo o banco de serviço para 24 V pode acrescentar conversores e complexidade sem benefício suficiente.</p>
  <p>Por isso, <strong>12 V não é uma solução inferior</strong>. É muitas vezes a arquitetura mais simples quando a potência DC é moderada e a maioria dos consumidores já é nativamente de 12 V.</p>

  <h2>Quando vale a pena avaliar seriamente 24 V</h2>
  <p>24 V torna-se mais interessante quando o inversor e outras cargas de alta potência fazem subir muito a corrente no lado da bateria, quando os cabos são longos ou quando estás a desenhar uma instalação nova sem ficar preso a equipamentos de 12 V já existentes.</p>
  <p>O modo automático do MyPowerSetup usa 24 V como <strong>heurística de projeto</strong> quando a bateria calculada ultrapassa 2 400 Wh ou quando a potência necessária do inversor ultrapassa 1 200 W. Não é uma norma elétrica universal: serve para chamar a atenção para cenários em que a corrente de 12 V merece uma verificação mais rigorosa.</p>

  <h2>Não mudes para 24 V olhando apenas para a bateria</h2>
  <p>A tensão do sistema afeta toda a cadeia. Antes de escolher 24 V confirma a tensão admissível de cada componente:</p>
  <ul>
    <li>banco de baterias e limites do BMS;</li>
    <li>inversor ou inversor/carregador;</li>
    <li>controlador MPPT e configuração dos painéis;</li>
    <li>carregador DC-DC ligado ao alternador;</li>
    <li>carregador de 230 V;</li>
    <li>consumidores DC diretos, incluindo frigorífico, luzes, bombas e USB;</li>
    <li>fusíveis, seccionadores, barramentos e restantes componentes com tensão nominal adequada.</li>
  </ul>
  <p>Se mantiveres consumidores de 12 V num banco de 24 V, normalmente precisas de conversão DC-DC adequada. Não alimentes um equipamento de 12 V diretamente a 24 V.</p>

  <h2>Exemplo prático: inversor de 2 000 W</h2>
  <p>Um inversor de 2 000 W pode exigir aproximadamente 167 A a 12 V antes de considerar as perdas do próprio inversor; a 24 V, aproximadamente 83 A. Na instalação real, a corrente será um pouco superior porque nenhum inversor é 100% eficiente. É precisamente por isso que a secção do cabo, o comprimento total do circuito, as terminações e a proteção têm de ser dimensionados a partir da corrente real e do manual do equipamento.</p>

  <h2>Sequência de decisão que evita refazer a instalação</h2>
  <ol>
    <li>Calcula o consumo diário em Wh e os dias de autonomia.</li>
    <li>Identifica a maior carga AC simultânea e os picos de arranque.</li>
    <li>Compara a corrente prevista a 12 V e 24 V.</li>
    <li>Verifica comprimentos de cabo e queda de tensão aceitável.</li>
    <li>Lista todos os equipamentos que só aceitam 12 V ou 24 V.</li>
    <li>Só depois fecha bateria, inversor, MPPT, DC-DC, carregador e proteção.</li>
  </ol>
  <p>Para continuar, usa o <a href="/pt/#calculator-preview">calculador MyPowerSetup</a> e compara o resultado com os guias de <a href="/pt/guias/capacidade-bateria-autocaravana/">capacidade da bateria</a>, <a href="/pt/guias/inversor-autocaravana-potencia/">potência do inversor</a> e <a href="/pt/guias/cabos-fusiveis-12v-autocaravana/">cabos e fusíveis</a>.</p>
</section>`,
    faq: Object.freeze([
      ["24 V dá o dobro da autonomia de 12 V?", "Não. A autonomia depende da energia armazenada em Wh e do consumo. A vantagem principal de uma tensão mais alta é reduzir a corrente para a mesma potência."],
      ["Um inversor de 2 000 W deve ser 12 V ou 24 V?", "Ambas as arquiteturas podem ser tecnicamente possíveis, mas a 24 V a corrente no lado da bateria é aproximadamente metade. A decisão final depende de cabos, bateria, BMS e compatibilidade dos restantes equipamentos."],
      ["Posso manter equipamentos de 12 V numa bateria de 24 V?", "Sim, se forem alimentados através de um conversor DC-DC adequado e dimensionado para essas cargas. Não os ligues diretamente a 24 V."],
      ["O MyPowerSetup escolhe sempre 24 V acima de 1 200 W?", "No modo automático, o calculador usa esse limiar de potência do inversor, ou 2 400 Wh de bateria, como heurística de projeto. Não substitui a verificação da instalação real e dos manuais dos equipamentos."],
    ]),
  }),
  ro: Object.freeze({
    locale: "ro-RO",
    lang: "ro",
    base: "ghiduri",
    slug: "sistem-12v-sau-24v-autorulota",
    title: "Sistem de 12 V sau 24 V în autorulotă: cum alegi",
    heading: "12 V sau 24 V în autorulotă?",
    description: "Compară 12 V și 24 V pentru autorulotă după consum, puterea invertorului, curentul DC, cabluri, căderea de tensiune și compatibilitatea echipamentelor.",
    intro: "Tensiunea sistemului nu se alege după dimensiunea autorulotei, ci după puterea pe care trebuie să o transporte instalația, curenții rezultați și echipamentele care trebuie să funcționeze împreună.",
    calculator: "Calculează sistemul meu",
    hubLabel: "12 V sau 24 V: alegerea tensiunii sistemului",
    discoverHeading: "Mai trebuie să alegi între 12 V și 24 V?",
    discoverText: "Compară curentul, cablurile, invertorul și compatibilitatea înainte să fixezi arhitectura instalației.",
    relatedRoutes: Object.freeze([
      "/ro/ghiduri/capacitate-baterie-autorulota/",
      "/ro/ghiduri/invertor-autorulota-putere/",
      "/ro/ghiduri/cabluri-sigurante-12v-autorulota/",
      "/ro/ghiduri/sistem-electric-complet-autorulota/",
    ]),
    body: `
<section data-expansion-voltage-guide="ro">
  <h2>Regula de bază: la aceeași putere, 24 V înseamnă aproximativ jumătate din curent</h2>
  <p>Relația simplificată este <strong>I ≈ P ÷ V</strong>. Fără a include pierderile, o sarcină de 1 200 W înseamnă aproximativ 100 A la 12 V și 50 A la 24 V. La 2 000 W, valorile sunt aproximativ 167 A la 12 V și 83 A la 24 V.</p>
  <p>Curentul mai mic poate reduce căderea de tensiune și poate simplifica dimensionarea cablurilor, siguranțelor, barelor de distribuție și conexiunilor pentru sarcini mari. Ghidul tehnic <a href="${WIRING_REFERENCE}" rel="external noopener">Wiring Unlimited de la Victron Energy</a> explică același principiu: pentru aceeași putere, creșterea tensiunii sistemului reduce curentul DC.</p>

  <h2>Când 12 V rămâne alegerea mai simplă</h2>
  <p>Multe autorulote au deja consumatori de 12 V: iluminat, pompă de apă, frigider, USB și alte echipamente auto. Dacă sarcinile de 230 V sunt moderate, traseele de cablu sunt rezonabile și instalația existentă este sănătoasă, trecerea completă la 24 V poate adăuga convertoare și complexitate fără un avantaj suficient.</p>
  <p><strong>12 V nu este o soluție mai slabă prin definiție.</strong> Pentru instalații cu puteri moderate și mulți consumatori DC de 12 V poate fi alegerea cea mai directă.</p>

  <h2>Când merită evaluat serios un sistem de 24 V</h2>
  <p>24 V devine mai atractiv când invertorul sau alte sarcini mari duc la curenți foarte mari pe partea bateriei, când traseele de cablu sunt lungi sau când proiectezi instalația de la zero și nu ești legat de multe echipamente existente de 12 V.</p>
  <p>Modul automat MyPowerSetup trece la 24 V ca <strong>euristică de proiectare</strong> dacă bateria calculată depășește 2 400 Wh sau dacă invertorul necesar depășește 1 200 W. Nu este o regulă universală; semnalează doar că scenariul merită verificat atent din perspectiva curentului și cablării.</p>

  <h2>Nu schimba tensiunea analizând doar bateria</h2>
  <p>Tensiunea sistemului afectează întregul lanț. Verifică înainte de cumpărare:</p>
  <ul>
    <li>banca de baterii și limitele BMS;</li>
    <li>invertorul sau invertorul/încărcătorul;</li>
    <li>regulatorul MPPT și configurația panourilor;</li>
    <li>încărcătorul DC-DC conectat la alternator;</li>
    <li>încărcătorul de 230 V;</li>
    <li>toți consumatorii DC direcți;</li>
    <li>siguranțele, separatoarele, barele și celelalte componente cu tensiune nominală corespunzătoare.</li>
  </ul>
  <p>Dacă păstrezi consumatori de 12 V într-un sistem de baterii de 24 V, de regulă ai nevoie de un convertor DC-DC potrivit. Nu conecta direct un aparat de 12 V la 24 V.</p>

  <h2>Exemplu practic: invertor de 2 000 W</h2>
  <p>La 12 V, 2 000 W reprezintă aproximativ 167 A înainte de pierderile invertorului; la 24 V, aproximativ 83 A. În realitate curentul va fi puțin mai mare deoarece invertorul nu are eficiență de 100%. De aceea cablul, lungimea totală a circuitului, conexiunile și protecția trebuie alese după curentul real și manualul echipamentului.</p>

  <h2>Ordinea deciziilor care reduce riscul de reproiectare</h2>
  <ol>
    <li>Calculează consumul zilnic în Wh și autonomia dorită.</li>
    <li>Stabilește cea mai mare sarcină AC simultană și vârfurile de pornire.</li>
    <li>Compară curentul estimat la 12 V și 24 V.</li>
    <li>Verifică lungimile cablurilor și căderea de tensiune acceptabilă.</li>
    <li>Notează toate echipamentele care acceptă doar 12 V sau doar 24 V.</li>
    <li>Abia apoi finalizează bateria, invertorul, MPPT-ul, DC-DC-ul, încărcătorul și protecțiile.</li>
  </ol>
  <p>Poți porni de la <a href="/ro/#calculator-preview">calculatorul MyPowerSetup</a>, apoi verifică ghidurile despre <a href="/ro/ghiduri/capacitate-baterie-autorulota/">capacitatea bateriei</a>, <a href="/ro/ghiduri/invertor-autorulota-putere/">puterea invertorului</a> și <a href="/ro/ghiduri/cabluri-sigurante-12v-autorulota/">cabluri și siguranțe</a>.</p>
</section>`,
    faq: Object.freeze([
      ["24 V oferă autonomie dublă față de 12 V?", "Nu. Autonomia depinde de energia stocată în Wh și de consum. Avantajul principal al tensiunii mai mari este curentul mai mic la aceeași putere."],
      ["Pentru un invertor de 2 000 W este mai bun 12 V sau 24 V?", "Ambele pot fi posibile, dar la 24 V curentul pe partea bateriei este aproximativ la jumătate. Alegerea finală depinde de cabluri, baterie, BMS și compatibilitatea celorlalte echipamente."],
      ["Pot păstra consumatorii de 12 V dacă bateria este de 24 V?", "Da, printr-un convertor DC-DC potrivit și dimensionat pentru acele sarcini. Nu îi conecta direct la 24 V."],
      ["MyPowerSetup alege întotdeauna 24 V peste 1 200 W?", "În modul automat, calculatorul folosește acest prag al invertorului sau o baterie calculată peste 2 400 Wh ca euristică de proiectare. Nu înlocuiește verificarea instalației și a manualelor echipamentelor."],
    ]),
  }),
  si: Object.freeze({
    locale: "sl-SI",
    lang: "sl",
    base: "vodici",
    slug: "12v-ali-24v-sistem-avtodom",
    title: "12 V ali 24 V sistem za avtodom: kako izbrati",
    heading: "12 V ali 24 V v avtodomu?",
    description: "Primerjaj 12 V in 24 V sistem za avtodom glede porabe, moči inverterja, DC toka, kablov, padca napetosti in združljivosti opreme.",
    intro: "Napetosti sistema ne izbereš glede na velikost avtodoma. Izbereš jo glede na moč, ki jo mora električni sistem prenašati, posledične tokove in opremo, ki mora delovati skupaj.",
    calculator: "Izračunaj moj sistem",
    hubLabel: "12 V ali 24 V: izbira napetosti sistema",
    discoverHeading: "Še izbiraš med 12 V in 24 V?",
    discoverText: "Pred dokončno zasnovo primerjaj tok, kable, inverter in združljivost vseh naprav.",
    relatedRoutes: Object.freeze([
      "/si/vodici/kapaciteta-baterije-avtodom/",
      "/si/vodici/inverter-avtodom-moc/",
      "/si/vodici/kabli-varovalke-12v-avtodom/",
      "/si/vodici/elektricni-sistem-avtodom/",
    ]),
    body: `
<section data-expansion-voltage-guide="si">
  <h2>Osnovno pravilo: pri isti moči 24 V pomeni približno polovico toka</h2>
  <p>Poenostavljena zveza je <strong>I ≈ P ÷ V</strong>. Brez upoštevanja izgub 1.200 W obremenitev pri 12 V pomeni približno 100 A, pri 24 V pa 50 A. Pri 2.000 W je to približno 167 A pri 12 V oziroma 83 A pri 24 V.</p>
  <p>Nižji tok lahko zmanjša padec napetosti in olajša dimenzioniranje kablov, varovalk, zbiralk ter priključkov pri večjih močeh. Tehnični priročnik <a href="${WIRING_REFERENCE}" rel="external noopener">Wiring Unlimited podjetja Victron Energy</a> pojasnjuje isto načelo: višja sistemska napetost pri isti moči zmanjša DC tok.</p>

  <h2>Kdaj je 12 V še vedno najpreprostejša izbira</h2>
  <p>V številnih avtodomih so luči, vodna črpalka, hladilnik, USB in druga avtomobilska oprema že 12-voltni. Če so 230 V porabniki zmerni, kabli niso pretirano dolgi in je obstoječa napeljava ustrezna, lahko prehod celotnega bivalnega sistema na 24 V doda pretvornike in zapletenost brez dovolj velike koristi.</p>
  <p><strong>12 V zato ni samodejno slabša rešitev.</strong> Pri zmernih močeh in veliko obstoječih 12 V porabnikih je pogosto najbolj neposredna arhitektura.</p>

  <h2>Kdaj resno razmisliti o 24 V</h2>
  <p>24 V postane zanimivejši pri močnejšem inverterju in drugih velikih porabnikih, ki na baterijski strani povzročajo zelo visok tok, pri daljših kabelskih poteh ali pri novi zasnovi, kjer te ne omejuje veliko obstoječih 12 V naprav.</p>
  <p>Samodejni način MyPowerSetup uporablja 24 V kot <strong>projektno hevristiko</strong>, kadar izračunana baterija preseže 2.400 Wh ali kadar potreben inverter preseže 1.200 W. To ni univerzalno elektropravilo; opozori le na scenarije, kjer je treba tokove in ožičenje pri 12 V posebej skrbno preveriti.</p>

  <h2>Na 24 V ne preklopi samo zaradi baterije</h2>
  <p>Sistemska napetost vpliva na celotno verigo. Pred izbiro preveri:</p>
  <ul>
    <li>baterijski sklop in omejitve BMS;</li>
    <li>inverter oziroma inverter/polnilnik;</li>
    <li>MPPT regulator in konfiguracijo panelov;</li>
    <li>DC-DC polnilnik, povezan z alternatorjem;</li>
    <li>230 V polnilnik;</li>
    <li>vse neposredne DC porabnike;</li>
    <li>varovalke, ločilnike, zbiralke in druge komponente z ustrezno nazivno napetostjo.</li>
  </ul>
  <p>Če v 24 V baterijskem sistemu ohraniš 12 V porabnike, praviloma potrebuješ ustrezen DC-DC pretvornik. 12 V naprave ne priključi neposredno na 24 V.</p>

  <h2>Praktičen primer: inverter 2.000 W</h2>
  <p>Pri 12 V pomeni 2.000 W približno 167 A še pred izgubami inverterja; pri 24 V približno 83 A. V resnični napeljavi bo tok nekoliko večji, ker inverter ni 100-odstotno učinkovit. Zato je treba presek kabla, skupno dolžino tokokroga, priključke in zaščito izbrati glede na dejanski tok ter navodila opreme.</p>

  <h2>Vrstni red odločitev, ki prepreči nepotrebno predelavo</h2>
  <ol>
    <li>Izračunaj dnevno porabo v Wh in želeno avtonomijo.</li>
    <li>Določi največjo hkratno AC obremenitev in zagonske sunke.</li>
    <li>Primerjaj pričakovani tok pri 12 V in 24 V.</li>
    <li>Preveri dolžine kablov in sprejemljiv padec napetosti.</li>
    <li>Zapiši vse naprave, ki sprejemajo samo 12 V ali samo 24 V.</li>
    <li>Šele nato dokončno izberi baterijo, inverter, MPPT, DC-DC, polnilnik in zaščito.</li>
  </ol>
  <p>Začni z <a href="/si/#calculator-preview">MyPowerSetup kalkulatorjem</a>, nato preveri še vodnike za <a href="/si/vodici/kapaciteta-baterije-avtodom/">kapaciteto baterije</a>, <a href="/si/vodici/inverter-avtodom-moc/">moč inverterja</a> ter <a href="/si/vodici/kabli-varovalke-12v-avtodom/">kable in varovalke</a>.</p>
</section>`,
    faq: Object.freeze([
      ["Ali 24 V zagotovi dvakrat daljšo avtonomijo kot 12 V?", "Ne. Avtonomija je odvisna od shranjene energije v Wh in porabe. Glavna prednost višje napetosti je manjši tok pri isti moči."],
      ["Je za inverter 2.000 W boljši 12 V ali 24 V sistem?", "Oba sta lahko tehnično izvedljiva, vendar je pri 24 V tok na baterijski strani približno pol manjši. Končna izbira je odvisna od kablov, baterije, BMS in združljivosti druge opreme."],
      ["Ali lahko pri 24 V bateriji obdržim 12 V porabnike?", "Da, če jih napaja ustrezno dimenzioniran DC-DC pretvornik. Ne priključi jih neposredno na 24 V."],
      ["Ali MyPowerSetup vedno izbere 24 V nad 1.200 W?", "V samodejnem načinu kalkulator uporabi ta prag inverterja ali izračunano baterijo nad 2.400 Wh kot projektno hevristiko. To ne nadomesti preverjanja dejanske napeljave in navodil opreme."],
    ]),
  }),
});

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function expansionVoltageGuide(market) {
  const guide = GUIDES[market];
  if (!guide) return null;
  const route = `/${market}/${guide.base}/${guide.slug}/`;
  return Object.freeze({ ...guide, route, path: `${route.slice(1)}index.html` });
}

export function expansionVoltageGuideManifest(market) {
  const guide = expansionVoltageGuide(market);
  return guide ? Object.freeze([Object.freeze({ source: "voltage-guide", route: guide.route, path: guide.path, changefreq: "monthly", priority: "0.8" })]) : Object.freeze([]);
}

export function renderExpansionVoltageGuidePage(market, route) {
  const guide = expansionVoltageGuide(market);
  if (!guide || route !== guide.route) return null;
  const canonical = `${SITE_URL}${guide.route}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    inLanguage: guide.locale,
    mainEntityOfPage: canonical,
    publisher: { "@type": "Organization", name: "MyPowerSetup", url: `${SITE_URL}/` },
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  const faqHtml = guide.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
  return `<!doctype html><html lang="${guide.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="description" content="${escapeHtml(guide.description)}"><link rel="stylesheet" href="/styles.css"><title>${escapeHtml(guide.title)}</title><script type="application/ld+json">${safeJson(articleSchema)}</script><script type="application/ld+json">${safeJson(faqSchema)}</script></head><body><header class="site-header"><a class="brand" href="/${market}/">ϟ MyPowerSetup</a></header><main class="content-page"><p class="eyebrow">MyPowerSetup</p><h1>${escapeHtml(guide.heading)}</h1><p>${escapeHtml(guide.intro)}</p><p class="cta"><a class="button button-primary" href="/${market}/#calculator-preview">${escapeHtml(guide.calculator)}</a></p>${guide.body}<section class="faq" aria-labelledby="voltage-faq"><h2 id="voltage-faq">FAQ</h2>${faqHtml}</section><aside class="cta"><h2>${escapeHtml(guide.calculator)}</h2><p>${escapeHtml(guide.intro)}</p><a class="button button-primary" href="/${market}/#calculator-preview">${escapeHtml(guide.calculator)}</a></aside></main><footer class="expansion-footer"><nav><a href="/${market}/${guide.base}/">${escapeHtml(guide.base === "vodici" ? "Vodniki" : guide.base === "ghiduri" ? "Ghiduri" : "Guias")}</a></nav></footer><script type="module" src="/src/analytics.js"></script></body></html>`;
}

export function addExpansionVoltageGuideDiscovery(html, market, route) {
  if (typeof html !== "string") return html;
  const guide = expansionVoltageGuide(market);
  if (!guide || html.includes(`href="${guide.route}"`)) return html;
  const hubRoute = `/${market}/${guide.base}/`;

  if (route === hubRoute) {
    const item = `<li><a href="${guide.route}">${escapeHtml(guide.hubLabel)}</a></li>`;
    return html.includes("</ul>") ? html.replace("</ul>", `${item}</ul>`) : html;
  }

  if (!guide.relatedRoutes.includes(route) || !html.includes('<aside class="cta">')) return html;
  const block = `<aside class="related" data-voltage-guide-discovery><h2>${escapeHtml(guide.discoverHeading)}</h2><p>${escapeHtml(guide.discoverText)}</p><p><a href="${guide.route}">${escapeHtml(guide.hubLabel)}</a></p></aside>`;
  return html.replace('<aside class="cta">', `${block}<aside class="cta">`);
}
