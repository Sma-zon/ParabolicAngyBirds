# Sounds

## Background theme (MP3)

The game tries these paths **in order** (see `BGM_URLS` in `js/sound-manager.js`):

1. `sounds/02-angry-birds-theme.mp3` ← **use this name** (easiest)
2. `sounds/02. Angry Birds Theme.mp3` (URL-encoded in code)
3. `sounds/bgm-theme.mp3`

Your track should be **at least ~12 seconds** long so the game treats it as the real theme (very short clips are ignored and the soft built‑in pad keeps playing).

### Install your theme (Windows)

1. Put your MP3 somewhere you can find it (e.g. Downloads).
2. In PowerShell:

```powershell
cd path\to\ParabolicAngyBirds\sounds
.\setup-theme.ps1
```

3. Pick the file in the dialog (or run `.\setup-theme.ps1 -Source "C:\path\to\Your Theme.mp3"`).
4. Commit `sounds/02-angry-birds-theme.mp3` if you use GitHub Pages, then **hard refresh** the site (Ctrl+F5) and **click once** on the page so the browser allows audio.

**If no valid MP3 is present**, a **soft built‑in pad** still plays after your first tap/keypress so you always hear background music on supported browsers.

## Bird flying (MP3)

**`bird-chirp.mp3`** plays **once from start to finish** each time you press SHOOT. It is mixed **louder** than the theme.

If the file is missing, flight chirp is silent.
