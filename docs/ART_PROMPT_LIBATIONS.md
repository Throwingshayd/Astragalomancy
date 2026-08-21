# Libation card art — prompt pack

These ten prompts produced the libation art currently in `game/public/ART/`. Keep this file as
the recipe for regenerating or extending the set: it records the style rules inherited from the
worship cards, the per-card prompts, and the steps to land the files so the game picks them up.

---

## 1. Why the worship set came out well

Two style samples were generated for Athena and the **chunkier, lower-detail one won**. The
detailed "painterly" version looked good at full size but turned to mush at the 284×380 the
game actually draws. Everything after that followed four rules:

1. **One reference image drives the whole set.** The winning Athena sample was passed as a
   reference on every later card, so all sixteen share a palette weight and border build.
   Without it each card drifts.
2. **A fixed boilerplate.** Only three things change per card: the border tint, the scene
   contents, and the glow-disc colour. Everything about pixel size, dithering, outlines and
   the "no text / no shadow" constraints is copied verbatim every time.
3. **3:4 aspect ratio, full bleed.** The border is *drawn into* the art, edge to edge, with
   no white margin. The card frame is not a separate CSS layer.
4. **Normalised afterwards by script**, never by hand.

### Reference image

Use this as `reference_image_paths` on every single call:

```
C:\Users\Lorcan\.cursor\projects\c-Users-Lorcan-Projects-Astragalomancy\assets\worship-style-b-athena.png
```

If that file is gone, fall back to any shipped worship card, which is the same style already
trimmed to final size, e.g. `game/public/ART/worship athena.png`.

### Border motif: Greek key, same as the blessings

The first draft of this pack asked for a **running-wave scroll with tipped-cup corner glyphs**
so a drink would read differently from a blessing. That did not survive contact with the
generator: with the Athena reference attached, four of the first five cards drew a Greek key
anyway and only one honoured the wave, which left the set inconsistent. Since the reference
image is what holds the style together, fighting it is not worth an odd one out — the set was
standardised on **Greek key moulding with corner studs**, and the tint alone separates a
libation from a blessing. It does, comfortably. Keep it that way on any regeneration.

---

## 2. The boilerplate

Every prompt below is this text with `{TINT}`, `{STUDS}`, `{INNER}` and `{SCENE}` filled in:

> Chunky low-resolution 16-bit pixel art card illustration in exactly the style, palette
> weight and border construction of the reference image. Vertical portrait, artwork fills the
> whole image edge to edge with no white margin. Very large visible square pixels, thick dark
> outlines, small limited palette of flat saturated colours, simple checkerboard dithering,
> no anti-aliasing, no fine detail. Same border construction as the reference: black outer
> keyline, chunky **{TINT}** temple moulding with a repeating Greek key pattern, small
> **{STUDS}** corner studs, thin **{INNER}** inner keyline. Inside: **{SCENE}**. Iconic and
> readable at tiny size. No text, no lettering, no numbers, no signature, no shadow outside
> the card.

**Set `aspect_ratio` to `3:4` on every call.** The old libation art was square 512×512, and
squaring that down to the card ratio threw away about 20% off the sides — that was the main
reason the set was redone. Asking for `3:4` actually returns 1024×1536, which the trim script
crops by 11–12% rather than 20%.

---

## 3. Design logic

Two things are true of every libation and should read instantly in the art:

- **It is a drink.** Each card centres on a vessel appropriate to its name (mead cup, tisane
  iron cup, kantharos, kylix, phial, horn, chalice, scrying bowl).
- **The effect is visible.** Five of the ten enhance a die face, so those cards show the
  liquid pouring onto an **astragalus knucklebone die** whose top face has turned into the
  material in question. The rest show their mechanic directly (a coin doubling, a pip washing
  away, a pip being added, a level rising).

The border tints for the five die-enhancers are taken from the enhancement chip colours in
`game/js/config/EnhancementRegistry.js`, so the drink is colour-matched to the die face it
produces:

| Enhancement | Chip colour | Libation |
|---|---|---|
| Parchment | `#c9a36a` tan-amber | Kyphi Mead |
| Clockwork | `#7aa6c2` steel blue | Tisane of Hephaestus |
| Gold | `#f6c343` gold | Ambrosial Krasi |
| Mother of Pearl | `#d6d0ff` pearl lilac | Retsina of Echoes |
| Wild | `#a78bfa` violet | Soma of the Wild |

---

## 4. The ten prompts

Filenames are **exact and must not be corrected** — see the gotchas in section 6.

---

