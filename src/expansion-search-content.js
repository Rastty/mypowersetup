const PT_GROWTH_CONTENT = Object.freeze({
  "/pt/guias/capacidade-bateria-autocaravana/": Object.freeze({
    title: "Que capacidade de bateria preciso na autocaravana?",
    description: "Cálculo prático de bateria para autocaravana em Wh e Ah, com autonomia, margem, LiFePO4 vs AGM e exemplos de 12/24 V.",
    body: `
<section data-search-growth-content="capacidade-bateria-autocaravana">
  <h2>Resposta curta: calcula primeiro Wh por dia</h2>
  <p>Escolher uma bateria pela etiqueta “100 Ah” ou “200 Ah” sem saber o consumo diário é inverter a ordem do problema. O ponto de partida é a energia usada por todos os equipamentos em 24 horas. Só depois entram os dias de autonomia, a margem de segurança, a profundidade de descarga da química e a tensão do sistema.</p>
  <p>No MyPowerSetup o cálculo segue esta lógica: <strong>energia nominal da bateria ≈ consumo diário × dias de autonomia × 1,15 ÷ fração utilizável</strong>. O modelo usa 80% de profundidade utilizável para LiFePO₄ e 50% para AGM/chumbo. São pressupostos conservadores de dimensionamento da ferramenta, não um substituto para os limites indicados pelo fabricante da bateria.</p>

  <h2>Exemplo: 830 Wh por dia e dois dias de autonomia</h2>
  <p>Imagina 450 Wh/dia para frigorífico, 260 Wh para portátil, 90 Wh para iluminação e 30 Wh para bomba de água. Total: <strong>830 Wh/dia</strong>. Para dois dias, a energia de consumo é 1 660 Wh.</p>
  <ul>
    <li><strong>LiFePO₄:</strong> 830 × 2 × 1,15 ÷ 0,80 ≈ 2 386 Wh nominais; a calculadora arredonda conservadoramente para 2 400 Wh.</li>
    <li><strong>AGM/chumbo:</strong> 830 × 2 × 1,15 ÷ 0,50 ≈ 3 818 Wh nominais; a calculadora arredonda para 3 900 Wh.</li>
  </ul>
  <p>É por isso que comparar apenas Ah pode enganar. <strong>Ah só faz sentido quando a tensão é conhecida</strong>: 200 Ah a 12 V representam aproximadamente a mesma energia nominal que 100 Ah a 24 V.</p>

  <h2>Quando 12 V deixa de ser a escolha prática</h2>
  <p>Não existe uma fronteira universal em que todos os sistemas tenham de mudar para 24 V. No MyPowerSetup usamos uma regra de projeto simples para evitar correntes DC desnecessariamente elevadas: o modo automático passa para 24 V quando a bateria calculada ultrapassa 2 400 Wh ou quando o inversor necessário ultrapassa 1 200 W.</p>
  <p>A razão física é simples: para a mesma potência, duplicar a tensão reduz aproximadamente para metade a corrente. Isso pode facilitar cablagem e perdas, mas não elimina a necessidade de verificar equipamentos, proteções e compatibilidade de todos os consumidores.</p>

  <h2>Quatro erros que aumentam o risco de comprar a bateria errada</h2>
  <ul>
    <li><strong>Usar apenas os watts de placa do frigorífico:</strong> um compressor liga e desliga; o dado útil é Wh/dia medidos ou uma estimativa realista do ciclo de trabalho.</li>
    <li><strong>Ignorar dias sem carregamento:</strong> solar, alternador e 230 V ajudam, mas não devem ser assumidos como disponíveis todos os dias.</li>
    <li><strong>Confundir capacidade nominal com energia utilizável:</strong> química, BMS e limites do fabricante condicionam quanto da bateria deve ser usado.</li>
    <li><strong>Comprar primeiro e calcular depois:</strong> uma bateria barata que não cubra o cenário real tende a provocar uma segunda compra.</li>
  </ul>

  <h2>O que verificar antes de comprar</h2>
  <p>Depois de obter Wh e Ah, confirma tensão nominal, corrente máxima de descarga do BMS, corrente de carga, proteção a baixa temperatura quando relevante, dimensões, terminais e compatibilidade com MPPT, DC-DC e carregador de 230 V. Se já tens uma autocaravana com AGM e queres mudar para lítio, trata a alteração como uma revisão do sistema de carga, não como uma simples troca física de bateria.</p>
</section>`,
    faq: Object.freeze([
      ["Quantos Ah preciso para dois dias numa autocaravana?", "Depende dos Wh consumidos por dia, da tensão e da química. Calcula primeiro Wh/dia, multiplica pela autonomia e só depois converte a capacidade nominal para Ah."],
      ["200 Ah são sempre melhores do que 100 Ah?", "Não. Sem conhecer a tensão, a química e o consumo, Ah isoladamente não permite comparar corretamente a energia útil disponível."],
      ["Posso substituir AGM por LiFePO4 sem alterar mais nada?", "Nem sempre. É necessário confirmar BMS, alternador ou DC-DC, carregador de 230 V, MPPT, cablagem e limites de carga do sistema existente."],
    ]),
  }),

  "/pt/guias/quantos-watts-paineis-solares-autocaravana/": Object.freeze({
    title: "Quantos watts de painéis solares para uma autocaravana?",
    description: "Calcula os Wp de painéis solares para autocaravana a partir dos Wh/dia, época do ano, perdas e espaço disponível no tejadilho.",
    body: `
<section data-search-growth-content="quantos-watts-paineis-solares-autocaravana">
  <h2>O número certo começa no consumo, não no tamanho do tejadilho</h2>
  <p>“200 W chegam?” só pode ser respondido depois de saber quanta energia precisas de repor. O dimensionamento do MyPowerSetup parte dos Wh/dia e usa horas solares equivalentes por época, 75% de eficiência global do sistema e uma margem adicional de 15%.</p>
  <p>A aproximação usada é <strong>Wp ≈ Wh/dia × 1,15 ÷ (horas solares equivalentes × 0,75)</strong>, seguida de arredondamento para cima. O objetivo é evitar que uma estimativa idealizada seja apresentada como produção garantida.</p>

  <h2>Exemplo: uma autocaravana que consome 900 Wh/dia</h2>
  <p>Com os pressupostos atuais da calculadora, o mesmo consumo produz resultados muito diferentes conforme a época:</p>
  <ul>
    <li><strong>Verão, 4,5 h equivalentes:</strong> cerca de 307 W teóricos → recomendação arredondada de aproximadamente 350 Wp.</li>
    <li><strong>Primavera/outono, 3 h:</strong> cerca de 460 W → aproximadamente 500 Wp.</li>
    <li><strong>Inverno, 1,5 h:</strong> cerca de 920 W → aproximadamente 950 Wp.</li>
  </ul>
  <p>Estes valores são um <strong>modelo de planeamento</strong>. Não significam que Portugal tenha as mesmas horas solares no Algarve, Porto, interior ou numa determinada semana. Para uma localização e mês concretos, compara o resultado com o <a href="https://joint-research-centre.ec.europa.eu/pvgis-online-tool_en" rel="external noopener">PVGIS da Comissão Europeia</a>, que fornece dados de radiação e desempenho fotovoltaico por localização.</p>

  <h2>O tejadilho pode ser o verdadeiro limitador</h2>
  <p>Antes de transformar Wp em compra, mede a área livre. Claraboias, antenas, ventilação, toldos e sombras reduzem o espaço útil. Dois painéis com a mesma potência podem ter dimensões e tensões muito diferentes. Guarda também espaço para fixação, cabos e manutenção.</p>
  <p>Se a potência calculada não cabe no tejadilho, a solução não é fingir que um painel menor produzirá a mesma energia. Revê o consumo e combina fontes: solar para estacionamento, DC-DC durante a condução e 230 V quando disponível.</p>

  <h2>Painéis em série ou em paralelo?</h2>
  <p>A ligação altera os limites que o MPPT precisa de suportar. Em série, as tensões somam; em paralelo, as correntes somam. Por isso Wp total não chega para validar um controlador. É obrigatório verificar Voc, Isc e o comportamento da tensão com temperatura. A documentação de controladores MPPT também alerta que o Voc do conjunto pode aumentar com temperaturas mais baixas.</p>

  <h2>Erros frequentes ao dimensionar solar para autocaravana</h2>
  <ul>
    <li>usar um único valor anual de sol para todas as épocas;</li>
    <li>ignorar sombras parciais de claraboias ou equipamentos no tejadilho;</li>
    <li>somar Wp sem verificar Voc e Isc do conjunto;</li>
    <li>assumir que a potência nominal do painel será entregue durante todas as horas de sol;</li>
    <li>dimensionar painéis sem relacionar a produção com a capacidade da bateria e as outras fontes de carga.</li>
  </ul>
</section>`,
    faq: Object.freeze([
      ["200 W de solar chegam para uma autocaravana?", "Podem chegar para um consumo baixo no verão, mas não existe uma resposta universal. O cálculo deve partir dos Wh/dia e da época em que a autocaravana será usada."],
      ["Portugal precisa de menos painéis do que outros países?", "Portugal tem bom recurso solar, mas produção varia por localização, mês, orientação, temperatura e sombra. Usa dados locais como PVGIS para validar o cenário."],
      ["Devo escolher os painéis antes do MPPT?", "Podes definir primeiro a potência solar necessária, mas a combinação final de painéis e MPPT deve ser validada em conjunto por Wp, Voc, Isc e tensão da bateria."],
    ]),
  }),

  "/pt/guias/lifepo4-vs-agm-autocaravana/": Object.freeze({
    title: "LiFePO4 ou AGM na autocaravana?",
    description: "LiFePO4 vs AGM para autocaravana: energia útil, capacidade necessária, peso, carga, BMS e o que verificar antes de substituir a bateria.",
    body: `
<section data-search-growth-content="lifepo4-vs-agm-autocaravana">
  <h2>A diferença relevante é a energia útil do sistema</h2>
  <p>LiFePO₄ e AGM não devem ser comparadas apenas por “100 Ah contra 100 Ah”. Para dimensionamento, importa a energia nominal, quanto dessa energia o projeto pretende utilizar e se o sistema de carregamento é compatível.</p>
  <p>O MyPowerSetup usa, como pressuposto conservador de projeto, <strong>80% de profundidade utilizável para LiFePO₄ e 50% para AGM/chumbo</strong>. Isto não afirma que todas as baterias tenham exatamente os mesmos limites; a ficha técnica e o BMS do modelo real continuam a ser a referência final.</p>

  <h2>Exemplo com a mesma necessidade de energia</h2>
  <p>Com 830 Wh/dia, dois dias de autonomia e 15% de margem, o nosso modelo pede aproximadamente 2,4 kWh nominais em LiFePO₄ e 3,9 kWh em AGM/chumbo. Ou seja, para este cenário, a solução de chumbo necessita de muito mais capacidade nominal para entregar a mesma reserva planeada.</p>
  <p>Esta diferença torna-se especialmente importante numa autocaravana porque capacidade adicional também significa espaço, massa e cablagem. O cálculo não substitui a verificação do peso real de cada bateria e da carga útil legal do veículo.</p>

  <h2>LiFePO₄ não é uma troca “plug and play” automática</h2>
  <p>Antes de substituir uma bateria de chumbo, verifica todos os caminhos de carga: alternador/relé ou DC-DC, controlador solar, carregador de 230 V e qualquer equipamento combinado. Confirma ainda corrente máxima de carga e descarga do BMS.</p>
  <p>Temperatura também importa. Controladores modernos podem ter configurações específicas para lítio e mecanismos de corte de carga a baixa temperatura; a necessidade concreta depende da bateria e do seu BMS. Nunca uses um perfil de carga só porque a tensão nominal parece semelhante.</p>

  <h2>Quando AGM ainda pode fazer sentido</h2>
  <p>AGM pode continuar a ser uma escolha racional num sistema pequeno, pouco utilizado, já compatível e onde custo inicial pesa mais do que massa, espaço ou maior capacidade utilizável. O objetivo não é declarar uma tecnologia vencedora para todos: é calcular o cenário e depois escolher a solução que o cumpre com menos compromissos.</p>

  <h2>Checklist antes da decisão</h2>
  <ul>
    <li>Wh/dia e dias reais de autonomia;</li>
    <li>tensão do banco: 12 ou 24 V;</li>
    <li>capacidade utilizável pretendida e limites do fabricante;</li>
    <li>corrente contínua e de pico exigida pelo inversor;</li>
    <li>corrente de carga de solar, DC-DC e 230 V;</li>
    <li>BMS, proteção de baixa temperatura e condições de instalação;</li>
    <li>peso, dimensões, terminais e ventilação quando aplicável.</li>
  </ul>
</section>`,
    faq: Object.freeze([
      ["LiFePO4 dá mais autonomia do que AGM com os mesmos Ah?", "Em muitos projetos, sim, porque uma fração maior da capacidade nominal é planeada como utilizável. O valor exato depende dos limites e do BMS da bateria real."],
      ["Preciso de DC-DC ao mudar para LiFePO4?", "Depende do veículo e do sistema existente. Alternadores inteligentes e limites de corrente da bateria podem tornar um carregador DC-DC necessário ou recomendável; verifica o projeto concreto."],
      ["AGM deixou de fazer sentido numa autocaravana?", "Não. Pode continuar a ser adequada para sistemas simples ou pouco utilizados, desde que capacidade, peso e carregamento cumpram o cenário real."],
    ]),
  }),

  "/pt/guias/como-escolher-controlador-mppt/": Object.freeze({
    title: "Como escolher um controlador MPPT para autocaravana",
    description: "Escolhe o MPPT da autocaravana por corrente de carga, potência solar, Voc, Isc, ligação série/paralelo e tensão da bateria.",
    body: `
<section data-search-growth-content="como-escolher-controlador-mppt">
  <h2>Um “30 A” não descreve sozinho o controlador</h2>
  <p>O nome de muitos MPPT combina dois limites diferentes: tensão máxima do lado fotovoltaico e corrente máxima de carga da bateria. Num modelo 100/30, por exemplo, 100 V refere-se ao limite de tensão PV e 30 A à corrente máxima de carga. Ambos têm de ser compatíveis com a instalação.</p>

  <h2>Começa pela corrente necessária do lado da bateria</h2>
  <p>Como aproximação de dimensionamento, o MyPowerSetup calcula a corrente a partir de potência solar ÷ tensão da bateria e adiciona margem. Por isso a mesma potência fotovoltaica exige aproximadamente metade da corrente num banco de 24 V comparado com 12 V.</p>
  <p>Exemplo: 400 Wp num sistema de 12 V representam cerca de 33 A antes da margem. Num sistema de 24 V representam cerca de 17 A. Isto explica por que um controlador adequado a 24 V pode ser insuficiente para a mesma potência de painéis num sistema de 12 V.</p>

  <h2>Depois valida Voc e Isc do conjunto</h2>
  <p>Em série, a tensão dos painéis soma; em paralelo, soma a corrente. O <strong>Voc máximo nunca deve ultrapassar o limite do controlador</strong>. A documentação técnica da Victron alerta também para o aumento de Voc em temperaturas abaixo das condições nominais, pelo que a verificação deve usar o coeficiente de temperatura do painel e a temperatura mínima plausível.</p>
  <p>O Isc do conjunto também precisa de permanecer dentro dos limites indicados pelo fabricante do MPPT. Não uses apenas a corrente no ponto de máxima potência para validar proteção e limite de curto-circuito.</p>

  <h2>Confirma a potência PV permitida para a tensão da bateria</h2>
  <p>O mesmo controlador pode aceitar potências fotovoltaicas nominais diferentes em 12 e 24 V. Por exemplo, a documentação oficial de um MPPT 100/30 especifica 440 W de potência PV nominal a 12 V e 880 W a 24 V. Usa sempre a ficha do modelo concreto, não uma regra genérica baseada apenas no nome.</p>

  <h2>Checklist de compatibilidade MPPT</h2>
  <ul>
    <li>tensão nominal da bateria suportada;</li>
    <li>corrente de carga igual ou superior à necessidade calculada;</li>
    <li>Voc máximo do conjunto, incluindo efeito de temperatura;</li>
    <li>Isc máximo do conjunto;</li>
    <li>potência PV permitida à tensão de bateria escolhida;</li>
    <li>perfil de carga compatível com a química e recomendações da bateria;</li>
    <li>cablagem, proteção, ventilação e montagem conforme manual.</li>
  </ul>
  <p>Referência técnica: <a href="https://www.victronenergy.com/media/pg/Manual_BlueSolar_100-30__100-50/en/technical-specifications.html" rel="external noopener">especificações oficiais MPPT 100/30 e 100/50</a>.</p>
</section>`,
    faq: Object.freeze([
      ["Que MPPT preciso para 400 W de painéis a 12 V?", "A corrente teórica é cerca de 33 A antes de margem, mas a escolha final também depende de Voc, Isc, potência PV permitida e especificações do controlador."],
      ["Posso ligar painéis em série num MPPT?", "Sim, se o Voc total, incluindo o efeito de temperatura, ficar abaixo do limite do controlador e os restantes limites elétricos forem respeitados."],
      ["Um MPPT 100/30 aceita sempre 800 W de painéis?", "Não. A potência PV permitida depende também da tensão da bateria. Verifica a tabela técnica do modelo concreto."],
    ]),
  }),

  "/pt/guias/inversor-autocaravana-potencia/": Object.freeze({
    title: "Que potência de inversor preciso na autocaravana?",
    description: "Dimensiona inversor 230 V para autocaravana por potência contínua, pico de arranque, onda sinusoidal pura, tensão 12/24 V e corrente DC.",
    body: `
<section data-search-growth-content="inversor-autocaravana-potencia">
  <h2>O melhor inversor não é simplesmente o de maior potência</h2>
  <p>Um inversor deve cobrir os equipamentos AC que podem funcionar em simultâneo e os picos de arranque relevantes. Sobredimensionar muito aumenta custo e pode aumentar consumo em vazio; subdimensionar provoca desligamentos justamente quando a carga mais exigente arranca.</p>

  <h2>Potência contínua e pico são requisitos diferentes</h2>
  <p>O MyPowerSetup identifica a maior carga AC, considera parte das outras cargas que podem coincidir e aplica margem. Também compara o pico de arranque informado para cargas com motor ou compressor. O resultado é arredondado para cima, mas continua a ser um requisito — a ficha do inversor real deve confirmar tanto potência contínua como capacidade de pico.</p>

  <h2>Exemplo: 1 500 W num sistema de 12 V</h2>
  <p>Mesmo ignorando perdas, 1 500 W ÷ 12 V correspondem a cerca de <strong>125 A no lado DC</strong>. Com perdas reais do inversor a corrente será maior. Em 24 V, a mesma potência parte de cerca de 62,5 A. É por isso que um inversor potente não pode ser escolhido isoladamente da bateria, BMS, cabos, fusíveis e tensão do sistema.</p>

  <h2>Porque exigimos evidência de onda sinusoidal pura</h2>
  <p>Para recomendações comerciais, o MyPowerSetup prefere falhar sem produto a apresentar um inversor cuja forma de onda não esteja suficientemente comprovada. Equipamentos eletrónicos, carregadores e motores podem comportar-se pior com formas de onda modificadas; a especificação real deve declarar explicitamente a tecnologia.</p>

  <h2>Checklist antes da compra</h2>
  <ul>
    <li>tensão DC de entrada igual à tensão do banco de baterias;</li>
    <li>potência contínua suficiente para o cenário simultâneo;</li>
    <li>pico de arranque suficiente para a carga mais exigente;</li>
    <li>onda sinusoidal pura quando necessária;</li>
    <li>corrente contínua e de pico permitida pelo BMS;</li>
    <li>cabos, terminais, fusível e interruptor dimensionados para a corrente DC;</li>
    <li>consumo em vazio e estratégia para desligar o inversor quando não é necessário.</li>
  </ul>
</section>`,
    faq: Object.freeze([
      ["Um inversor de 2000 W serve para um equipamento de 300 W?", "Pode funcionar tecnicamente se todos os outros parâmetros forem compatíveis, mas pode ser desnecessariamente sobredimensionado. O MyPowerSetup evita recomendar produtos muito acima do requisito calculado."],
      ["Porque 24 V ajuda com inversores potentes?", "Para a mesma potência, duplicar a tensão reduz aproximadamente para metade a corrente DC, o que pode simplificar perdas e cablagem."],
      ["Preciso sempre de inversor numa autocaravana?", "Não. Se todos os consumidores relevantes forem DC, um inversor de 230 V pode ser dispensável."],
    ]),
  }),
});

