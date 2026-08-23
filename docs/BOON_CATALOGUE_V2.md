# Boon Catalogue v2 — design bible

**Status:** Draft · research & planning  
**Replaces:** all 61 boons in `gameData.js` (legacy list archived, not ported)  
**Goal:** every boon is a character. The mechanic *is* the myth.

Player terms unchanged: **Pips**, **Favour**, **Gold**, **Blessing**, **Trial**, **Cast the Bones**.

### Player-facing hand titles (draft lock)

Internal keys stay for saves. **Ones–Nines stay numbers.** Only the special hands get titles.

| Internal | God | Player title | Status |
|---|---|---|---|
| Three of a Kind | Hephaestus | **The Anvil** | locked |
| Four of a Kind | Ares | **The Spoils** | locked |
| Full House | Dionysus | **The Feast** | locked |
| Small Straight | Hermes | **The Short Road** | locked |
| Large Straight | Apollo | **The Long Course** | locked |
| Extra Long Straight | Iris | **The Spectrum** | locked |
| Yahtzee | Hades | **The House** | locked |
| Heureka | Zeus | **Heureka** | keep |
| Chance | Nyx | **Night** | locked |
| Pandora's Box | Pandora | **The Jar** (latch, not a hand) | locked — see Pandora latch |

**Pandora latch (not a score):** Track **3 of each face** in the scores you already cashed — not a 63-pip bonus, not cashing The Jar.

- Cash **Ones** with ≥3 ones → 1 is in the jar. Same for Twos–Sixes.
- When 1–6 are all in, one **dash** fills. The new row is playable next (or immediately). Marks clear for the next Trial’s jar.
- **Cashout** (end of Trial / shop): a line announces who stepped out of the pithos.
- Replace roll-unlock for those five rows.

| Dash | Unlocks | Cashout line (draft) |
|---:|---|---|
| 1 | Sevens | The Pleiades announce themselves to the pantheon. |
| 2 | Eights | Poseidon claims his lot. The sea is on the card. |
| 3 | Nines | Mnemosyne’s daughters take their seats. The nine will sing. |
| 4 | **Sixth die** | A sixth knucklebone is laid on the table. |
| 5 | The Spectrum | Iris spans the houses. The full arc is open. |
| 6 | Heureka | The king’s pile is found. Six the same will stand. |
| 7 | **Seventh die** | The seventh bone will not sit still. |

Seven dashes on The Jar. Sixth / Seventh Astragalus come from **this track**, not from the first Five of a Kind / shop upgrade (those stories move here). Spectrum after the sixth die so a run of six faces is actually rollable. Seventh die after Heureka (six the same already possible with six bones).

---

## 1. Design manifesto

### The one rule

> If you can rename the card and the effect still makes sense, it is not a boon yet.

### What worship is vs what boons are

| Layer | Role |
|-------|------|
| **Blessing (Worship)** | You consecrate a scorecard row to a god. Slow, permanent, pip ladder. |
| **Boon** | A story happened to you. It has wants, grudges, and a rule that behaves like the myth. |
| **Libation** | One drink, one moment. |
| **Artifact** | The city changed around you (vouchers). |

Boons are **not** a second worship track. They are heroes, monsters, curses, episodes, and godly *incidents* — the stuff that happens while you are trying to score dice.

### Voice

- **Effect line:** what the handler does (continuity-regulator truth).
- **Lore line:** artifact-quality prose. One or two sentences. Dry, specific, sometimes cruel.
- **Sources:** Hesiod (*Theogony*), Homeric Hymns, *Iliad* / *Odyssey*, Apollodorus. Ovid when the image is unbeatable (Daphne, Arachne, Narcissus) — note the filter.

### Rarity = narrative weight

| Tier | Cost | Pool weight | Who belongs here |
|------|------|-------------|------------------|
| **Rustic** | 3g | ~60% | Single beat of a story; one trick; folk tale |
| **Vibrant** | 5g | ~30% | Full episode; build-around; clear trade-off |
| **Epic** | 8–11g | ~10% | Run-defining; rewrites a rule; pantheon-scale |
| **Legendary** | 8–12g | shop-excluded | Secrets, primordials, endgame curses |

