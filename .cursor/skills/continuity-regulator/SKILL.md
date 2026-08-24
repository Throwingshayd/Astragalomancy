---
name: continuity-regulator
description: Check Astragalomancy player-facing copy, shop button pathing, and economy constants against actual handlers. Use when editing tooltips, gameData effect strings, shop buttons, CARD_ECONOMY, sell values, or when the user mentions continuity, outdated copy, or mismatched labels.
---

# Continuity regulator

Do not spawn a reviewer subagent. Pathing is enforced by tests.

## Run

```bash
npx vitest run tests/unit/continuity-regulator.test.js tests/unit/worship-blessing-copy.test.js
```

Then `npm test` before calling the change done.

## Pathing that must stay true

| Player control | Play | Shop |
|---|---|---|
| `#rollButton` | Cast the Bones (roll) | Continue (leave shop) |
| `#shopContinueBtn` | hidden | Reroll (4g / Free) |

Blessing tooltips: planet-style `Level up {row}. +N Pips & +0.25 Favour.` Quiet aside: `Hold a Trial to consecrate.` One full Trial start→finish (`DEVOTION_TRIALS_TO_ASCEND`). No held gold.

## Copy rules

- Match `CardData.effect` to the handler in `boonTimingHandlers.js` / `WorshipCard.js` / `ArtifactEffects.js`.
- Current terms: **Pips**, **Favour**, **Gold** / `g`, **Trial**, **Blessing**.
- Artifacts are 10g (`CARD_ECONOMY.ARTIFACT_BASE_COST`). Sell is 25% of cost, min 1; explicit `0` stays 0.