### 1. Kyphi Mead → `mead.png`
*Effect: Enhance a die face to Parchment (when scored: 25% +1 Favour, 15% +5 Gold).*

- `{TINT}` = tan-amber and dull gold
- `{STUDS}` = dull gold
- `{INNER}` = warm cream
- `{SCENE}` = a rough clay cup of thick honey mead tipped forward at the centre, a heavy amber
  stream pouring from it down onto a pale bone knucklebone die below, the die's upward face
  turned into a small sheet of ridged parchment scroll; a broken chunk of honeycomb and a
  wax-sealed jar at the base; one thin coil of incense smoke rising behind; a flat circular
  warm amber glow disc behind the cup; flat dark brown and ochre background with dithered
  gradient

---

### 2. Tisane of Hephaestus → `tisane.png`
*Effect: Enhance a die face to Clockwork (when scored: +5 Pips).*

- `{TINT}` = steel blue and iron grey
- `{STUDS}` = iron
- `{INNER}` = pale steel
- `{SCENE}` = a heavy black iron cup of steaming herbal tisane at the centre with three curls
  of steam above it, a thin dark brew pouring from its lip onto a pale bone knucklebone die
  below, the die's upward face turned into a brass clockwork plate with visible interlocking
  cogs and a tiny escapement; a smith's hammer and a pair of tongs crossed at the base; a few
  orange forge sparks; a flat circular cold steel-blue glow disc behind the cup; flat charcoal
  and deep maroon background with dithered gradient

---

### 3. Ambrosial Krasi → `ambrosia.png`
*Effect: Enhance a die face to Gold (when scored: +1 Gold).*

- `{TINT}` = bright gold and cream
- `{STUDS}` = gold
- `{INNER}` = white-gold
- `{SCENE}` = a golden two-handled kantharos cup brimming with luminous pale ambrosia at the
  centre, a thick glowing gold stream pouring over its rim onto a pale bone knucklebone die
  below, the die's upward face turned to solid polished gold with a coin-like sheen; three
  stacked gold coins at the base; small four-pointed divine sparkles around the cup; a flat
  circular brilliant gold glow disc behind the cup; flat deep amber and bronze background with
  dithered gradient

---

### 4. Retsina of Echoes → `retina of echoes.png`
*Effect: Enhance a die face to Mother of Pearl (when scored: add left or right die, 50/50).*

- `{TINT}` = pearl lilac and pale silver
- `{STUDS}` = pale silver
- `{INNER}` = iridescent white
- `{SCENE}` = a pale resin-wine cup at the upper centre pouring a thin shimmering stream onto
  a pale bone knucklebone die directly below it, the die's upward face turned to iridescent
  rainbow nacre shell; to the immediate left and right of that die sit two faint translucent
  ghost copies of the same die, like echoes; three concentric ripple rings spreading outward
  behind all three dice; a small pine sprig at the base; a flat circular iridescent pale lilac
  glow disc behind the cup; flat deep violet-grey background with dithered gradient

---

### 5. Soma of the Wild → `soma of the wild.png`
*Effect: Add Wild to one die face. On roll: the face becomes −1, 0, or +1.*

- `{TINT}` = violet and moss green
- `{STUDS}` = mossy gold
- `{INNER}` = pale violet
- `{SCENE}` = a curved animal-horn drinking cup at the centre overflowing with frothing
  green-violet soma, foam spilling down the sides onto a pale bone knucklebone die below, the
  die's upward face unstable and showing three overlapping translucent ghost pip patterns at
  once as though it cannot settle; twisting ivy vines and two speckled toadstools growing up
  around the horn; a flat circular shifting violet glow disc behind the horn; flat dark forest
  green background with dithered gradient

---

### 6. Kylix of the Hermit → `kylix of hermit.png`
*Effect: Double your gold (maximum gain 20).*

- `{TINT}` = deep bronze and gold
- `{STUDS}` = gold
- `{INNER}` = warm gold
- `{SCENE}` = a wide shallow black-figure kylix drinking bowl held up at the centre, dark wine
  pooled inside it, and rising out of the wine two identical mirrored stacks of gold coins
  side by side to show a hoard doubling; a single coin above the bowl splitting cleanly into
  two coins; behind it the mouth of a dark cave with a hooded hermit's lit lantern hanging on
  a gnarled staff; a flat circular rich gold glow disc behind the bowl; flat dark umber and
  black background with dithered gradient

---

### 7. Elixir of Lethe → `ekuxur of lethe.png`
*Effect: Reduce a die face by 1.*