Target pool size: **58 boons** (comparable to v1, easier to art and balance).

### Relationship web

Every boon should tag:

- **`linkedGod`** — scorecard patron or thematic owner (may differ from worship row).
- **`allies`** — other boon IDs or god names that amplify.
- **`foes`** — other boon IDs or gods that punish or disable.

Cross-links are lore *and* design. Poseidon must hate Odysseus. Hera must hate Heracles. Ares and Aphrodite must affair.

---

## 2. Spreadsheet columns (master schema)

Use this schema when adding rows. Google Sheet / CSV can mirror these columns 1:1.

| Column | Purpose |
|--------|---------|
| `id` | snake_case, stable forever |
| `name` | Display name |
| `figure` | Mythic character or concept |
| `source` | Primary text / tradition |
| `story_hook` | One sentence — the beat we mechanise |
| `mechanical_thesis` | Design intent in plain language |
| `effect` | Player tooltip (must match handler) |
| `lore` | Flavor paragraph (shown in UI in v2) |
| `rarity` | rustic / vibrant / epic / legendary |
| `cost` | Gold |
| `linkedGod` | Pantheon or thematic god |
| `allies` | Comma-separated |
| `foes` | Comma-separated |
| `timing` | before_score / after_roll / turn_start / etc. |
| `secret` | Hidden clause or easter egg |
| `wave` | Implementation batch (0–5) |
| `art_note` | Visual brief one-liner |

---

## 3. Full catalogue

### Wave 0 — Pantheon signatures (19)

