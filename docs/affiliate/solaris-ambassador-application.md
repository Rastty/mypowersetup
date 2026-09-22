# Solaris Store — Ambassador application packet

Status: **READY_TO_SUBMIT**
Priority: **P0 — highest standalone purchase-ready unlock for PT/RO/SI**
Verified: 2026-09-22

## Application

Use the first-party Solaris ambassador form:

- Programme evidence: https://www.solaris-store.com/content/95-partenariat
- Application form: https://www.solaris-store.com/contact?id=partenariat-ambassadeur

### Suggested French message

Bonjour,

Je souhaite rejoindre votre programme Ambassadeur pour MyPowerSetup.com, un site indépendant consacré au dimensionnement des systèmes électriques pour vans, fourgons aménagés et camping-cars.

MyPowerSetup propose des calculateurs et des guides techniques pour aider les utilisateurs à choisir correctement la batterie, les panneaux solaires, le régulateur MPPT, le convertisseur, les chargeurs DC-DC et 230 V selon leur consommation et leur usage réel.

Le site est déjà localisé pour plusieurs marchés européens, notamment le Portugal, la Roumanie et la Slovénie. Nous souhaitons recommander des produits Solaris uniquement lorsqu'ils correspondent précisément aux besoins calculés de l'utilisateur.

Nous sommes particulièrement intéressés par les convertisseurs Victron Phoenix 12/250 et 24/250 ainsi que par le régulateur Victron SmartSolar MPPT 150/60-Tr. Ces références correspondent directement à nos scénarios de faible puissance et de dimensionnement solaire pour camping-cars.

Pouvez-vous nous confirmer :
1. le fonctionnement du suivi d'affiliation et la possibilité de créer des liens profonds vers les fiches produits Phoenix et SmartSolar précises ;
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
- Public evidence refreshed 2026-09-22: EUR 94.87, dispatch stated as 5–7 days
- Commercial impact: standalone unlock weight **5**

### Remote work — second priority
- Candidate: `solaris-victron-phoenix-24-250`
- Product: Victron Phoenix 24/250 VE.Direct Schuko
- Exact retail page: https://www.solaris-store.com/8005-onduleur-victron-phoenix-24-250va-vedirect-schucko.html
- System voltage: 24 V
- Continuous power: 200 W
- Peak power: 350 W
- Waveform: pure sine
- Public evidence refreshed 2026-09-22: EUR 105.05, dispatch stated as 1–2 days
- Commercial impact: affected weight **3**

### Solar controller — same application, later activation lane
- Candidate: `solaris-victron-smartsolar-150-60-tr`
- Product: Victron SmartSolar MPPT 150/60-Tr
- Exact retail page: https://www.solaris-store.com/2169-regulateur-victron-smartsolar-mppt-150-60-tr-150v-60a-.html
- System voltage: 12 / 24 / 36 / 48 V
- Charge current: 60 A
- Nominal PV power: 860 W @ 12 V / 1720 W @ 24 V
- Maximum PV open-circuit voltage: 150 V
- Commercial role: closes the 40–120 A expansion-market MPPT gap after tracking + country checkout verification

## Evidence already verified

- Solaris runs a first-party Ambassador programme aimed at bloggers, vanlife/camping-car and travel creators.
- The store is operational and the two exact Phoenix product pages expose current price and dispatch lead time.
- Solaris states it distributes/exports throughout Europe.
- Country-specific checkout for each exact product in PT/RO/SI is still intentionally treated as unverified.
- Affiliate tracking/deeplink format is still intentionally treated as unverified until Solaris supplies it and a redirect/deeplink is checked.

## Zero-code activation path now prepared

The P0 Phoenix inverter runtime is already implemented. After Solaris approval, activation is data-only through `data/solaris-affiliate-activation.json`; no new product integration code should be required.

For each exact Phoenix product, record:

1. `approvalConfirmed: true` and `approvalSource` at the file root.
2. The exact verified tracking URL in `exactAffiliateUrl`.
3. The exact canonical product page in `finalLandingUrl` (already seeded).
4. `trackingVerifiedAt` after confirming the affiliate URL reaches the exact product.
5. Fresh price/stock evidence (`priceEur`, `stockStatus`, `stockVerifiedAt`, `stockEvidenceUrl`). Stock evidence expires fail-closed after 14 days.
6. Only the PT/RO/SI market records whose country-specific checkout/delivery has been verified: `verified: true`, HTTPS `evidenceUrl`, and `verifiedAt`.

The sync then admits only the exact product-market pairs with all three gates green: **tracking + fresh stock + country checkout**. A verified Portugal pair cannot authorize Romania or Slovenia, and a plain untracked Solaris product URL cannot pass as an affiliate URL.

## Activation checklist after Solaris replies

- [ ] Ambassador application approved
- [ ] commission / commercial terms recorded
- [ ] exact affiliate tracking mechanism recorded
- [ ] exact-product affiliate URL for Phoenix 12/250 verified
- [ ] exact-product affiliate URL for Phoenix 24/250 verified
- [ ] Portugal exact-product shipping/checkout verified where applicable
- [ ] Romania exact-product shipping/checkout verified where applicable
- [ ] Slovenia exact-product shipping/checkout verified where applicable
- [x] fail-closed Solaris Phoenix affiliate adapter prepared
- [x] PT/RO/SI catalog sync prepared
- [x] PT/RO/SI runtime validation prepared
- [x] product-market isolation and stale-stock regressions prepared
- [ ] activation data updated with the real approval/tracking/checkout evidence
- [ ] post-activation CI green
- [ ] commercial opportunity report confirms inverter unlock

SmartSolar activation remains a separate P2 follow-up after the P0 inverter path is live; the same ambassador application can cover it.
