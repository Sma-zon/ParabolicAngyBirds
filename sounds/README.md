# Sounds

## Background theme (MP3)

The game tries these paths **in order** (see `BGM_URLS` in `js/sound-manager.js`):

1. `sounds/02-angry-birds-theme.mp3`
2. `sounds/02. Angry Birds Theme.mp3` (URL-encoded in code)
3. `sounds/bgm-theme.mp3`

Add your **~1:08** theme as one of those names; it **loops** when loaded. Volume is lower than the bird chirp.

**If no MP3 loads** (missing file or wrong name), a **soft built‑in pad** still plays after your first tap/keypress so you always hear background music on supported browsers.

## Bird flying (MP3)

**`bird-chirp.mp3`** plays **once from start to finish** each time you press SHOOT. It is mixed **louder** than the theme.

If the file is missing, flight chirp is silent.