One boon per scorecard seat. These teach the player that **gods have personality**, not just pip rates.

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | secret / cross-link |
|----|------|--------|--------|------------|----------------|--------|-----------|---------------------|
| `silver_bow_of_artemis` | Silver Bow of Artemis | Artemis | Homeric Hymn to Artemis; first-shot hunt | She hits on the first cast | Scoring Ones on the first roll of the turn: +15 Pips | rustic | Artemis | **LOCKED.** Tooltip = effect only. Lore later (anthology). No Actaeon destroy. |
| `girdle_of_aphrodite` | Girdle of Aphrodite | Aphrodite | *Iliad* VI / couple | Desire sits side by side | +2 Pips per neighbouring pair of 2s, any score | rustic | Aphrodite | **LOCKED.** Tray order. 2,2,2 = +4; 2,2,2,2,2 = +8. Not Twos-row-only. |
| `keys_of_hecate` | Triple Torch of Hecate | Hecate | Triple form / triodos | Three 3s is the rite | +9 Pips if at least three 3s are showing (any score) | rustic | Hecate | **LOCKED.** Full House / 3oak / Chance all count. Lore in anthology. |
| `yoke_of_hera` | Yoke of Hera | Hera | Zygia / Teleia (marriage) | Two couples become a household | Two pair can be scored as The Feast | vibrant | Hera | **LOCKED.** HandEvaluator rewrite. Old Dionysus Revelry / Thyrsus must not reuse this. |
| `mist_of_ithaca` | Mist of Ithaca | Athena | *Odyssey* 13 — shore, house still ahead | Fives is second to Sixes; she stops at the threshold | Scoring Fives while Sixes is empty: +15 Pips | rustic | Athena | **LOCKED.** Once Sixes is filled, no bonus. Lore in anthology. |
| `pomegranate_of_persephone` | Pomegranate of Persephone | Persephone / Demeter | Homeric Hymn — the year split | Spring is grain; winter is six seeds as coin | Even Trials: scoring Sixes +12 Pips. Odd Trials: scoring Sixes +6 Gold. | vibrant | Demeter | **LOCKED.** Both seasons on Sixes only. 6g = worth holding the row a Trial. |
| `anvil_of_hephaestus` | Anvil of Hephaestus | Hephaestus | Forge / the strike | Each blow heats the iron | This boon gains +2 Pips if 3 dice are the same | rustic | Hephaestus | **LOCKED.** Balatro-Runner voice. Any row. Pays on the hitting score. |
| `spoils_of_ares` | Spoils of Ares | Ares | *Iliad* — loot the field | Reward choosing The Spoils row | +0.5 Favour and +4 Gold when you score The Spoils | vibrant | Ares | **LOCKED.** Row title = The Spoils. Category only. |
| `dionysian_revelry` | Dionysian Revelry | Dionysus | Krater / symposium | The mix fills the cup; the sip is the point | When you score The Feast, gain a random Libation. This boon gains +4 Pips when you drink a Libation. | vibrant | Dionysus | **LOCKED.** Not two-pair=FH (Hera). If left bar full, no extra drink. |
| `caduceus_of_hermes` | Caduceus of Hermes | Hermes | Homeric Hymn — road and market | Traveller + merchant: the road pays coin | +3 Gold when you score a Straight | vibrant | Hermes | **LOCKED.** Small, Large, or Extra Long. Caduceus swap / psychopomp sell later. |
| `pythian_course` | Pythian Course | Apollo | Iliad / Delphi — bow, plague, song; **not sun** | Only the 2–6 Long Course | When you score The Long Course as 2-3-4-5-6, gain a random Blessing | vibrant | Apollo | **LOCKED.** Renamed off Daphne (Ovid). Helios stays the sun (libation). 1-2-3-4-5 does not pay. |
| `spectrum_of_iris` | Spectrum of Iris | Iris | Homer — runner between houses | One arc, every hall below steps up | When you score The Spectrum, +1 level to every lower pantheon row | epic | Iris | **LOCKED.** Lower = Anvil, Spoils, Feast, Short Road, Long Course, Spectrum, The House, Heureka, Night (unlocked rows only). Not Ones–Nines. |
| `asphodel_of_hades` | Asphodel of Hades | Hades | Odyssey 11 — the many shades | The fuller the house, the louder | +4 Pips per filled scorecard row when you score The House | vibrant | Hades | **LOCKED.** Rewards a late slam. Zeus keeps +1 The House on Heureka. |
| `the_lots_of_zeus` | The Lots of Zeus | Zeus | Iliad 15 — sky / sea / underworld | One slam, three kings | When you score Heureka, +1 level to Heureka, The House, and Eights | epic | Zeus | **LOCKED.** Skip a row if still locked. Hades is no longer +1 The House. |
| `veil_of_nyx` | Veil of Nyx | Nyx | Theogony — Night, not seduction | The dark holds every face | +0.1 Favour per different face when you score Night | vibrant | Nyx | **LOCKED.** No male-god tax. No +69. Brood (Hypnos / Thanatos / Moirai) later. |
| `seven_sisters` | Seven Sisters | Pleiades | Bibliotheca — Atlas’s seven | Sisters show in every house | 7s count toward Pips even when the row ignores them | epic | The Pleiades | **LOCKED.** Ones `1,1,1,4,7` = 3+7 = 10. No extra on rows that already sum that 7. |
| `trident_of_poseidon` | Trident of Poseidon | Poseidon | Iliad 15 — the sea’s lot | The eighth wave | This boon gains +0.1 Favour every 8 times you score | vibrant | Poseidon | **LOCKED.** Run counter, any rows. Does not need face 8s. Not “8s showing.” |
| `nine_muses` | Nine Muses | The Nine Muses | Theogony — Zeus × Mnemosyne | The chorus only when all five are dressed | +0.5 Favour if all 5 dice are enhanced when you score | vibrant | The Nine Muses | **LOCKED.** Any row, not only Nines. No secret ×2.5 unless a later card. |
| `elpis_in_the_jar` | Elpis in the Jar | Pandora / Elpis | Hesiod — pithos | Hope after the five gifts | Later boon. Seat is the latch, not a score. | epic | Pandora | **SEAT:** 3-of-each-face track. Not 63 pips. Not roll-unlock. |

