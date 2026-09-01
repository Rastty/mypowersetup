const ROBOTS = "noindex,nofollow,noarchive";

const TRUST_PAGES = Object.freeze([
  {
    slug: "sobre-o-projeto",
    title: "Sobre o MyPowerSetup em Portugal",
    description: "Quem está por trás do MyPowerSetup, como a calculadora é construída e quais os limites das recomendações.",
    heading: "Sobre o projeto",
    intro: "O MyPowerSetup ajuda a dimensionar uma instalação elétrica de autocaravana a partir do consumo real, sem começar pela escolha de uma marca ou produto.",
    sections: [
      ["Como nasceu", "A ferramenta parte de uma necessidade prática: transformar consumos diários, autonomia pretendida e época do ano em requisitos claros para bateria, painéis solares, inversor e controlador MPPT."],
      ["Quem assume a autoria", "O conteúdo e a metodologia são publicados sob a autoria de Petr Gálík. A prioridade editorial é separar o cálculo técnico da monetização: primeiro determinamos o requisito, depois verificamos se existe um produto compatível."],
      ["O que a ferramenta não substitui", "O resultado é uma estimativa de dimensionamento. Cabos, proteções, ventilação, montagem, ligação à rede de 230 V e validação final devem respeitar o equipamento real e as regras aplicáveis à instalação."],
    ],
  },
  {
    slug: "metodologia",
    title: "Metodologia da calculadora para autocaravanas",
    description: "Pressupostos de bateria, solar, inversor e MPPT usados pela calculadora MyPowerSetup para Portugal.",
    heading: "Metodologia e pressupostos",
    intro: "Os mesmos cálculos técnicos são usados em todos os mercados. A localização altera idioma e contexto, não as margens de segurança nem a matemática.",
    sections: [
      ["Consumo diário", "Somamos potência × horas de utilização × quantidade para cada equipamento selecionado. A energia diária é arredondada de forma conservadora antes de dimensionar os componentes seguintes."],
      ["Bateria", "A capacidade considera os dias de autonomia, uma margem de 15% e a profundidade de descarga útil da química escolhida. Uma bateria AGM/chumbo precisa de mais capacidade nominal do que LiFePO₄ para fornecer a mesma energia útil."],
      ["Solar", "A potência fotovoltaica considera a energia diária, as horas solares equivalentes da época escolhida, 75% de eficiência global e mais 15% de margem. No inverno o resultado é deliberadamente mais exigente."],
      ["Inversor e MPPT", "O inversor inclui margem sobre a maior carga AC e verifica picos declarados. O MPPT é dimensionado a partir da potência solar e da tensão do sistema, arredondando o valor para cima."],
    ],
  },
  {
    slug: "afiliacao",
    title: "Política de afiliação do MyPowerSetup",
    description: "Como funcionam as ligações de afiliado e porque não alteram o resultado técnico da calculadora.",
    heading: "Afiliação e independência",
    intro: "Algumas ligações para produtos podem gerar uma comissão. Isso não aumenta o preço para o utilizador e não altera o cálculo técnico.",
    sections: [
      ["Cálculo antes do produto", "A calculadora determina primeiro os requisitos elétricos. Um produto só aparece depois se cumprir os limites necessários para aquela configuração."],
      ["Destino exato", "Em Portugal só mostramos uma ligação de compra quando conseguimos validar a página exata do produto e o respetivo tracking de afiliado. Não substituímos um produto em falta por uma homepage ou categoria genérica."],
      ["Falhar fechado", "Se não houver evidência suficiente sobre potência, tensão, capacidade ou outra especificação crítica, preferimos não recomendar nada. Uma lacuna de catálogo é melhor do que uma recomendação tecnicamente errada."],
    ],
  },
  {
    slug: "privacidade",
    title: "Privacidade no MyPowerSetup Portugal",
    description: "Como o MyPowerSetup trata consentimento, Google Analytics e dados usados pela calculadora.",
    heading: "Privacidade",
    intro: "A calculadora funciona sem Google Analytics. A análise só é carregada depois de uma escolha explícita do utilizador.",
    sections: [
      ["Dados da calculadora", "Os valores introduzidos para consumos, autonomia e configuração são usados no browser para produzir o resultado. Não pedimos nome, morada ou dados de pagamento para calcular o sistema."],
      ["Análise opcional", "Com consentimento, usamos Google Analytics para medir utilização de funcionalidades e melhorar a experiência. A configuração desativa Google Signals e personalização publicitária e usa anonimização de IP."],
      ["Ligações de afiliado", "Ao abrir uma ligação de afiliado, o destino passa para o comerciante e para a rede de afiliação. A compra, pagamento e tratamento de dados nesse site são regidos pelas respetivas políticas."],
    ],
  },
]);

