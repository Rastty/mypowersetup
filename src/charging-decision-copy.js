// Keep charging decision explanations aligned across the four calculator locales.
// A required current below the battery limit can still need individual design:
// the next standard charger may be larger than that limit.
export function chargingDecisionExplanation(option, locale, formattedHours = option.hours) {
  const required = option.requiredCurrentAmps;
  const ceiling = option.planningCeilingAmps;
  const candidate = option.candidateCurrentAmps;

  switch (locale) {
    case "sk":
      if (option.suggestedCurrentAmps) return `Na doplnenie dennej spotreby za ${formattedHours} h vychádza najmenej ${required} A pri započítaní 90% účinnosti.`;
      if (candidate) return `Na doplnenie dennej spotreby za ${formattedHours} h treba najmenej ${required} A, ale najbližšia štandardná nabíjačka ${candidate} A prekračuje konzervatívny plánovací limit ${ceiling} A pre túto batériu. Potrebný je individuálny návrh.`;
      return `Na doplnenie dennej spotreby za ${formattedHours} h treba najmenej ${required} A; v použitej orientačnej rade nie je dostatočne výkonná štandardná nabíjačka. Potrebný je individuálny návrh.`;
    case "pl":
      if (option.suggestedCurrentAmps) return `Aby uzupełnić dzienne zużycie w ${formattedHours} h, potrzeba co najmniej ${required} A przy sprawności 90%.`;
      if (candidate) return `Aby uzupełnić dzienne zużycie w ${formattedHours} h, potrzeba co najmniej ${required} A, ale najbliższy standardowy prąd ładowarki ${candidate} A przekracza konserwatywny limit projektowy ${ceiling} A dla tego akumulatora. Potrzebny jest projekt indywidualny.`;
      return `Aby uzupełnić dzienne zużycie w ${formattedHours} h, potrzeba co najmniej ${required} A; w przyjętej orientacyjnej serii nie ma ładowarki o wystarczającym prądzie. Potrzebny jest projekt indywidualny.`;
    case "hu":
      if (option.suggestedCurrentAmps) return `A napi fogyasztás ${formattedHours} óra alatti pótlásához 90%-os hatásfokkal legalább ${required} A szükséges.`;
      if (candidate) return `A napi fogyasztás ${formattedHours} óra alatti pótlásához legalább ${required} A szükséges, de a következő szokásos ${candidate} A-es töltő meghaladja az akkumulátor óvatos tervezési határát (${ceiling} A). Egyedi méretezés szükséges.`;
      return `A napi fogyasztás ${formattedHours} óra alatti pótlásához legalább ${required} A szükséges; a figyelembe vett szokásos töltők között nincs elég nagy teljesítményű. Egyedi méretezés szükséges.`;
    case "cs":
    default:
      if (option.suggestedCurrentAmps) return `Pro doplnění denní spotřeby za ${formattedHours} h vychází nejméně ${required} A při započtení 90% účinnosti.`;
      if (candidate) return `Pro doplnění denní spotřeby za ${formattedHours} h je třeba nejméně ${required} A, ale nejbližší standardní nabíječka ${candidate} A překračuje konzervativní plánovací limit ${ceiling} A pro tuto baterii. Je nutný individuální návrh.`;
      return `Pro doplnění denní spotřeby za ${formattedHours} h je třeba nejméně ${required} A; v použité orientační řadě není dostatečně výkonná standardní nabíječka. Je nutný individuální návrh.`;
  }
}
