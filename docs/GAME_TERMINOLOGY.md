# Game terminology (player-facing vs code)

Use this when editing UI copy, docs, or talking to agents about the project.

## Player-facing card types

| Name | What it is |
|------|------------|
| **Boon** | Persistent run modifier (right bar) |
| **Libation** | One-shot drink / item effects (left bar) |
| **Worship** (Blessing) | Blessing of a god. **Offer** it on that god’s pantheon row for +1 worship level, or **Held** in the blessing rail until 3 trials → **Ascended** (consecrate any unlocked row as that hand/god). |
| **Artifact** | Run-long passive, bought by dragging into the artifacts chest |

**Libation** and **Worship** are separate card types with their own art, tooltips, and drag targets. Every blessing shares the same Offer / Held / Ascended package — only the target row and per-level pips change.

## Artifact tiers

Artifacts are the run's vouchers: ten families, each a **base** and an **upgrade**, twenty cards in total. Both tiers cost a flat 10 Gold, and an upgrade only enters the shop pool once you own its base. Owning an upgrade means owning *both* cards, so effects stack — Temple Market and Grand Agora together give +2 wares. Effect copy on an upgrade states the pair's total; `game/js/game/ArtifactEffects.js` contributes only the increment.

The three pack families follow Balatro's pack vouchers. Tier 1 adds one extra card of that type in the matching pack (Hall of Heroes / Panegyris / Symposium). Tier 2 for worship and libations is Telescope: the pack always contains a Blessing for your highest god, or your most-poured Libation. Boon packs upgrade into **Antikythra** (+1 Boon slot) instead. Seed of Plutus / Grove of Plutus raise the interest *cap* (5 → 10 → 20), never the gold-per-5 rate.

Exactly one artifact is offered per trial, in the shop that follows a cleared trial. The two mid-trial shops (`BlindDirector.shopTurns`) stock no artifact and hide the shelf. Artifacts cannot be sold.

## Left bar label: **Consumables**

The in-run left column title (marble stelae) reads **CONSUMABLES** because that bar holds both libations and worship. Individual cards still show their type on the face/tooltip.

## Code bucket: `consumables`

`gameState.consumables`, `consumableSlots`, `consumableSlotsMax`, and similar identifiers are the same group as the left bar.

- Use **consumables** in code/comments for the left-bar array/slots.
- Use **Libation** / **Worship** when referring to a specific card type (anthology tab “Libations”, pack names, effects).

Examples:

- OK: `updateConsumableUI()` — renders the left bar.
- OK: UI string: “Drag: worship ↑ · drink to chalice…”
- Avoid: Renaming `consumables` → `libations` in save data or state (would break saves and many call sites for worship).

## Legacy worship card IDs (saves)

Older saves may reference renamed worship IDs. Migrations map:

| Legacy ID | Current ID |
|-----------|------------|
| `worship_persephone` | `worship_aphrodite` |

Handled in `game/js/utils/dataManager.js` (collection) and `game/js/game/GameEngine.js` (run save load). Do not remove without a save-version bump.
