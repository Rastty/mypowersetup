// Scenario-first entry for the Czech caravan advisor.
// Reuses the existing, editable usage profiles and their full safety/analytics path.
const reset = document.querySelector("#start-over");
const next = document.querySelector('.form-step[data-step="1"] [data-next]');
for (const link of document.querySelectorAll("[data-caravan-profile]")) {
  link.addEventListener("click", (event) => {
    const id = link.dataset.caravanProfile;
    const profile = document.querySelector(`#usage-profiles [data-usage-profile="${id}"]`);
    if (!reset || !next || !profile) return; // native #kalkulator link remains usable
    event.preventDefault();
    reset.click(); // clears any older calculation, offers and shared URL
    next.click();  // opens the editable appliance step via existing navigation
    profile.click(); // applies the canonical preset including season and autonomy
  });
}
