// Model of electrical demand, not actual measured refrigerator consumption.
function numberInRange(value,min,max) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export function estimateFridgeConsumption(input = {}) {
  const voltage = numberInRange(input.voltage,12,24);
  const amps = numberInRange(input.amps,0.1,30);
  const duty = numberInRange(input.duty,0,100);
  const otherWh = numberInRange(input.otherWh,0,20000);
  if (![12,24].includes(voltage) || amps === null || duty === null || otherWh === null ||
      !Number.isInteger(duty) || !Number.isInteger(otherWh) ||
      Math.abs(amps * 10 - Math.round(amps * 10)) > 1e-8) return null;
  // Integer arithmetic in tenths of A, percent and 24 hours avoids upward rounding
  // a result exactly on a 10Wh step due to binary floating point noise.
  const fridgeMilliWh = voltage * Math.round(amps * 10) * 24 * duty;
  const totalMilliWh = fridgeMilliWh + otherWh * 1000;
  const handoffWh = Math.ceil(totalMilliWh / 10000) * 10;
  return Object.freeze({
    fridgeWh: fridgeMilliWh / 1000,
    totalWh: totalMilliWh / 1000,
    handoffWh: totalMilliWh >= 50000 && totalMilliWh <= 20000000 ? handoffWh : null,
  });
}