const GUIDE_PAGES = Object.freeze([
  {
    slug: "capacidade-bateria-autocaravana",
    title: "Que capacidade de bateria preciso na autocaravana?",
    description: "Método prático para calcular Ah e Wh de bateria numa autocaravana, com diferenças entre LiFePO4 e AGM.",
    heading: "Que capacidade de bateria precisa a tua autocaravana?",
    intro: "A resposta começa em Wh por dia, não em Ah. Só depois de saber a energia diária e a tensão do sistema faz sentido converter para capacidade nominal da bateria.",
    sections: [
      ["1. Soma a energia diária", "Exemplo: frigorífico 450 Wh/dia + portátil 260 Wh + iluminação 90 Wh + bomba 30 Wh = 830 Wh/dia."],
      ["2. Multiplica pela autonomia", "Para dois dias sem carregamento, o ponto de partida são 1 660 Wh. A calculadora acrescenta uma reserva para evitar dimensionar no limite."],
      ["3. Considera a química", "LiFePO₄ permite utilizar uma fração maior da capacidade nominal. AGM/chumbo precisa de mais Wh e Ah instalados para entregar a mesma energia útil com uma profundidade de descarga conservadora."],
      ["Quando subir para 24 V", "Sistemas com bateria grande ou inversor potente podem beneficiar de 24 V porque a corrente DC cai para a mesma potência. A calculadora recomenda 24 V automaticamente acima dos seus limites definidos."],
    ],
  },
  {
    slug: "lifepo4-vs-agm-autocaravana",
    title: "LiFePO4 ou AGM na autocaravana?",
    description: "Comparação prática entre LiFePO4 e AGM para autonomia, peso, profundidade de descarga e dimensionamento.",
    heading: "LiFePO₄ ou AGM: qual faz mais sentido?",
    intro: "A escolha não deve ser feita apenas pelo preço de compra. A diferença principal para o dimensionamento está na energia realmente utilizável e no perfil de carregamento.",
    sections: [
      ["Energia útil", "Para a mesma autonomia, uma solução AGM necessita de mais capacidade nominal porque a descarga profunda repetida reduz a vida útil. LiFePO₄ aproveita uma parte maior da capacidade instalada."],
      ["Peso e espaço", "Quando a necessidade diária cresce, a diferença de peso e volume torna-se relevante numa autocaravana. O benefício aumenta em sistemas de vários dias de autonomia."],
      ["Carregamento", "Antes de trocar AGM por LiFePO₄, confirma carregador 230 V, DC-DC, MPPT, BMS e temperaturas de carga. Uma bateria compatível mecanicamente não garante que o sistema de carga também o seja."],
    ],
  },
  {
    slug: "quantos-watts-paineis-solares-autocaravana",
    title: "Quantos watts de painéis solares para uma autocaravana?",
    description: "Como passar do consumo diário em Wh para a potência solar em Wp e porque verão e inverno dão resultados diferentes.",
    heading: "Quantos Wp de solar precisas na autocaravana?",
    intro: "O tamanho do painel depende do consumo diário e da energia solar disponível quando viajas. Um valor que funciona no verão pode ser insuficiente no inverno.",
    sections: [
      ["De Wh/dia para Wp", "A calculadora divide a energia diária pelas horas solares equivalentes da época e depois compensa perdas do sistema e margem de segurança."],
      ["Exemplo simples", "Com 900 Wh/dia e 5 h solares equivalentes, 180 W seriam o mínimo teórico. Depois de perdas e reserva, o projeto real precisa de uma potência superior."],
      ["O teto é um limite físico", "Antes de comprar, mede a área livre e considera claraboias, antenas, sombras e espaço de manutenção. A soma de Wp não prova que os painéis cabem no tejadilho."],
      ["Portugal não é um único valor solar", "Latitude, estação, inclinação, sombra e local de estacionamento alteram muito a produção. Para uma decisão final, compara o cenário da calculadora com dados PVGIS para o local e época relevantes."],
    ],
  },
  {
    slug: "como-escolher-controlador-mppt",
    title: "Como escolher um controlador MPPT para autocaravana",
    description: "Dimensionamento do MPPT por corrente, potência solar, Voc, Isc e tensão da bateria.",
    heading: "Como dimensionar o controlador MPPT",
    intro: "A corrente nominal do controlador é apenas uma das verificações. O conjunto de painéis também tem de respeitar os limites de tensão e corrente da entrada fotovoltaica.",
    sections: [
      ["Corrente de saída", "Uma aproximação útil é potência solar ÷ tensão da bateria, com margem e arredondamento para cima. Um sistema de 24 V precisa de menos corrente que um de 12 V para a mesma potência."],
      ["Voc e Isc", "Confirma sempre Voc e Isc do arranjo de painéis nas condições mais desfavoráveis. Ligar painéis em série aumenta tensão; em paralelo aumenta corrente."],
      ["Perfil da bateria", "O MPPT deve permitir um perfil adequado à química da bateria. LiFePO₄ e chumbo/AGM não devem ser tratados como se tivessem o mesmo perfil de carregamento."],
    ],
  },
  {
    slug: "inversor-autocaravana-potencia",
    title: "Que potência de inversor preciso na autocaravana?",
    description: "Como dimensionar inversor de 230 V por potência contínua, pico de arranque, sinusoidal pura e corrente da bateria.",
    heading: "Que inversor de 230 V precisas?",
    intro: "O inversor deve suportar a carga AC mais exigente, mas um número grande em watts não resolve sozinho o problema: a bateria, cabos e proteção também têm de suportar a corrente DC.",
    sections: [
      ["Potência contínua", "Soma cargas que podem funcionar ao mesmo tempo e mantém uma margem. A calculadora parte das cargas AC selecionadas e não dimensiona inversor para equipamentos DC."],
      ["Pico de arranque", "Motores e compressores podem pedir várias vezes a potência nominal durante o arranque. Quando há um fator de pico declarado, o cálculo compara-o com a capacidade necessária."],
      ["Sinusoidal pura", "Para eletrónica sensível e uma recomendação conservadora, o catálogo só deve apresentar inversores com evidência de onda sinusoidal pura."],
      ["Corrente no lado DC", "1 500 W a 12 V implica correntes muito elevadas antes mesmo de considerar perdas. É por isso que potência do inversor, comprimento dos cabos e tensão do sistema têm de ser avaliados em conjunto."],
    ],
  },
  {
    slug: "carregador-dc-dc-autocaravana",
    title: "Como escolher carregador DC-DC para autocaravana",
    description: "Dimensionamento de carregador DC-DC entre alternador e bateria auxiliar, com atenção a corrente, tensão e alternadores inteligentes.",
    heading: "Carregamento DC-DC durante a viagem",
    intro: "O DC-DC transforma horas de condução em energia recuperada para a bateria auxiliar. O objetivo não é escolher o carregador mais potente, mas um valor compatível com bateria, alternador e tempo de viagem.",
    sections: [
      ["Parte da energia diária", "Se precisas de repor 900 Wh e conduzes duas horas, o carregamento necessário por hora é muito diferente de um cenário com seis horas de estrada."],
      ["Entrada e saída", "Num sistema 12→24 V, a corrente de entrada do alternador pode ser substancialmente maior do que a corrente de saída para a bateria. Dimensiona ambos os lados separadamente."],
      ["Alternador inteligente", "Veículos modernos podem reduzir a tensão do alternador. Confirma que o carregador suporta o comportamento real do veículo e segue as instruções de ativação e cablagem do fabricante."],
    ],
  },
  {
    slug: "carregador-230v-bateria-autocaravana",
    title: "Como escolher carregador 230 V para bateria de autocaravana",
    description: "Como dimensionar corrente de carregamento em parque de campismo e verificar química, BMS e tempo disponível.",
    heading: "Carregador de bateria a 230 V",
    intro: "Quando tens ligação à rede, o carregador deve conseguir recuperar a energia usada dentro do tempo disponível sem ultrapassar os limites recomendados para a bateria.",
    sections: [
      ["Corrente necessária", "Energia a repor, tensão da bateria, eficiência e horas de ligação determinam a corrente média necessária. A calculadora limita o resultado a um intervalo conservador."],
      ["Química e BMS", "Confirma tensão nominal, perfil LiFePO₄ ou chumbo, corrente máxima de carga e requisitos do BMS."],
      ["230 V exige instalação correta", "Proteções AC, ligação de terra, RCD e integração com a instalação do veículo não devem ser improvisadas a partir do resultado da calculadora."],
    ],
  },
  {
    slug: "cabos-fusiveis-12v-autocaravana",
    title: "Cabos e fusíveis 12 V na autocaravana",
    description: "Como pensar em queda de tensão, corrente, comprimento de cabo e proteção sem inventar um fusível universal.",
    heading: "Cabos e proteção em sistemas 12/24 V",
    intro: "A secção do cabo depende da corrente e do percurso, não apenas da potência do aparelho. A proteção depende também do cabo, fabricante e capacidade de interrupção.",
    sections: [
      ["Queda de tensão", "Para circuitos de corrente elevada, poucos décimos de volt fazem diferença. A ferramenta usa um objetivo limitado de queda de tensão para estimar a secção mínima de cobre."],
      ["Comprimento é ida e volta", "A resistência elétrica vê o percurso completo do circuito. Ao medir a instalação, distingue o comprimento físico de ida do comprimento elétrico total."],
      ["Fusível não é calculado por uma fórmula única", "O fusível protege o cabo e deve respeitar as instruções do equipamento. Por isso o MyPowerSetup evita apresentar um valor universal quando não conhece todos os dados da instalação."],
    ],
  },
  {
    slug: "consumo-frigorifico-compressor-autocaravana",
    title: "Quanto consome um frigorífico de compressor na autocaravana?",
    description: "Como transformar watts do compressor em Wh por dia usando ciclo de trabalho, temperatura e ventilação.",
    heading: "Consumo diário do frigorífico de compressor",
    intro: "Um frigorífico marcado como 45 W não consome necessariamente 45 W durante 24 horas. O compressor liga e desliga, por isso o dado mais útil é Wh por dia.",
    sections: [
      ["Ciclo de trabalho", "Se um compressor de 45 W funcionar em média 10 horas acumuladas por dia, o consumo é cerca de 450 Wh/dia."],
      ["Calor aumenta o consumo", "Temperatura exterior elevada, ventilação deficiente do condensador, abertura frequente da porta e alimentos quentes aumentam o tempo de funcionamento."],
      ["Mede quando possível", "Um medidor DC ou monitor de bateria durante vários dias dá um valor melhor do que assumir um ciclo fixo. Usa a calculadora com o cenário mais exigente que seja realista para a tua viagem."],
    ],
  },
  {
    slug: "sistema-eletrico-completo-autocaravana",
    title: "Sistema elétrico completo de uma autocaravana: bateria, solar e carregamento",
    description: "Arquitetura de alto nível para ligar consumo, bateria, solar, alternador, 230 V, inversor e proteções num único dimensionamento.",
    heading: "Como pensar no sistema elétrico como um conjunto",
    intro: "Dimensionar cada componente isoladamente cria incompatibilidades. A bateria, solar, MPPT, inversor e carregadores devem partir do mesmo cenário de consumo e da mesma tensão de sistema.",
    sections: [
      ["1. Define a carga", "Começa pelos equipamentos e horas por dia. Se o consumo estiver errado, todos os componentes seguintes estarão errados."],
      ["2. Define a autonomia", "A bateria cobre os períodos sem geração ou carregamento. Solar e carregadores reduzem a necessidade de descarregar a bateria, mas não substituem uma reserva adequada."],
      ["3. Dimensiona as fontes", "Solar cobre parte da energia durante o estacionamento; DC-DC durante a condução; 230 V quando tens rede disponível. A melhor combinação depende do teu padrão de viagem."],
      ["4. Verifica gargalos", "Um inversor de alta potência com bateria pequena, um MPPT insuficiente ou cabos demasiado finos tornam o conjunto incoerente. A decisão final deve ser feita ao nível do sistema."],
    ],
  },
  {
    slug: "power-station-ou-instalacao-fixa-autocaravana",
    title: "Power station ou instalação fixa na autocaravana?",
    description: "Compara power station portátil e sistema elétrico fixo para autocaravana por capacidade, potência, solar, 12 V, carregamento e expansão.",
    heading: "Power station ou instalação fixa: qual escolher?",
    intro: "A melhor opção depende dos consumos, dos dias sem carregamento e da forma como usas a autocaravana. Compara limites elétricos concretos, não apenas a capacidade anunciada.",
    sections: [
      ["Quando uma power station faz sentido", "É uma solução compacta e removível para consumos moderados, utilização ocasional e quem prefere evitar uma instalação elétrica completa."],
      ["Quando a instalação fixa ganha", "Um sistema por componentes oferece maior liberdade para dimensionar bateria, solar, inverter, DC-DC, 230 V e circuitos 12 V, sobretudo em uso frequente ou exigente."],
      ["Compara o sistema completo", "Verifica Wh utilizáveis, potência AC contínua e de pico, entrada solar, saída DC, velocidade de carregamento, expansão e compatibilidade com cada equipamento."],
    ],
  },
]);

