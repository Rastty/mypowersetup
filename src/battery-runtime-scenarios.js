// Local caravan runtime presets. Only daily consumption changes; battery settings stay editable.
const root = document.querySelector('[data-calculator-intent="battery-autonomy"]');
const form = root?.querySelector('[data-calculator-form]');
const preset = form?.querySelector('[data-runtime-scenario]');
const daily = form?.elements.namedItem('dailyWh');
const allowed = new Set(['550', '880', '1050', '1400']);
if (preset && daily) {
  preset.closest('[data-runtime-scenario-field]').hidden = false;
  preset.addEventListener('change', () => {
    if (!allowed.has(preset.value)) return;
    daily.value = preset.value;
    daily.dispatchEvent(new Event('input', { bubbles: true }));
  });
  daily.addEventListener('input', () => {
    if (daily.value !== preset.value) preset.value = '';
  });
}
