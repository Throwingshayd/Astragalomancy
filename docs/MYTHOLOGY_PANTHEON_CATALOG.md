# Mythology pantheon catalog (Astragalomancy)

Research + sense-check for scorecard gods. Player terms: **Pips**, **Favour**, **Blessing**, **Gold**. Domains here are lore; scoring uses [`GOD_METADATA`](../game/js/config/GameConstants.js).

**Status tags:** `pantheon` (Offer target) · `flavor` (boon/libation/artifact only) · `absent` (not in game yet)

**Olympian?** = classical Twelve (Dionysus list): Zeus, Hera, Poseidon, Demeter, Athena, Apollo, Artemis, Ares, Aphrodite, Hephaestus, Hermes, Dionysus.

---

## Locked scorecard map

```text
Ones              Artemis
Twos              Aphrodite
Threes            Hecate          (triple share: earth, sea, sky)
Fours             Hera
Fives             Athena
Sixes             Demeter         (harvest / full standard die)

Three of a Kind   Hephaestus
Four of a Kind    Ares
Full House        Dionysus
Small Straight    Hermes          (short road)
Large Straight    Apollo          (ordered course)
Extra Long Straight  Iris         (rainbow / long arc)
Five of a Kind    Hades           (internal key: Yahtzee)
Heureka           Zeus            (six of a kind — Most High)
Chance            Nyx

Sevens            The Pleiades
Eights            Poseidon
Nines             The Nine Muses
Pandora's Jar     Pandora's Jar
```

### Cosmology

Brother-kings who divided the world:

| Realm | God | Seat |
|-------|-----|------|
| Sea | Poseidon | Eights |
| Underworld | Hades | Five of a Kind |
| Sky / Most High | Zeus | Heureka |

Path ladder: **Hermes → Apollo → Iris**.

### Demotions (flavor only)

| Figure | Was | Remains as |
|--------|-----|------------|
| Morpheus | Threes pantheon | `Smog of Morpheus` boon (dice → 3) |
| Heracles | Sixes pantheon | Labour / strength boon naming |

### Rejected alts (recorded)

| Seat | Rejected | Why |
|------|----------|-----|
| Heureka | Prometheus | “Beyond Zeus” titan; displaced by Zeus Most High |
| Heureka | Metis / Nike / Hestia | Weaker discovery or unity reads |
| ELS | Hades | Kept for sovereign 5oak instead |
| ELS | Persephone / Oceanus / Helios | Soft or clashes with Demeter/Apollo |
| Threes | Morpheus | No three-paths myth |

---

## Olympian coverage

All **Twelve** are on the scorecard (Demeter on Sixes).

**Named exceptions (not Twelve):** Hecate, Hades, Iris, Nyx, The Pleiades, The Nine Muses, Pandora's Jar.

---

## Pantheon entries (live)

| God | Row | Olympian? | Domain | Fit | Signature stories |
|-----|-----|-----------|--------|-----|-------------------|
| Artemis | Ones | Y | hunt | Ok→Strong | Actaeon; Niobe; Callisto; virgin huntress |
| Aphrodite | Twos | Y | love/beauty | Strong | Foam birth; Adonis; Ares; Judgement of Paris |
| Hecate | Threes | N | three realms | Strong | Perses × Asteria; honour in earth, sea, and sky |
| Hera | Fours | Y | marriage | Ok | Io; persecutes Heracles; golden apple |
| Athena | Fives | Y | wisdom | Ok→Strong | Birth from Zeus; Arachne; Odysseus; Parthenon |
| Demeter | Sixes | Y | harvest | Strong | Persephone; Eleusis; famine / seasons |
| Hephaestus | 3oak | Y | forge | Strong | Cast from Olympus; golden net; Pandora forged |
| Ares | 4oak | Y | war | Strong | Aphrodite affair; Aloadae; Troy (often mocked) |
| Dionysus | Full House | Y | wine | Strong | Semele; pirates→dolphins; Pentheus; Ariadne |
| Hermes | Sm Straight | Y | travel | Strong | Cattle theft; Argus; psychopomp; Odyssey escort |
| Apollo | Lg Straight | Y | oracle | Strong | Delphi; Niobe; Trojan plague |
| Iris | ELS | N | rainbow/messages | Strong | Rainbow bridge; Hera’s herald; joins realms |
| Hades | 5oak | N | underworld | Strong | Persephone; Orpheus; brother-king of the dead |
| Zeus | Heureka | Y | sky | Strong | Titanomachy; Semele; decrees at Troy |
| Nyx | Chance | N | night | Strong | Primordial night; mother of Sleep/Death/Fates (Hesiod) |
| Pleiades | Sevens | N | stars | Strong | Seven sisters; Atlas’ daughters |
| Poseidon | Eights | Y | sea | Ok | Athens contest; Odysseus curse; earth-shaker |
| Nine Muses | Nines | N | arts | Strong | Calliope…Urania; memory / inspiration |
| Pandora's Jar | Pandora | N | mystery | Strong | Sealed evils / hope; pithos (jar), not a box |

---

## Cross-reference (code)

| Concern | Where |
|---------|--------|
| Category ↔ god | `GOD_TO_CATEGORY`, `GOD_METADATA` in `game/js/config/GameConstants.js` |
| Blessing copy | `CardData.worship` in `game/js/data/gameData.js` (locked by `worship-blessing-copy.test.js`) |
| Pip rates | `CATEGORY_PIPS_PER_LEVEL`: Yahtzee 25, Heureka 40, ELS 30 |
| Unlock rows | Heureka + Extra Long Straight hidden until rolled (`CategoryUnlock.js`, `heureka-unlock.test.js`) |
| UI labels | `game/index.html` pantheon chips; `ScorecardRenderer._pantheonLabels` |
| Save defaults | `GameEngine` / `GamePersistence.DEFAULT_WORSHIP_LEVELS` |
| Legacy worship IDs | `worship_morpheus`→`worship_hecate`, `worship_heracles`→`worship_demeter` (plus older `worship_persephone`→`worship_aphrodite`) |
| Flavor kept | Smog of Morpheus; Demeter's Harvest; Journey of Perseus; Hecatomb artifact (sacrifice term, not the goddess) |