---

### Wave 1 — Heroes (12)

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | allies / foes |
|----|------|--------|--------|------------|----------------|--------|-----------|---------------|
| `twelve_labours` | Twelve Labours | Heracles | Apollodorus | Each labour done, strength remains | Track 12 distinct categories scored; at 12 → +3 permanent Favour on this boon | epic | — | Hera worship reduces progress; Athena aids |
| `thread_of_ariadne` | Thread of Ariadne | Ariadne | Plutarch / myth | Minotaur's maze remembers the path | Remember last turn's faces; restore one die to that face once per turn | vibrant | Dionysus | Theseus / Minotaur pair |
| `knot_of_gordias` | Knot of Gordias | Gordias / Alexander echo | Legend | Cannot be untied — only cut | One category locked after first score; +0.5 Favour each time you score it | vibrant | Zeus | — |
| `fleece_of_ares` | Golden Fleece | Jason / Argonauts | Argonautica | The crew that shares gods shares luck | +5 Pips per unique god with worship ≥1 | vibrant | — | Needs wide worship spread |
| `shield_of_achilles` | Shield of Achilles | Achilles | *Iliad* 18 | Invincible except the heel | +25 Pips on score; −1 Gold at turn start | rustic | — | Trojan War cluster |
| `journey_of_perseus` | Journey of Perseus | Perseus | Apollodorus | Monster slayer grows with deed | Every 100 total score → +10 permanent Pips on this boon | rustic | Athena | Medusa gaze synergy |
| `song_of_orpheus` | Song of Orpheus | Orpheus | Virgil / Ovid | Do not look back | Undo last score once per Trial if you skip shop that turn | epic | — | **Foe:** Hades helm; **ally:** Dionysus |
| `wanderings_of_odysseus` | Wanderings of Odysseus | Odysseus | *Odyssey* | Ten years, thirteen ports | Perfect scorecard → (categories filled)² Pips | vibrant | Athena | **Foe:** Poseidon |
| `lotus_eaters` | Lotus Eaters | Odysseus ep. | *Odyssey* 9 | Forget the way home | After score: may revert category to blank for +15 Gold | vibrant | — | Odyssey family |
| `bow_of_philoctetes` | Bow of Philoctetes | Philoctetes | *Iliad* | The wound that must fire last | Trial 3+ only: +40 Pips; disabled Trials 1–2 | vibrant | — | Trojan cluster |
| `marathon_runner` | Marathon Runner | Pheidippides | Historical echo | 42 km — the message kills the messenger | +1 Pip per roll used; destroys at 42+ Pips on one score or 3 scratches | rustic | Hermes | 42 easter egg |
| `xenia_of_alcinous` | Xenia of Alcinous | Odysseus ep. | *Odyssey* 7 | Guest-gift before the ask | First shop each Trial: −2g on first purchase | rustic | Zeus | Xenia / Zeus pattern |

---

