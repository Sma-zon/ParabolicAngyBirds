# Sound Effects

To use sound effects in the game, add the following audio files to this directory:

- `shoot.mp3` - Sound played when the bird is launched
- `collision.mp3` - Sound played when the bird hits a block
- `success.mp3` - Sound played when a level is completed
- `fail.mp3` - Sound played when the game is over

## Fallback Sound Support

If audio files are not available, the game will attempt to use Web Audio API to generate fallback sounds.
The game will continue to work even without these files.

## Recommended Sound Effects

You can find free sound effects from:
- https://freesound.org
- https://pixabay.com/sound-effects
- https://www.zapsplat.com

### Suggestions:
- **shoot.mp3**: A short whoosh or launch sound (0.1-0.2 seconds)
- **collision.mp3**: A hard impact or crash sound (0.2-0.3 seconds)
- **success.mp3**: A triumphant chime or victory sound (0.3-0.5 seconds)
- **fail.mp3**: A sad or negative buzzer sound (0.3-0.5 seconds)
