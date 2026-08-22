const COPY = {
  cs: {
    title: "MyPowerSetup — orientační návrh",
    daily: "Denní spotřeba",
    battery: "Baterie",
    solar: "Solární panely",
    inverter: "Měnič",
    noInverter: "není nutný",
    controller: "MPPT regulátor",
    warning: "Orientační výsledek — před realizací ověřte parametry, jištění a kabeláž.",
    locale: "cs-CZ",
    url: "https://mypowersetup.com/",
  },
  sk: {
    title: "MyPowerSetup — orientačný návrh",
    daily: "Denná spotreba",
    battery: "Batéria",
    solar: "Solárne panely",
    inverter: "Menič",
    noInverter: "nie je potrebný",
    controller: "MPPT regulátor",
    warning: "Orientačný výsledok — pred realizáciou overte parametre, istenie a kabeláž.",
    locale: "sk-SK",
    url: "https://mypowersetup.com/sk/",
  },
};

export function buildResultShareText(result, language = "cs") {
  const copy = COPY[language] || COPY.cs;
  const daily = result.dailyWh >= 1000
    ? `${(result.dailyWh / 1000).toLocaleString(copy.locale, { maximumFractionDigits: 2 })} kWh`
    : `${Math.round(result.dailyWh).toLocaleString(copy.locale)} Wh`;
  const inverter = result.inverterWatts ? `${result.inverterWatts} W` : copy.noInverter;

  return [
    copy.title,
    `${copy.daily}: ${daily}`,
    `${copy.battery}: ${result.batteryAh} Ah (${result.systemVoltage} V, ${result.batteryLabel})`,
    `${copy.solar}: ${result.solarWatts} Wp`,
    `${copy.inverter}: ${inverter}`,
    `${copy.controller}: ${result.controllerAmps} A`,
    "",
    copy.warning,
    copy.url,
  ].join("\n");
}

export async function copyText(text, environment = globalThis) {
  try {
    if (environment.navigator?.clipboard?.writeText) {
      await environment.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path used on HTTP and older browsers.
  }

  const document = environment.document;
  if (!document?.body || typeof document.execCommand !== "function") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}