### Wave 2 — Monsters & beasts (10)

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | notes |
|----|------|--------|--------|------------|----------------|--------|-----------|-------|
| `gaze_of_medusa` | Gaze of Medusa | Medusa | Perseus cycle | Turn to stone — the six freezes | 6s auto-held; lower sanctum +0.5 Favour | vibrant | — | Perseus ally |
| `heads_of_hydra` | Heads of Hydra | Hydra | Heracles labour | Two heads where one was cut | Exactly two pairs → +3 Favour | vibrant | — | Heracles labour |
| `riddle_of_sphinx` | Riddle of the Sphinx | Sphinx | Oedipus | What walks on four, two, three? | Before roll: name a face; all match → +2 Favour; none → −10 Pips | vibrant | — | Oedipus absent — riddle only |
| `song_of_sirens` | Song of Sirens | Sirens | *Odyssey* 12 | You hold the beautiful die | Highest face auto-held even when harmful | vibrant | — | Wax boon counters |
| `wax_of_daedalus` | Wax of Daedalus | Daedalus | Metamorphoses | Block the song | Ignore one boss blind; destroyed after | rustic | Athena | Siren counter |
| `minotaur_in_the_labyrinth` | Minotaur in the Labyrinth | Minotaur | Crete myth | Too many turns, you're lost | +1 Favour per turn if ≤2 dice held; +0 if 3+ held | vibrant | — | Ariadne thread |
| `horse_of_troy` | Horse of Troy | Sinon / Laocoön | *Aeneid* / epic cycle | Gift horse — power after the gate opens | From turn 11: all boon effects ×2 | legendary | — | **Lore:** enters turn 10, falls 11 |
| `chimera_coil` | Chimera's Coil | Chimera | Bellerophon | Lion, goat, serpent — three natures | Score 3oak with 3 different enhancements → ×2 Favour | vibrant | — | — |
| `watch_of_cerberus` | Watch of Cerberus | Cerberus | Heracles labour | Three heads guard the first holds | First 3 held dice +3 Pips each | vibrant | Hades | Underworld cluster |
| `typhon_beneath` | Typhon Beneath | Typhon | Theogony | Father of monsters — the ones are depth | Each 1 showing when scoring → +0.5 Favour | rustic | — | Gaia's revenge |

---

### Wave 3 — Tragedy, curse, hubris (10)

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | notes |
|----|------|--------|--------|------------|----------------|--------|-----------|-------|
| `boulder_of_sisyphus` | Boulder of Sisyphus | Sisyphus | Odyssey 11 | Push pays; rest does not | +5 Pips per reroll used this turn | vibrant | — | — |
| `pool_of_tantalus` | Pool of Tantalus | Tantalus | Odyssey 11 | Water recedes — gold you cannot drink | +0.1 Favour per Gold; cannot spend Gold in shop | vibrant | — | Gold builds, shop locked |
| `wax_wings` | Wax Wings | Icarus | Metamorphoses | Fly on unused wind; sun melts wax | +10 Pips per unused reroll; 1/8 break after turn 1 | vibrant | — | Daedalus pair |
| `reflection_pool` | Reflection Pool | Narcissus | Metamorphoses | Doubles everything but shortens life | All other boons fire twice; −2 rerolls per turn | epic | — | — |
| `golden_touch` | Golden Touch | Midas | Ovid | Rich, hungry, starving | +0.1 Favour per 5 Gold when scoring | rustic | Dionysus | — |
| `cassandra_truth` | Cassandra's Truth | Cassandra | Aeschylus | She sees; no one believes | Tooltip reveals next boss; acting on it destroys boon | vibrant | Apollo | Apollo curse |
| `hubris_of_niobe` | Hubris of Niobe | Niobe | Ovid | Seven sons — then none | +2 Favour while 7+ categories filled; −1 Favour each scratch after | epic | Artemis/Apollo | Niobe slain by twins |
| `curse_of_laius` | Curse of Laius | Oedipus cycle | Tragedy | The road forks wrong | Chance scores invert Favour gain/loss once per Trial | vibrant | — | Sphinx pair |
| `betrayal_of_paris` | Betrayal of Paris | Paris | Cypria | Chooses love, pays in blood | End of Trial: destroy random boon, +10 Gold | vibrant | Aphrodite | Apple of Eris chain |
| `lethedrink` | Lethe Drink | Lethe | Underworld | Forget the low faces | 1s and 2s ignored for scoring; +25 Pips | rustic | Hades | River cluster |

---

