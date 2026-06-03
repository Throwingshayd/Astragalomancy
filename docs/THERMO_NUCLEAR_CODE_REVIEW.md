# Thermo-Nuclear Code Quality Review



**Branch:** `audit/thermo-nuclear-review` (work landed on `main`)  

**Baseline:** `main` @ `852f6f3` (UI consistency + Morris theme + checklist e2e)  

**Reviewer:** Cursor Agent (Team Kit `thermo-nuclear-code-quality-review` skill)  

**Date:** 2026-06-03  

**Last updated:** 2026-06-03 (phase 1 complete + test-mode extract)



---



## Verdict



**NOT APPROVED** for continued growth in monolith files without a decomposition plan.



Behavior and recent UI work are directionally good (card contract, `card-present.css`, drag surface, tests). Phase 1 extractions materially reduced `GameEngine` and `UIManager`, but **`GameEngine.js` remains ~2,092 lines** (target ~1.8k). Further feature work should **extract before expand**, especially save/rehydrate and pipeline **breakdown** for commit animation.



---



## Size snapshot (game/js)



| Lines | File | Status |

|------:|------|--------|

| 2092 | `game/js/game/GameEngine.js` | **Critical** — down from 3188; still past 1k |

| 1030 | `game/js/classes/Boon.js` | **Over 1k** |

| ~508 | `game/js/ui/ScoringAnimation.js` | Extracted |

| ~401 | `game/js/ui/UIManager.js` | **Resolved** (was 1028) |

| 781 | `game/js/ui/ShopUI.js` | High but bounded |

| 767 | `game/js/ui/BalatroEffects.js` | High; tooltip system owns complexity |

| ~591 | `game/js/Main.js` | `CollectionManager` extracted |



---



## P0 — Structural regressions / blockers



### 1. `GameEngine.js` is a god object



**Finding:** One class still owns run state, scoring entry, dice roll, ante flow, save hooks, shop delegation, and much DOM wiring.



**Progress:** `LiveScoreController`, `ScoringAnimation`, `GameEngineTestModes` extracted; shop open/close remain thin delegates.



**Code judo (remaining):**



| Extract | Owns | GameEngine keeps |

|---------|------|------------------|

| ~~`LiveScoreController`~~ | Done | Delegation |

| ~~`ScoringAnimation`~~ | Done | `animateScoreUpdate` → `playReveal` |

| `GameSave` / rehydrate | `serializeStateForSave`, `saveGame`, `rehydrateState` | `canSave`, one-liner `saveGame()` |

| `ShopFlow` (optional) | Thin `openShop` / `closeShop` / `rerollShop` only if they grow | State flags |



**Target:** `GameEngine.js` under **~1,800 lines** after save extract + breakdown work.



---



### 2. `UIManager.js` crossed 1k during UI consistency work



**Status:** **Resolved** — drag moved to `game/js/ui/drag/`; `UIManager` ~401 lines.



---



### 3. Live score has **three** scoring-adjacent paths (drift risk)



**Progress:** Preview path canonical via `GnosisDisplay.buildPreviewSplit`; duplicate `before_score` preview loop removed; `calculateScore` uses `ScoringEngine.validateRun`.



**Remaining:** `ScoringAnimation` still uses `getDiceContributions` / `getBoonContributions` instead of pipeline **breakdown**.



**Code judo:** `ScoringEngine.runPipeline` → `{ pips, favour, isValid, breakdown }`; animation and Gnosis both consume **breakdown** only.



**Approval bar:** Do not add more Gnosis/cashout branches inside `GameEngine` until breakdown exists for commit animation.



---



## P1 — Missed simplification / spaghetti growth



### 4. `calculateScore` defensive wall vs canonical layer



**Status:** **Done** — wrapper delegates validation to `ScoringEngine.validateRun`.



---



### 5. `Boon.js` at 1,030 lines



**Finding:** `boonTimingHandlers.js` (615 lines) split timing, but `Boon.js` still holds large instance surface.



**Code judo:** Boon = data + thin `onTimingEvent` dispatch only; stop adding methods on `Boon` class.



