# Artifact card art — prompt pack

Same recipe as `docs/ART_PROMPT_LIBATIONS.md`. One Athena reference, one boilerplate,
chunky 16-bit pixels, Greek key drawn into the art. Artifacts are **relics**, not drinks
and not blessings: bronze/copper moulding instead of purple-gold or drink tints.

## Reference

```
C:\Users\Lorcan\.cursor\projects\c-Users-Lorcan-Projects-Astragalomancy\assets\worship-style-b-athena.png
```

Fallback: `game/public/ART/worship athena.png`. Attach as `reference_image_paths` on every call.

## Boilerplate

Fill `{TINT}`, `{STUDS}`, `{INNER}`, `{SCENE}`. `aspect_ratio` is always `3:4`.

> Chunky low-resolution 16-bit pixel art card illustration in exactly the style, palette
> weight and border construction of the reference image. Vertical portrait, artwork fills the
> whole image edge to edge with no white margin. Very large visible square pixels, thick dark
> outlines, small limited palette of flat saturated colours, simple checkerboard dithering,
> no anti-aliasing, no fine detail. Same border construction as the reference: black outer
> keyline, chunky **{TINT}** temple moulding with a repeating Greek key pattern, small
> **{STUDS}** corner studs, thin **{INNER}** inner keyline. Inside: **{SCENE}**. Iconic and
> readable at tiny size. No text, no lettering, no numbers, no signature, no shadow outside
> the card.

Default artifact moulding: `{TINT}` bronze and copper-gold, `{STUDS}` bronze, `{INNER}` warm gold.

| File | Scene cue |
|---|---|
| `artifact-altar.png` | Stone altar, two glow discs (double Favour) |
| `artifact-hecatomb.png` | Ox skulls, coins from a sold boon |
| `artifact-sixth-astragalus.png` | One knucklebone, every face a single pip |
| `artifact-seventh-astragalus.png` | Seventh die with overlapping Wild ghost pips |
| `artifact-delphic-tithe.png` | Temple table, prepaid coins, cheaper reroll token |
| `artifact-pythias-indulgence.png` | Pythia on tripod, one die, no second throw |
| `artifact-tyches-grace.png` | Palm catching four coins |
| `artifact-tyches-bounty.png` | Cornucopia spilling eight coins |
| remaining mapped `artifact-*.png` | Same boilerplate; bronze moulding; mechanic made visible |

## Landing

Save into `game/public/ART/` under the mapped filenames in `assetMapping.js` `artifacts`.
Then `npm run trim-artifact-art`.