- `{TINT}` = faded grey-teal and tarnished silver
- `{STUDS}` = tarnished silver
- `{INNER}` = dull pewter
- `{SCENE}` = a small tarnished silver phial tipped at the centre pouring pale grey river
  water onto a pale bone knucklebone die below, the die's pips visibly dissolving, one loose
  pip washing off the face and drifting downward as a fading grey mote; a clear downward-
  pointing arrow of thin drifting mist beside the die; dark still water and black river reeds
  across the base; a flat circular dim grey-teal glow disc behind the phial; flat near-black
  slate background with dithered gradient

---

### 8. Chalice of Helios → `chalice of helios.png`
*Effect: Increase a die face by 1.*

- `{TINT}` = sun orange and white-gold
- `{STUDS}` = bright gold
- `{INNER}` = white
- `{SCENE}` = a tall golden chalice at the centre catching a hard straight beam of sunlight
  from above, molten light brimming over its lip and running down onto a pale bone knucklebone
  die below, one extra bright new pip igniting on the die's upward face; a clear upward-
  pointing arrow of light beside the die; behind the chalice a blazing sun with straight
  radiating rays and the rim of a chariot wheel; a flat circular brilliant white-gold glow
  disc behind the chalice; flat warm orange and amber background with dithered gradient

---

### 9. The Eucharist → `the eucharist.png`
*Effect: Gain +1 worship level in a god of your choice.*

- `{TINT}` = ivory and temple gold
- `{STUDS}` = gold
- `{INNER}` = pale ivory
- `{SCENE}` = a plain white marble cup standing on a small stepped stone altar at the centre
  with a torn round loaf of bread beside it; behind the cup a short flight of three glowing
  marble steps with the lowest one lit to show a single level gained; arranged in a halo ring
  above the cup, several tiny god emblems in silhouette — a thunderbolt, an owl, a trident, a
  lyre, a grape cluster — to show the choice of god; two thin ribbons of incense smoke; a flat
  circular warm ivory-gold glow disc behind the cup; flat deep teal and stone background with
  dithered gradient

---

### 10. Divine Guidance → `dviine guidance.png`
*Effect: Gain 2 random levels in any 2 scores.*

- `{TINT}` = oracle teal and gold
- `{STUDS}` = gold
- `{INNER}` = pale cyan
- `{SCENE}` = a shallow bronze scrying bowl of dark still water resting on a three-legged
  oracle tripod at the centre, pale vapour curling up from the water; two separate straight
  beams of divine light descending from the top of the card into the bowl, each ending on its
  own small glowing constellation sigil; two short stone tally tablets flanking the tripod,
  each with two notches lit to show two levels gained on two different scores; a laurel sprig
  at the base; a flat circular pale teal glow disc behind the bowl; flat deep indigo and teal
  background with dithered gradient

---

## 5. Landing the files

1. Generate all ten at `aspect_ratio: "3:4"` with the reference image attached.
2. Save each one into `game/public/ART/` under the **exact filename** listed above,
   overwriting what is there.
3. Normalise to the card footprint:
   ```
   npm run trim-libation-art
   ```
   Add `-- --zoom=1.08` if the border needs cropping in tighter. Use
   `npm run trim-libation-art:dry` first to see what it would do. The first run copies the
   originals to `art-backup/libations/`, which is gitignored.
4. Verify:
   ```
   npm test
   ```
   `tests/unit/card-art-footprint.test.js` fails if any card is not 284×380 with paint running
   edge to edge, which is exactly the failure mode where a card renders visibly smaller than
   its neighbours in the rails.
5. Commit the ten PNGs once they look right.

No code changes are needed. `assetMapping.js` already points at these filenames, and
`frames.libation` is already `null` because the frame is drawn into the art — leave it null.

---

## 6. Gotchas

- **Three filenames contain typos. Preserve them.** `retina of echoes.png` (not "retsina"),
  `ekuxur of lethe.png` (not "elixir"), `dviine guidance.png` (not "divine"). The mapping in
  `game/js/data/assetMapping.js` lines 91–102 depends on them. If you'd rather fix the names,
  rename the files *and* update those mapping lines in the same change; the footprint test
  reads the mapping, so it will follow automatically.
- **No text in the art.** The card UI draws the card name itself over the art, so any
  lettering baked into the image collides with it. The prompts already forbid it — don't relax
  that.
- **Don't add a drop shadow or an outer margin.** The art is the card, edge to edge. A
  transparent margin baked into the PNG shrinks the rendered card.
- **Keep the reference image on every call.** Dropping it partway through is how a set stops
  matching.
