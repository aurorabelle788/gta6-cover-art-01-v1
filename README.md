# Sunset Cover Maker — GTA-style cover art maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aurorabelle788/gta6-cover-art-01-v1/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aurorabelle788/gta6-cover-art-01-v1/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photos into a bold multi-panel poster in the style of the
GTA 6 cover: panels of different sizes, heavy display caption lettering,
and a warm Vice City sunset / neon colour grade with a comic halftone
treatment. Original art only — no Rockstar logos, wordmarks, artwork,
characters or fonts.

## How it works

1. **Upload your photos** (or click **Load sample photo** to try it with the
   bundled sample). Photos are read locally in your browser and never
   uploaded anywhere.
2. **Arrange the poster**: click any of the 4 panels to select it, drag
   inside it to move the photo, scroll (or use the Zoom slider) to zoom,
   and pick which photo each panel shows. “Fill all panels” puts one photo
   everywhere; “Shuffle panel photos” mixes them up.
3. **Write the caption**: edit the big title and the subtitle — the live
   preview updates as you type.
4. **Export PNG** at 1080×1080, 1080×1350 or 1920×1080.

The **Look** toggles switch the sunset colour grade, the halftone dots
and the white panel borders on and off.

## Run it

Serve `app/` with any static server (it works fully offline — no network
requests, everything is vendored under `app/`) and open `index.html`:

```sh
python3 -m http.server --directory app 8000
```

## Files

- `app/index.html` — the editor page
- `app/style.css` — editor styling
- `app/src/app.js` — poster rendering, panel editing, export
- `app/fonts/Anton-Regular.ttf` — Anton display font (SIL Open Font
  License 1.1, see `app/fonts/OFL.txt`)
- `app/samples/boulevard.jpg`, `app/samples/pier.jpg` — sample photos
  for the demo buttons

## Build

`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` into
the output directory and writes `dossier.json` with the kit's
`buildDossier` from `vendor/makefun-app.ts`:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```
