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

Match Athena’s layout: **central emblem on Ionic capital**, left relic, right relic, dithered glow disc, navy starfield.

| File | God | Scene cue |
|---|---|---|
| `worship hecate.png` | Hecate | Three bound flaming torches (centre), triple-loop iron key (left), black hound with gold collar (right), cool moon glow |
| `worship demeter.png` | Demeter | Crimson-tied wheat sheaf (centre), sickle (left), pomegranate + poppy (right), warm gold glow |
| `worship iris.png` | Iris | Dominant rainbow gateway arch (centre), winged herald rod without snakes (left), prism/light drop (right), violet-blue glow |
| `worship hades.png` | Hades | Two-pronged bronze bident (centre), helm of darkness (left), split pomegranate (right), faint Cerberus silhouette, cold bone glow |

## Landing

1. Save into `game/public/ART/` under the filenames above.
2. Map ids in `assetMapping.js` `worship`.
3. Trim only the new files (zoom `1.08`) via `scripts/lib/card-art.cjs` `normalizeCardArt`, or `npm run trim-worship-art` if regenerating the whole set.
4. `npx vitest run tests/unit/card-art-footprint.test.js`