function faqHtml(items) {
  return `<section class="related" data-search-faq><h2>Perguntas frequentes</h2>${items.map(([question, answer]) => `<h3>${question}</h3><p>${answer}</p>`).join("")}</section>`;
}

function schema(entry, route) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: entry.title,
        description: entry.description,
        mainEntityOfPage: `https://mypowersetup.com${route}`,
        inLanguage: "pt-PT",
        publisher: { "@type": "Organization", name: "MyPowerSetup", url: "https://mypowersetup.com/" },
      },
      {
        "@type": "FAQPage",
        mainEntity: entry.faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");
}

export function enhanceExpansionSearchContent(html, market, route) {
  if (market !== "pt" || typeof html !== "string") return html;
  const entry = PT_GROWTH_CONTENT[route];
  if (!entry || html.includes("data-search-growth-content=")) return html;
  if (!html.includes('<aside class="cta">') || !html.includes("</head>")) return html;

  let output = html.replace('<aside class="cta">', `${entry.body}${faqHtml(entry.faq)}<aside class="cta">`);
  output = output.replace("</head>", `<script type="application/ld+json" data-search-growth-schema>${schema(entry, route)}</script></head>`);
  return output;
}

export const PT_SEARCH_GROWTH_ROUTES = Object.freeze(Object.keys(PT_GROWTH_CONTENT));
