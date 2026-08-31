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
  "/pt/guias/carregador-dc-dc-autocaravana/": Object.freeze({
    title: "Como escolher um carregador DC-DC para autocaravana?",
    description: "Dimensiona o carregador DC-DC da autocaravana pela bateria, alternador, horas de condução, sistema 12/24 V e comportamento do alternador inteligente.",
    body: `
<section data-search-growth-content="carregador-dc-dc-autocaravana">
  <h2>Resposta curta: 30 A ou 50 A não se escolhem apenas pelos Ah da bateria</h2>
  <p>Um carregador DC-DC controla a energia que passa do sistema de arranque para a bateria de serviço. A corrente correta fica limitada por três elementos: <strong>a reserva térmica e elétrica do alternador, a corrente de carga permitida pela bateria/BMS e a energia que pretendes recuperar durante as horas reais de condução</strong>. O menor destes limites deve prevalecer.</p>
  <p>Num sistema de 12 V, uma saída de 30 A perto da tensão de carga representa aproximadamente 400–450 W; 50 A representam aproximadamente 700 W. Duas horas de viagem podem, em condições favoráveis, acrescentar perto de 0,8 kWh ou 1,4 kWh antes de perdas, redução térmica e fase final de carga. Não uses estes números como promessa: a corrente pode diminuir por temperatura, limites de entrada, estado da bateria ou configuração.</p>

  <h2>Alternador inteligente: verifica o método de ativação</h2>
  <p>Alternadores controlados pela ECU não mantêm sempre uma tensão fixa. O manual atual do <a href="https://www.victronenergy.com/upload/documents/Orion_XS_12-12-70A_DC-DC_Battery_Charger/124067-Orion_XS_DC-DC_battery_charger-pdf-en.pdf" rel="external noopener">Victron Orion XS</a> descreve variações típicas entre 12,5 e 15 V e avisa que estratégias Euro 6 podem desligar o alternador durante a condução. Por isso, “compatível com alternador inteligente” não basta: confirma deteção de motor, limiares de tensão e, quando necessário, sinal de ignição ou comando externo segundo o manual do veículo e do carregador.</p>
  <p>Desativar a deteção do motor sem um comando correto pode permitir consumo da bateria de arranque com o motor parado. O objetivo é carregar em viagem sem descarregar o sistema de arranque.</p>

  <h2>Porque a carga direta pode ser inadequada para LiFePO₄</h2>
  <p>Uma bateria de lítio com baixa resistência interna pode aceitar corrente elevada. A documentação oficial do <a href="https://www.victronenergy.com/upload/documents/Orion-Tr_Smart_DC-DC_Charger_-_Isolated/34439-Orion-Tr_Smart_DC-DC_Charger-pdf-en.pdf" rel="external noopener">Orion-Tr Smart</a> explica que a carga controlada protege o alternador e fornece um perfil de carga definido. Isso não significa que qualquer DC-DC resolva qualquer instalação: a corrente contínua, ventilação, temperatura, BMS e cablagem continuam a ser limites reais.</p>

  <h2>Exemplo de planeamento: repor 900 Wh durante a viagem</h2>
  <p>Se queres recuperar 900 Wh e conduzes três horas, a potência média útil necessária é cerca de 300 W. Um carregador de 30 A num sistema de 12 V pode estar na ordem de grandeza correta, desde que alternador e bateria suportem a carga. Se só conduzes uma hora, aumentar a corrente pode parecer atraente, mas só é válido depois de confirmar a reserva do alternador, a corrente máxima da bateria e a dissipação térmica.</p>
  <p>Num sistema 12→24 V, não compares apenas os amperes de saída. A potência vem do lado de entrada: a corrente retirada do alternador de 12 V será superior à corrente entregue à bateria de 24 V, acrescida das perdas. Entrada e saída precisam de cabos e proteção próprios.</p>

  <h2>Checklist antes de comprar</h2>
  <ul>
    <li>tensão de entrada e de saída: 12→12, 12→24 ou outra combinação realmente necessária;</li>
    <li>corrente contínua disponível à temperatura de instalação, não apenas o valor de marketing;</li>
    <li>corrente de carga permitida pela bateria, BMS e fabricante;</li>
    <li>capacidade do alternador e cargas que o veículo já alimenta;</li>
    <li>compatibilidade com alternador inteligente e método de deteção do motor;</li>
    <li>perfil de carga para LiFePO₄, AGM ou outra química;</li>
    <li>modelo isolado ou não isolado conforme a arquitetura e as instruções do fabricante;</li>
    <li>fusível e secção de cabo em ambos os lados, calculados pela corrente, comprimento, queda de tensão e método de instalação;</li>
    <li>ventilação, redução térmica, localização e proteção contra água.</li>
  </ul>
  <p>Não copies um valor de fusível ou cabo de outra autocaravana. Usa as recomendações do fabricante como ponto de partida e valida a instalação real com um profissional quando não conheces a arquitetura do veículo.</p>
</section>`,
    faq: Object.freeze([
      ["Que carregador DC-DC escolher para uma bateria LiFePO4 de 100 Ah?", "Não existe uma corrente universal. Confirma a corrente de carga permitida pela bateria e BMS, a reserva do alternador, as horas de condução, a temperatura e a cablagem; 20 A, 30 A ou 50 A podem ser corretos em sistemas diferentes."],
      ["Preciso de DC-DC com alternador inteligente?", "É frequentemente a solução controlada para tensão variável, mas deves confirmar a estratégia do veículo, a deteção de motor e o método de ativação indicado pelo fabricante."],
      ["Posso ligar diretamente a bateria LiFePO4 ao alternador?", "Não assumas que é seguro. A baixa resistência da bateria pode exigir controlo de corrente para proteger o alternador e aplicar o perfil de carga correto."],
    ]),
  }),

  "/pt/guias/carregador-230v-bateria-autocaravana/": Object.freeze({
    title: "Como escolher um carregador 230 V para a bateria da autocaravana",
    description: "Dimensiona o carregador de cais 230 V por química, capacidade, tempo disponível e limite do BMS, com exemplos para LiFePO4 e AGM.",
    body: `
<section data-search-growth-content="carregador-230v-bateria-autocaravana">
  <h2>Resposta curta: escolhe amperes pelo tempo de carga e pelos limites da bateria</h2>
  <p>Um carregador de 230 V transforma a alimentação do parque de campismo numa carga DC controlada. A corrente correta não depende apenas dos Ah impressos na bateria: confirma a química, a corrente máxima recomendada pelo fabricante, o limite do BMS, o tempo habitual ligado à rede e os consumos que ficam ativos durante a carga.</p>
  <p>Como primeira estimativa, <strong>tempo ideal em horas ≈ energia a repor em Ah ÷ corrente do carregador</strong>. Na prática será maior por causa das perdas, da fase de absorção e dos consumos simultâneos.</p>

  <h2>Exemplo: bateria LiFePO₄ de 200 Ah</h2>
  <p>Se for preciso repor 120 Ah, um carregador de 20 A precisa de pelo menos 6 horas ideais; um de 30 A, pelo menos 4 horas. Se o frigorífico, iluminação e eletrónica usarem 5 A enquanto estás ligado, um carregador de 20 A deixa aproximadamente 15 A líquidos para a bateria.</p>
  <p>Não subas automaticamente para 50 A. A bateria e o BMS têm de aceitar essa corrente, a cablagem DC tem de suportá-la e o carregador precisa de ventilação para não reduzir a potência por temperatura.</p>

  <h2>LiFePO₄ e AGM precisam de perfis diferentes</h2>
  <p>Seleciona um perfil explicitamente compatível com a química instalada. Tensão de absorção, manutenção e comportamento a baixa temperatura não devem ser copiados de outra bateria. Em LiFePO₄, o BMS ou um sensor compatível deve impedir carga abaixo da temperatura permitida pelo fabricante.</p>
  <p>O <a href="https://www.victronenergy.com/upload/documents/Blue_Smart_IP65_Charger_230V_manual/181363-Blue_Smart_Charger-pdf-pt.pdf">manual oficial do Victron Blue Smart IP65 230 V</a> documenta os modos de carga e a configuração do equipamento. Usa sempre o manual da versão exata que compras.</p>

  <h2>Uma saída ou duas saídas</h2>
  <p>Uma saída é suficiente quando o carregador alimenta apenas a bateria de serviço. Uma segunda saída pode ser útil para manutenção da bateria de arranque, mas não substitui um esquema correto de separação e proteção. Confirma se as saídas são independentes e qual a corrente realmente disponível em cada uma.</p>

  <h2>Potência do carregador e ligação ao cais</h2>
  <p>Um carregador de 12 V e 30 A entrega cerca de 430 W na fase forte de carga; com perdas, pede mais à entrada AC. Soma frigorífico, aquecimento, chaleira e restantes cargas antes de assumir que a tomada do parque suporta tudo. A corrente indicada no pedestal e a proteção do veículo são limites, não metas de utilização.</p>

  <h2>230 V exige proteção própria</h2>
  <p>A entrada de cais deve ter proteção diferencial e disjuntor dimensionados para a instalação, ligação de terra e cabos adequados. O <a href="https://www.victronenergy.com/upload/documents/VE-Direct-drawing-with-IP43-Smart-Charger-12_50-1-Inverter-375W-2x125Ah-SC-AGM-MPPT-100_30-Argofet-Isolator-BMV-712.pdf">esquema oficial Victron com carregador IP43</a> mostra proteção MCB/RCD na entrada AC e recomenda ajustar cabos e fusíveis à instalação.</p>
  <p><strong>230 V pode matar.</strong> Se não tens competência para verificar terra, diferencial, polaridade, separação AC/DC e regras locais, entrega esta parte a um eletricista qualificado.</p>

  <h2>Checklist antes da compra</h2>
  <ul>
    <li>12 V ou 24 V igual à tensão da bateria de serviço;</li>
    <li>perfil compatível com LiFePO₄, AGM ou chumbo;</li>
    <li>corrente permitida pela bateria e pelo BMS;</li>
    <li>tempo real disponível no cais e cargas simultâneas;</li>
    <li>compensação ou bloqueio por baixa temperatura quando necessário;</li>
    <li>ventilação, ruído, dimensões e grau de proteção do local;</li>
    <li>secção de cabo DC e fusível junto da bateria segundo o manual;</li>
    <li>proteção diferencial, disjuntor e terra no lado AC.</li>
  </ul>

  <h2>Liga o carregador ao sistema completo</h2>
  <p>Usa a <a href="/pt/#calculator-preview">calculadora da autocaravana</a> para estimar bateria e consumo diário. Depois confirma a cablagem no <a href="/pt/guias/cabos-fusiveis-12v-autocaravana/">guia de cabos e fusíveis</a> e combina rede, solar e alternador sem ultrapassar a corrente de carga total aceite pela bateria.</p>
</section>`,
    faq: Object.freeze([
      ["Quantos amperes deve ter um carregador 230 V para 200 Ah LiFePO4?", "Depende do limite da bateria e BMS e do tempo disponível. Para repor 120 Ah, 20 A representam pelo menos 6 horas ideais e 30 A pelo menos 4 horas, antes de perdas e consumos simultâneos."],
      ["Posso usar um carregador AGM numa bateria LiFePO4?", "Só se o fabricante confirmar um perfil LiFePO4 adequado. Não assumes compatibilidade apenas porque a tensão nominal é 12 V."],
      ["Preciso de eletricista para instalar a entrada de cais?", "Se não consegues verificar proteção diferencial, disjuntor, terra, cabos e regras locais, sim. A instalação de 230 V não é uma tarefa segura para tentativa e erro."],
    ]),
  }),


  "/pt/guias/cabos-fusiveis-12v-autocaravana/": Object.freeze({
    title: "Cabos e fusíveis 12 V na autocaravana: dimensionamento sem atalhos",
    description: "Calcula corrente, queda de tensão, secção de cabo e proteção de cada circuito 12/24 V, com um exemplo de inversor de 1 000 W.",
    body: `
<section data-search-growth-content="cabos-fusiveis-12v-autocaravana">
  <h2>Resposta curta: dimensiona cada circuito pela corrente e pelo percurso completo</h2>
  <p>Não existe uma secção de cabo universal para “uma bateria de 200 Ah”. O cabo é escolhido para a <strong>corrente máxima do circuito, comprimento total de ida e volta, queda de tensão admissível, temperatura, agrupamento e método de instalação</strong>. O fusível protege o cabo contra sobrecorrente; não transforma um cabo subdimensionado num circuito seguro.</p>
  <p>Começa pela corrente: em DC, <strong>I ≈ P ÷ (V × eficiência)</strong>. Para estimar a queda num condutor de cobre podes usar ΔV ≈ 2 × comprimento de ida × corrente × 0,0175 ÷ secção em mm². É uma triagem de projeto, não substitui a tabela e os limites do fabricante.</p>

  <h2>Exemplo: inversor de 1 000 W num sistema de 12 V</h2>
  <p>Com 90% de eficiência, 1 000 W exigem cerca de <strong>92,6 A</strong> da bateria. Num percurso de 3 m numa direção, portanto 6 m elétricos de ida e volta, um cabo de cobre de 35 mm² tem queda teórica de aproximadamente 0,28 V, ou 2,3% a 12 V. Com 25 mm² seriam cerca de 0,39 V, ou 3,2%, antes de perdas em terminais, fusíveis e interruptores.</p>
  <p>Num sistema de 24 V a corrente para a mesma potência cai para cerca de 46,3 A. Isso reduz a queda relativa e as perdas, mas não autoriza copiar automaticamente a secção: confirma sempre corrente admissível, percurso, temperatura e terminais do equipamento.</p>

  <h2>O comprimento é ida e volta</h2>
  <p>Se a bateria está a 3 m do inversor, o circuito não tem 3 m elétricos: a corrente percorre o positivo e regressa pelo negativo. Em instalações que usam chassis, a resistência das ligações e os pontos de massa continuam a fazer parte do circuito. Para dimensionamento conservador, mede o trajeto real de ambos os condutores.</p>

  <h2>O fusível protege o cabo</h2>
  <p>Coloca a proteção tão perto da fonte quanto o projeto e as regras aplicáveis permitirem. O valor deve suportar a corrente normal e os picos legítimos, sem exceder a capacidade do cabo, dos terminais ou do equipamento. Cada derivação precisa de proteção própria; um fusível principal não substitui os fusíveis dos ramais.</p>
  <p>O <a href="https://www.victronenergy.com/upload/documents/BatteryProtect_12V_24V/114439-Smart_BatteryProtect-pdf-en.pdf">manual oficial Victron BatteryProtect</a> exige um fusível corretamente dimensionado entre a bateria e o equipamento e alerta para cabos longos ou subdimensionados. Usa o manual do componente real para confirmar a proteção e o binário dos terminais.</p>

  <h2>Queda de tensão muda conforme a carga</h2>
  <ul>
    <li><strong>Inversor:</strong> corrente alta e picos; ligação curta e robusta.</li>
    <li><strong>MPPT e carregadores:</strong> queda excessiva altera a tensão que o equipamento mede na bateria.</li>
    <li><strong>Frigorífico e bomba:</strong> arranque pode provocar desligamentos se a tensão cair demasiado.</li>
    <li><strong>Iluminação e USB:</strong> menor corrente, mas cada ramal continua protegido.</li>
  </ul>
  <p>O <a href="https://www.victronenergy.com/upload/documents/Manual_SmartSolar_MPPT_100-30__100-50/29694-MPPT_solar_charger_manual-pdf-en.pdf">manual oficial SmartSolar MPPT</a> inclui a queda de tensão e as ligações defeituosas entre as causas de mau funcionamento. Dimensiona positivo e negativo para a mesma corrente.</p>

  <h2>Terminais, barramentos e desconexão</h2>
  <p>Uma secção correta pode falhar com cravação deficiente, terminal incompatível, parafuso solto ou barramento sem capacidade. Usa terminais adequados ao cabo e ao perno, ferramenta de cravar correta, proteção contra abrasão, alívio de tração e o binário indicado pelo fabricante. Planeia também um seccionador e acesso seguro para manutenção.</p>

  <h2>Não copies um esquema sem medir a tua instalação</h2>
  <p>O <a href="https://www.victronenergy.com/upload/documents/Van-Motorhome-Manual-%26-Drawing-3-monitoring-setups-MultiPlus-3kVA-12V-230V-50Hz-Li-SuperPack-NG.pdf">manual e esquema oficial Victron para van/motorhome</a> explica por que não apresenta uma única secção válida: o fabricante não conhece as distâncias físicas de cada projeto. O mesmo princípio aplica-se aos valores de fusível.</p>
  <p>Não mistures a cablagem DC deste guia com a instalação de cais 230 V. Rede AC, terra e diferencial exigem projeto e verificação próprios por pessoa qualificada.</p>

  <h2>Checklist antes de comprar cabo e proteção</h2>
  <ul>
    <li>potência contínua, pico e eficiência de cada carga;</li>
    <li>tensão do sistema e corrente máxima calculada;</li>
    <li>comprimento real do positivo e do negativo;</li>
    <li>queda de tensão alvo e secção disponível nos terminais;</li>
    <li>capacidade do cabo nas condições reais de temperatura e agrupamento;</li>
    <li>fusível principal e fusível de cada ramal;</li>
    <li>capacidade dos barramentos, interruptores e porta-fusíveis;</li>
    <li>binário, cravação, ventilação e proteção mecânica.</li>
  </ul>

  <h2>Parte do cálculo do sistema, não da secção “habitual”</h2>
  <p>Usa a <a href="/pt/#calculator-preview">calculadora da autocaravana</a> para obter bateria, solar e inversor. Depois aplica corrente e percurso a cada circuito e confirma os limites nos guias de <a href="/pt/guias/inversor-autocaravana-potencia/">inversor</a>, <a href="/pt/guias/como-escolher-controlador-mppt/">MPPT</a> e <a href="/pt/guias/carregador-dc-dc-autocaravana/">DC-DC</a>.</p>
</section>`,
    faq: Object.freeze([
      ["Que secção de cabo preciso para um inversor de 1 000 W a 12 V?", "Depende do comprimento, eficiência, queda admissível, temperatura e terminais. No exemplo de 3 m numa direção e 92,6 A, 35 mm² dá cerca de 2,3% de queda teórica; confirma sempre as tabelas e o manual do inversor."],
      ["O fusível deve ser escolhido pela potência do aparelho?", "A corrente da carga é uma entrada, mas o fusível deve proteger o cabo e respeitar também terminais, picos legítimos e limites do fabricante. Cada ramal precisa de proteção adequada."],
      ["Posso usar o chassis como negativo?", "Só quando a arquitetura do veículo e as regras aplicáveis o permitem. Tens de considerar resistência, ligações, corrosão e capacidade dos pontos de massa; não assumas que o chassis elimina o percurso de retorno."],
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