---

## A. Twelve Olympians (+ Hestia)

| Figure | Domains | Stories | Status |
|--------|---------|---------|--------|
| Zeus | sky, kingship, oaths, thunder | Kronos overthrow; Semele; Europa; Most High | `pantheon` Heureka |
| Hera | marriage, queenship | Io; Heracles; Judgement of Paris | `pantheon` Fours |
| Poseidon | sea, earthquakes, horses | Athens contest; Odysseus | `pantheon` Eights |
| Demeter | grain, seasons | Persephone; Eleusis | `pantheon` Sixes (+ Harvest boon) |
| Athena | wisdom, crafts, strategic war | Arachne; Odysseus | `pantheon` Fives |
| Apollo | light, prophecy, music, plague/heal | Delphi; Niobe; Iliad plague | `pantheon` Lg Straight |
| Artemis | hunt, wilderness, childbirth | Actaeon; Hippolytus | `pantheon` Ones |
| Ares | brutal war | Aphrodite; Aloadae | `pantheon` 4oak |
| Aphrodite | love, beauty | Adonis; Paris | `pantheon` Twos |
| Hermes | travel, thieves, heralds, commerce | Argus; psychopomp | `pantheon` Sm Straight |
| Hephaestus | forge, fire, craft | Exile; net; Pandora | `pantheon` 3oak |
| Dionysus | wine, ecstasy, theatre | Pentheus; Ariadne | `pantheon` Full House |
| Hestia | hearth, civic fire | First-swallowed child of Kronos; hearth honour | `flavor` Hestia's Hearth |

---

## B. Chthonic / underworld

| Figure | Domains | Stories | Status |
|--------|---------|---------|--------|
| Hades | underworld, hidden wealth | Persephone; Orpheus; Heracles’ descent | `pantheon` 5oak |
| Persephone | spring / queen of dead | Abduction; pomegranate; return | legacy id only → Aphrodite Twos |
| Hecate | three realms (earth, sea, sky) | Theogony honour; later torch-bearer | `pantheon` Threes |
| Charon | ferry of dead | Coin for passage | `flavor` Charon's Ferry Fare |
| Thanatos / Hypnos | death / sleep | Twins; Sarpedon | `absent` |
| Erinyes | vengeance | Orestes | `absent` |
| Lethe / Styx | oblivion / oath | Rivers | Lethe `flavor` |

---

## C. Primordials & Titans

| Figure | Domains | Stories | Status |
|--------|---------|---------|--------|
| Chaos | void | Theogony opening | `flavor` Chaos Primordial / packs |
| Gaia / Uranus | earth / sky | Titans; castration | `absent` |
| Nyx | night | Mother of many powers | `pantheon` Chance |
| Kronos | devouring | Swallows children (not Chronos / Time) | `flavor` Hourglass |
| Rhea | motherhood | Saves Zeus | `absent` |
| Prometheus | foresight, fire-theft | Fire; Caucasus | `flavor` (rejected for Heureka) |
| Atlas | sky-bearing | Titanomachy | `absent` |
| Oceanus et al. | sea lineage / law / memory | Titan generation | mostly `absent` |

---

## D. Path, fate, fortune, other

| Figure | Domains | Status |
|--------|---------|--------|
| Iris | rainbow messenger | `pantheon` ELS |
| Morpheus | dreams | `flavor` Smog (demoted) |
| Heracles | strength, labours | `flavor` (demoted) |
| Tyche | fortune | `flavor` artifacts |
| Moirae | fate thread | `absent` |
| Plutus | wealth | `flavor` |
| Helios | sun (early distinct from Apollo) | `flavor` Chalice |
| Selene / Eos | moon / dawn | `absent` |
| Pan | wild, panic | `absent` (name echo: Panegyris) |
| Asclepius | medicine | `absent` |
| Nemesis / Eris / Eros / Nike | retribution / strife / desire / victory | `absent` |
| Ganymede / Pythia | cupbearer / oracle | `flavor` |
| Pleiades / Muses / Pandora's Jar | stars / arts / mystery | `pantheon` |

---

## E. Heroes & monsters (boon channel)

Odysseus, Achilles, Perseus, Theseus, Orpheus, Jason; Medusa, Hydra, Cerberus, Typhon, Chimera, Minotaur, Sphinx, Sirens; Sisyphus, Tantalus, Midas, Icarus, Narcissus, Paris — many already `flavor` in `gameData.js` / `boon-data.json`.

---

## F. Historical colour (short)

Homeric cult → classical city patrons (Athens/Athena, etc.). Mystery cults (Eleusis, Dionysian). Cult lists of twelve Olympians vary (sometimes Hestia, sometimes Dionysus) — a list problem, not a yielding myth. Astragalomancy may keep number-locked groups (Pleiades, Muses) and chthonic peers (Hades, Hecate, Nyx) without claiming textbook purity.

---

## Suggested Blessing channels (non-pantheon worthies)

| Figure | Prefer |
|--------|--------|
| Prometheus | Boon (insight / fire) |
| Persephone | Boon or restore pantheon only if Demeter moves |
| Tyche | Artifacts (already) |
| Moirae | Boon (lock faces) |
| Nike | Boon (score spike) |
| Hestia | Keep hearth boon |