export const PT_PRIVATE_CONTENT = Object.freeze({ trust: TRUST_PAGES, guides: GUIDE_PAGES });

export function getPortugalPrivatePage(pathname) {
  const path = String(pathname || "").replace(/^\/pt\/?/, "").replace(/\/$/, "");
  const trust = TRUST_PAGES.find((page) => page.slug === path);
  if (trust) return { ...trust, type: "trust" };
  if (path === "guias") return { type: "hub", slug: "guias", title: "Guias de energia para autocaravanas | MyPowerSetup", description: "Guias práticos sobre bateria, solar, MPPT, inversor e carregamento para autocaravanas.", heading: "Guias de energia para autocaravanas", intro: "Conteúdo técnico ligado aos mesmos pressupostos usados pela calculadora." };
  const guideSlug = path.startsWith("guias/") ? path.slice("guias/".length) : null;
  const guide = GUIDE_PAGES.find((page) => page.slug === guideSlug);
  return guide ? { ...guide, type: "guide" } : null;
}

export function renderPortugalPrivateContentPage(pathname) {
  const page = getPortugalPrivatePage(pathname);
  if (!page) return null;
  const calculatorHref = "/pt/#calculator-preview";
  const body = page.type === "hub"
    ? `<div class="related"><ul>${GUIDE_PAGES.map((guide) => `<li><a href="/pt/guias/${escapeHtml(guide.slug)}/">${escapeHtml(guide.heading)}</a></li>`).join("")}</ul></div>`
    : `${(page.sections || []).map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}<aside class="cta"><h2>Calcula com os teus próprios consumos</h2><p>Usa os mesmos pressupostos técnicos deste guia no dimensionamento da tua autocaravana.</p><a class="button button-primary" href="${calculatorHref}">Abrir calculadora</a></aside>`;
  const related = page.type === "guide" ? `<aside class="related"><h2>Outros guias</h2><ul>${GUIDE_PAGES.filter((item) => item.slug !== page.slug).slice(0, 3).map((item) => `<li><a href="/pt/guias/${escapeHtml(item.slug)}/">${escapeHtml(item.heading)}</a></li>`).join("")}</ul></aside>` : "";
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="${ROBOTS}"><meta name="description" content="${escapeHtml(page.description)}"><link rel="stylesheet" href="/styles.css"><title>${escapeHtml(page.title)}</title></head><body><header class="site-header"><a class="brand" href="/pt/">ϟ MyPowerSetup</a></header><main class="article"><header class="article-header"><p class="eyebrow">Versão privada em validação para Portugal</p><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.intro)}</p></header>${body}${related}</main><footer><a href="/pt/sobre-o-projeto/">Sobre</a> · <a href="/pt/metodologia/">Metodologia</a> · <a href="/pt/afiliacao/">Afiliação</a> · <a href="/pt/privacidade/">Privacidade</a> · <a href="/pt/guias/">Guias</a></footer><script type="module" src="/src/analytics.js"></script></body></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