### Wave 4 — Chthonic, fate, primordial (7)

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | notes |
|----|------|--------|--------|------------|----------------|--------|-----------|-------|
| `ferrymans_obol` | Ferryman's Obol | Charon | Underworld lore | Coin for passage | +1 Gold after any non-scratch score | vibrant | Hades | Gold = obol |
| `thread_of_clotho` | Thread of Clotho | Moirae | Hesiod | Spin — one face fixed at roll start | One die cannot reroll for rest of Trial | vibrant | — | Fate trio |
| `measure_of_lachesis` | Measure of Lachesis | Moirae | Hesiod | Measure — score must hit quota | Score within ±5 of threshold → +2 Favour | vibrant | — | Fate trio |
| `shears_of_atropos` | Shears of Atropos | Moirae | Hesiod | Cut — end the reroll | Last reroll each turn always scores −1 face | epic | — | Fate trio |
| `hourglass_of_kronos` | Hourglass of Kronos | Kronos | Theogony | Devours time, spits rolls | +1 reroll at turn start | epic | — | — |
| `chaos_before_form` | Chaos Before Form | Chaos | Theogony | Double favour, unformed dice | Double Favour gains; −1 reroll per turn | legendary | — | shop-excluded; Chaos pack |
| `promethean_fire` | Promethean Fire | Prometheus | Theogony | Stolen fire — power with chains | +3 Favour all hands; −1 reroll per turn | vibrant | — | Rejected for Heureka seat |

---

### Wave 5 — Hearth, craft, symposium (remaining slots to 58)

| id | name | figure | source | story_hook | effect (draft) | rarity | linkedGod | notes |
|----|------|--------|--------|------------|----------------|--------|-----------|-------|
| `hearth_of_hestia` | Hearth of Hestia | Hestia | Homeric Hymn | Odd or even — the fire is balanced | All odd or all even → +3 Favour | vibrant | Hestia | If Dionysus worship ≥1: also +1g at cashout |
| `symposium_cup` | Symposium Cup | Plato / cult | Symposium | Many drink, one topic deepens | Each 4oak scored → +0.05 permanent Favour | vibrant | Dionysus | — |
| `bellows_of_the_forge` | Bellows of the Forge | Hephaestus | Forge myth | Phantom duplicate at the anvil | 3oak/4oak threshold −1 die | epic | Hephaestus | HandEvaluator hook |
| `cornucopia` | Cornucopia | Ploutos | Horn of Amalthea | Wealth multiplies for patient | End of Trial Gold ×1.5 (floor) | vibrant | Demeter | — |
| `protean_form` | Protean Form | Proteus | *Odyssey* 4 | Shape of the neighbour | Copies boon to its left | vibrant | Poseidon | — |
| `smog_of_morpheus` | Smog of Morpheus | Morpheus | Ovid | Dreams flatten to threes | After final roll: 2s and 4s → 3s | vibrant | Hecate | Demoted Threes god |
| `antikythra_echo` | Antikythra Echo | Mechanism | Archaeology echo | Gears favour the straight | Sm/Lg Straight +2 Favour | rustic | Apollo/Hermes | Rare tech easter egg |
| `eleusinian_mystery` | Eleusinian Mystery | Eleusinian Mysteries | Cult | Hidden until initiated | **Hidden text** until Demeter worship ≥2; then reveals true +Favour | epic | Demeter | UI secret |
| `ascetics_cell` | Ascetic's Cell | Ascetic tradition | Late antique | Empty slots are holy | +1 Favour per empty boon slot | epic | Hestia | — |
| `mount_olympus` | Mount Olympus | Pantheon | Cultic summit | Many gods, one peak | +1 Favour per total worship level | epic | — | Worship aggregate |

**Pool total: 58 boons**

---

## 4. Relationship map (design sheet)

```text
                    ZEUS ──declares──► rows
                      │                    │
          ┌───────────┼───────────┐        │
          ▼           ▼           ▼        │
      POSEIDON     HADES      HERA ◄── hates ── HERACLES
          │           │           │
     hates ODYSSEUS   │      Golden Apple
          │           │           │
          └───────► ODYSSEY family ◄┘
                      │
              ATHENA ◄── aids ── ODYSSEUS
                      │
                 ARACHNE (destroys Athena boon → permanent power)

ARES ◄── affair ──► APHRODITE ──► PARIS ──► TROY (Horse)

PERSEPHONE ◄── seasons ──► DEMETER ──► ELEUSIS (hidden boon)

MOIRAE trio: Clotho → Lachesis → Atropos (fate chain build)

UNDERWORLD: Charon → Lethe → Cerberus → Helm of Hades → Orpheus (blocked by Helm)
```

