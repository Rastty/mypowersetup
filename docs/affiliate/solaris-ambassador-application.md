# Solaris Store — Ambassador application packet

Status: **READY_TO_SUBMIT**
Priority: **P0 — highest standalone purchase-ready unlock for PT/RO/SI**
Verified: 2026-09-07

## Application

Use the first-party Solaris ambassador form:

- Programme evidence: https://www.solaris-store.com/content/95-partenariat
- Application form: https://www.solaris-store.com/contact?id=partenariat-ambassadeur

### Suggested French message

Bonjour,

Je souhaite rejoindre votre programme Ambassadeur pour MyPowerSetup.com, un site indépendant consacré au dimensionnement des systèmes électriques pour vans, fourgons aménagés et camping-cars.

MyPowerSetup propose des calculateurs et des guides techniques pour aider les utilisateurs à choisir correctement la batterie, les panneaux solaires, le régulateur MPPT, le convertisseur, les chargeurs DC-DC et 230 V selon leur consommation et leur usage réel.

Le site est déjà localisé pour plusieurs marchés européens, notamment le Portugal, la Roumanie et la Slovénie. Nous souhaitons recommander des produits Solaris uniquement lorsqu'ils correspondent précisément aux besoins calculés de l'utilisateur.

Nous sommes particulièrement intéressés par les convertisseurs Victron Phoenix 12/250 et 24/250, qui correspondent très bien à certains scénarios camping-car de faible puissance.

Pouvez-vous nous confirmer :
1. le fonctionnement du suivi d'affiliation et la possibilité de créer des liens profonds vers une fiche produit précise ;
2. les conditions / taux de commission du programme Ambassadeur ;
3. la possibilité d'expédier ces produits au Portugal, en Roumanie et en Slovénie, ainsi que les éventuelles conditions particulières pour ces destinations ?

Merci et au plaisir de collaborer avec vous.

L'équipe MyPowerSetup
https://mypowersetup.com/

## Exact products to activate after approval

### Family touring — first priority
- Candidate: `solaris-victron-phoenix-12-250`
- Product: Victron Phoenix 12/250 VE.Direct IEC
- Exact retail page: https://www.solaris-store.com/2333-phoenix-inverter-12-250-230v-vedirect-iec-victron-pin121251100.html
- System voltage: 12 V
- Continuous power: 200 W
- Peak power: 400 W
- Waveform: pure sine
- Commercial impact: standalone unlock weight **5**

### Remote work — second priority
- Candidate: `solaris-victron-phoenix-24-250`
- Product: Victron Phoenix 24/250 VE.Direct Schuko
- Exact retail page: https://www.solaris-store.com/8005-onduleur-victron-phoenix-24-250va-vedirect-schucko.html
- System voltage: 24 V
- Continuous power: 200 W
- Peak power: 350 W
- Waveform: pure sine
- Commercial impact: affected weight **3**

## Evidence already verified

- Solaris runs a first-party Ambassador programme aimed at bloggers, vanlife/camping-car and travel creators.
- The store is operational again and current product/category pages expose ordering controls and shipping lead times.
- Solaris states it distributes/exports throughout Europe.
- Portugal and Romania are explicitly named among European export zones on Solaris distributor pages.
- Country-specific online checkout for PT/RO/SI is still intentionally treated as unverified.
- Affiliate tracking/deeplink format is still intentionally treated as unverified.

## Activation checklist after Solaris replies

Do **not** publish a Solaris product until all applicable items below are verified:

- [ ] Ambassador application approved
- [ ] commission / commercial terms recorded
- [ ] exact affiliate tracking mechanism recorded
- [ ] exact-product deep link for Phoenix 12/250 verified
- [ ] exact-product deep link for Phoenix 24/250 verified
- [ ] Portugal shipping/checkout verified
- [ ] Romania shipping/checkout verified
- [ ] Slovenia shipping/checkout verified
- [ ] candidate onboarding statuses updated
- [ ] fail-closed Solaris affiliate adapter added
- [ ] PT/RO/SI catalog sync and runtime validation added
- [ ] full CI green
- [ ] commercial opportunity report confirms inverter unlock
