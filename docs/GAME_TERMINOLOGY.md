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

Exactly one artifact is offered per trial, like a Balatro voucher: the same card appears in every shop of that trial. Buying it leaves the slot empty until the next trial. An upgrade only enters the pool once you own its base. Artifacts cannot be sold.

Family upgrades are not all “the same but more”: Altar doubles worship Favour, **The Hecatomb** makes Boons sell for full cost; Delphic Tithe cheapens shop rerolls, **Pythia’s Indulgence** leaves you with a single Cast the Bones each turn; Sixth Astragalus is an all-1s extra die, **Seventh** adds a Wild extra die; Tyche pays Gold at the start of each Trial.

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
| `worship_morpheus` | `worship_hecate` |
| `worship_heracles` | `worship_demeter` |

Handled in `game/js/game/GamePersistence.js` (run save load). Collection version bumps still wipe mismatched anthologies via `dataManager.js`. Do not remove without a save-version bump.

**Hades** is **Five of a Kind** (internal key `Yahtzee`). **Zeus** (Hypsistos / Most High) is **Heureka** (six of a kind). **Iris** is **Extra Long Straight** (run of six). Heureka and Extra Long Straight stay hidden until that hand is rolled.

## Score: Pips × Favour

Final score is **Pips × player Favour**. Engine Favour is stored as hundredths (100 = ×1) so worship +25 is +0.25 without a decimal multiplier. There is no third hidden multiplier.

| Player sees | Engine does |
|-------------|-------------|
| **+N Pips** | `result.pips += N` |
| **+N Favour** | `result.favour += N × 100` (adds to the hundredths multiplier) |
| **×N Favour** | `result.favour *= N` (multiplies the multiplier) |

Favour starts at **1** (naked hand). Worship is **+0.25 Favour** per level, so one Offer reads as **×1.25**. Score is Pips × that number — a 20-pip Chance at 1.25 Favour is 25.

The HUD Favour total is the live multiplier (`1`, `1.25`, `3`). Additive boons show **+N**; multiplicative boons show **×N**.
