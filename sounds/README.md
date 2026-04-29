# Sounds

## Optional MP3 files

Add **MP3** files under this folder using **exactly** these names (they are wired in `index.html` and played first in `js/sound-manager.js`; if a file is missing, the game uses the built‑in Web Audio fallback for that effect):

| Filename | When it plays |
|----------|----------------|
| `bird-chirp.mp3` | Random chirps while the bird is flying |
| `tower-hit.mp3` | Bird hits a tower block |
| `pig-oink.mp3` | Tower starts to fall (pig alarm) |
| `pig-yelp.mp3` | Tower / pig hits the ground |
| `level-win.mp3` | Level completed |

**How to add your audio**

1. Export or convert your clips to **MP3**.
2. Save them in `sounds/` with the names above (replace any placeholder).
3. Reload the game (hard refresh `Ctrl+F5` if the browser cached an old version).

**Tips**

- Keep clips short (roughly **0.05–0.5 s** for chirps/hits; win can be a bit longer).
- Normalize levels so nothing is clipping; the game sets `audio.volume` from the sound manager (default high).
- After a **click or keypress**, browsers allow audio; the game already tries to unlock playback on first interaction.

If you remove an MP3 again, the matching fallback synth still plays for that event.