---



### 6. `Main.js` embeds `CollectionManager`



**Status:** **Done** — `game/js/ui/CollectionManager.js`.



---



### 7. Global `window.*` coupling



**Finding:** `window.game`, `window.shopManager`, `window.balatroEffects`, `window.uiManager` used across cards, shop, renderers (100+ references).



**Code judo (incremental):** Introduce `RunServices` bag set once at run start; deprecate new `window.game` reads in UI layer.



---



## P2 — Boundary / abstraction / maintainability



### 8. `ShopUI` vs `UIManager` drag duplication



**Prefer:** One helper: `toggleDropHot(zone, pointer, active)` + shared threshold (14px) from `CardDragSurface` constants.



---



### 9. `BalatroEffects` tooltip system (767 lines)



**Prefer:** Document “tooltip contract” in `UIConstants.js`; no new card-type branches — use `data-tooltip` shape + CSS only.



---



### 10. CSS architecture (post UI pass)



**Good:** `card-present.css`, `card-sizes.css`, `tooltips.css` extractions.  

**Risk:** `styles.css` still a large grab bag; `greek-theme.css` (770 lines) mixes layout + theme tokens.



---



## P3 — What’s working (do not churn blindly)



- **`ScoringEngine` + `ShopStockGenerator`** — correct direction (logic without DOM).

- **Renderers** (`DiceRenderer`, `ScorecardRenderer`, `InfoBarRenderer`, `PlayAreaRenderer`) — keep expanding this pattern.

- **Card surface contract** (`data-card-surface`, `card-present.css`, `UIConstants.CARD_SURFACE`).

- **`CardDragSurface` / `PointerDragGhost`** — reuse everywhere.

- **Tests** — `ui-checklist-playtest.spec.js`, `card-sizes`, `greek-theme-wired`, `scoring-validate-run` — guard regressions while refactoring.



---



## Recommended execution order (behavior-preserving)



### Phase 1 — complete



1. ~~**Live score canonical breakdown**~~ — `GnosisDisplay.buildPreviewSplit`, removed duplicate preview loops.  

2. ~~**Extract `LiveScoreController`**~~ — `game/js/ui/LiveScoreController.js`.  

3. ~~**Extract drag controllers** from `UIManager`~~ — `BoonSlotDrag`, `ConsumableDrag`, `PointerGeometry`.  

4. ~~**Extract `CollectionManager.js`**~~ — `game/js/ui/CollectionManager.js`.  

5. ~~**Thin `calculateScore` wrapper**~~ — `ScoringEngine.validateRun`.  

6. ~~**Extract `ScoringAnimation`**~~ — `game/js/ui/ScoringAnimation.js`.  

7. ~~**Extract `GameEngineTestModes`**~~ — `game/js/game/GameEngineTestModes.js` (?test=, ?enhance=, seed 42067).



Each step: `npm run test` + targeted e2e (`ui-checklist-playtest`, `playtest:boons` if scoring touched).



### Phase 2 — next



1. **Pipeline `breakdown`** in `ScoringEngine`; wire `ScoringAnimation.playSequential` to it (closes P0 #3).  

2. **Extract save/rehydrate** (`GameSave` or extend `GameStateManager`).  

3. **Shared drop-target helper** for shop + consumable drag (P2 #8).  

4. **Boon.js** thin dispatch only — no new instance methods.  



---



## PR approval checklist (for future work)



- [ ] No file grows past 1k without decomposition PR first  

- [x] No new `!fromPipeline` / duplicate boon loops in preview paths  

- [ ] Scoring **commit animation** uses single pipeline output (preview does)  

- [ ] Drag/drop uses `CardDragSurface` + shared drop-target helper  

- [ ] Feature logic not added to `GameEngine` without extraction home identified  



---



## References



- Team Kit skill: `thermo-nuclear-code-quality-review`

- UI contract: `docs/UI_CONSISTENCY_CHECKLIST.md` (complete on `main`)

- Architecture notes: `.cursor/context/`, `SOUL.md`

