# Native reviewer handoff — PT / SI / RO

Purpose: make the final human language gate fast without weakening publication safety.

## What the reviewer needs to do

Review the assigned market on MyPowerSetup as a native speaker. This is an editorial/terminology review, not a redesign or code review.

Check these areas:

1. Calculator: labels, inputs, results, warnings and recommendation terminology.
2. Guide hub and all ten guides: titles, intros and technical explanations.
3. Trust pages: About/project, methodology, affiliate disclosure and privacy/analytics copy.
4. Technical vocabulary: battery, solar panel, inverter, MPPT/controller, DC-DC charging, 230 V, caravan/motorhome terminology, units and abbreviations.
5. Natural language: remove literal translations, mixed-language fragments, false friends and wording that a native speaker would not normally use.
6. Commercial transparency: affiliate wording must be clear and must not imply commission changes the technical recommendation.

Do not approve if any wording could materially confuse a user about electrical sizing, compatibility or safety.

## Routes

### Portugal — European Portuguese (pt-PT)
- Calculator: `/pt/`
- Guide hub: `/pt/guias/`
- Trust pages: `/pt/sobre-o-projeto/`, `/pt/metodologia/`, `/pt/afiliacao/`, `/pt/privacidade/`
- Plus all ten guides linked from the guide hub.

Reviewer should be a native European Portuguese speaker familiar with practical technical/product language.

### Slovenia — Slovenian (sl-SI)
- Calculator: `/si/`
- Guide hub: `/si/vodici/`
- Trust pages: `/si/o-projektu/`, `/si/metodologija/`, `/si/affiliate/`, `/si/zasebnost/`
- Plus all ten guides linked from the guide hub.

Reviewer should be a native Slovenian speaker familiar with practical caravan/electrical terminology.

### Romania — Romanian (ro-RO)
- Calculator: `/ro/`
- Guide hub: `/ro/ghiduri/`
- Trust pages: `/ro/despre-proiect/`, `/ro/metodologie/`, `/ro/afiliere/`, `/ro/confidentialitate/`
- Plus all ten guides linked from the guide hub.

Reviewer should be a native Romanian speaker familiar with practical autorulotă/rulotă electrical terminology.

## Required return format

Please return this completed block:

```
Market: PT / SI / RO
Reviewer name:
Native speaker: YES / NO
Review date: YYYY-MM-DD
Calculator reviewed: YES / NO
All 10 guides reviewed: YES / NO
Trust pages reviewed: YES / NO
Technical terminology reviewed: YES / NO
All blocking language/terminology issues resolved: YES / NO

Corrections required:
- route | original wording | replacement wording
- route | original wording | replacement wording

Final approval for public publication: YES / NO
```

A `YES` publication approval is valid only when all review fields above are YES and all blocking corrections have been resolved.

## After reviewer approval

Record the evidence in the corresponding `src/review-evidence-pt.js`, `src/review-evidence-si.js` or `src/review-evidence-ro.js`. Then run the fail-closed publication check before publication. Never infer or fabricate native approval from automated QA.