---

## 5. What we are deleting from v1

Do **not** port these names or concepts unless reimagined above:

- The Gambler, Lucky Dice Bag, Gambler's Charm, The Locksmith, The Merchant, The Heretic, Reckless Abandon, First Blood, Midnight Oil, Early Bird, Divine Synergy, Gold Standard, Misery, Symmetry, Doubling Season, Prime Time, Mathematician's Compass, Message in a Bottle, Assembly of Heroes, The Zealot (replace with god-specific worship hooks on pantheon cards)

Mechanics worth **keeping as patterns**, not names:

- HandEvaluator rewrites (Thyrsus, Bellows)
- shopExclude legendaries (Chaos, Horse)
- Marathon 42, Nyx 69, Carillon secret harmony
- Parmenides swap (retheme or drop — philosopher not myth character)

---

## 6. UI / lore delivery (v2 requirement)

1. **Tooltip shows `lore`** under `effect` (2–3 lines max in UI).
2. **`linkedGod`** shown on card face (like worship chips).
3. **Hidden boons** (Eleusinian Mystery, Carillon secret): effect line partial until condition met.
4. **Anthology tab** optional later — catalogue is source of truth.

---

## 7. Implementation waves

| Wave | Count | Work | Exit criteria |
|------|-------|------|---------------|
| **0** | — | Archive v1 boons; empty `CardData.boons`; add lore to tooltip renderer; extract handler modules (Boon god-object ceiling) | Tooling ready |
| **1** | 19 | Pantheon signatures | Every scorecard god has a boon; continuity tests |
| **2** | 12 | Heroes | Odyssey / Heracles / Orpheus playable stories |
| **3** | 10 | Monsters | Monster bosses feel like card fights |
| **4** | 10 | Tragedy | Trade-off boons balanced |
| **5** | 7 | Chthonic + primordial | Fate / underworld builds |
| **6** | — | Relationship hooks (foes/allies in handlers) | Poseidon taxes Odysseus, etc. |
| **7** | — | Art pass (`art_note` column) | Boon factory export |

**Do not implement all 58 at once.** Ship Wave 1 pantheon first — that is the identity shift.

---

## 8. Next decisions (for Lorcan)

1. **Pool size:** 58 OK, or trim to 48 for less art debt?
2. **Persephone:** standalone boon (above) vs restore as pantheon seat — catalogue assumes boon + Demeter seasons.
3. **Parmenides / philosophers:** cut entirely (this draft cuts them) — confirm?
4. **Tarot Trials:** keep as Balatro wink, or overlay Greek festival names later?
5. **First build slice:** approve Wave 1 table (19 pantheon) for effect numbers + handler pass?

---

## 9. CSV export (paste into Sheets)

```csv
id,name,figure,source,story_hook,rarity,cost,linkedGod,wave,effect
silver_bow_of_artemis,Silver Bow of Artemis,Artemis,Callisto/Actaeon,The huntress marks the weakest prey,vibrant,5,Artemis,1,1s auto-held; scoring Ones destroys this boon
girdle_of_aphrodite,Girdle of Aphrodite,Aphrodite,Iliad VI,Desire pulls neighbours together,vibrant,5,Aphrodite,1,Adjacent dice match the higher face after each roll
keys_of_hecate,Keys of Hecate,Hecate,Homeric Hymn,She opens what must stay shut,epic,8,Hecate,1,Once per Trial: un-scratch one row
...
```

(Full CSV can be generated from this doc when Wave 1 is approved.)

---

*Last updated: catalogue v2 draft — replaces legacy 61-boon pool.*
