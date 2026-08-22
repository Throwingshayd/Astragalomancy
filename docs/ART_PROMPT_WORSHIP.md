# Worship card art — prompt pack (new pantheon seats)

Same recipe as `docs/ART_PROMPT_LIBATIONS.md`. Reference Athena, purple-gold blessing moulding,
chunky 16-bit pixels, Greek key drawn into the art. Used for **Hecate**, **Demeter**, **Iris**,
and **Hades** after the pantheon remap.

## Reference

```
game/public/ART/worship athena.png
```

Attach as `reference_image_paths` on every call. `aspect_ratio` = `3:4`.

## Boilerplate

Fill `{SCENE}` only. Blessing moulding is fixed (purple / gold).

> Chunky low-resolution 16-bit pixel art card illustration in exactly the style, palette
> weight and border construction of the reference image. Vertical portrait, artwork fills the
> whole image edge to edge with no white margin. Very large visible square pixels, thick dark
> outlines, small limited palette of flat saturated colours, simple checkerboard dithering,
> no anti-aliasing, no fine detail. Same border construction as the reference: black outer
> keyline, chunky royal purple and gold temple moulding with a repeating Greek key pattern,
> small gold corner studs, thin warm gold inner keyline. Inside: **{SCENE}**. Iconic and
> readable at tiny size. No text, no lettering, no numbers, no signature, no shadow outside
> the card.

## Scenes

| File | God | Scene cue |
|---|---|---|
| `worship hecate.png` | Hecate | Three lit torches bound at a stone three-way crossroads, triple-ring key, black hound with gold collar, pale moon glow disc, indigo night |
| `worship demeter.png` | Demeter | Golden wheat sheaf with crimson ribbon on Ionic pedestal, sickle left, pomegranate + poppy right, warm harvest-gold glow disc |
| `worship iris.png` | Iris | Rainbow arc behind a winged golden herald staff (no Hermes snakes), winged messenger sandals at base, pale sky-blue/violet glow disc |
| `worship hades.png` | Hades | Dark-gold bident on black stone dais, helm of darkness, red pomegranate, Cerberus silhouette, cold bone-white glow disc |

## Landing

1. Save into `game/public/ART/` under the filenames above.
2. Map ids in `assetMapping.js` `worship`.
3. Trim only the new files (zoom `1.08`) via `scripts/lib/card-art.cjs` `normalizeCardArt`, or `npm run trim-worship-art` if regenerating the whole set.
4. `npx vitest run tests/unit/card-art-footprint.test.js`
