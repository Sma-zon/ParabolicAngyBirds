# 🎮 Parabolic Angry Birds - Educational Game

A fun, interactive game that teaches parabolic equations through gameplay! Players must enter the correct parabolic equation parameters to launch a bird at towers.

## Features

### 🎯 Core Gameplay
- **Parabolic Equation Input**: Enter `y = -a(x-h)² + k` parameters to determine the bird's flight path
  - **a**: Controls the vertical stretch/compression of the parabola
  - **h**: Controls the horizontal shift
  - **k**: Controls the vertical shift
- **Physics-Based Collision**: The bird reflects off towers realistically
- **Destructible Blocks**: Different block types (wood, stone) with varying durability
- **5 Progressive Levels**: From simple to expert difficulty

### 🎨 Visual Features
- Beautiful gradient backgrounds and UI
- Animated particle effects for explosions and collisions
- Real-time bird trajectory visualization
- Grid overlay for reference
- Health indicators on blocks
- Smooth animations and transitions

### 🔊 Audio System
- **Optional MP3s** in `sounds/` (see `sounds/README.md` for exact filenames); if a file is missing or `play()` fails, **Web Audio** procedural fallback runs for that cue
- Random bird chirps while flying, pig oink/yelp on tower fall, tower impact on hits, short win fanfare
- Volume and mute apply to both MP3 elements and the synth bus (`js/sound-manager.js`)

### 📊 Level System
1. **Simple Start** - Learn the basics with an easy target
2. **Double Tower** - Manage two separate towers
3. **Precision Shot** - Navigate through narrow openings
4. **Triple Tower Challenge** - Destroy three towers with limited attempts
5. **Expert Mode** - The ultimate pyramid challenge

## How to Play

1. **Observe the tower layout** on the canvas
2. **Enter parabolic equation parameters**:
   - Adjust `a` to change the parabola's width
   - Adjust `h` to shift the path left/right
   - Adjust `k` to shift the path up/down
3. **Click "SHOOT"** to launch the bird
4. **Destroy all blocks** to complete the level
5. **Progress through levels** by clicking "Next Level"

## Installation

### Option 1: Local File
Simply open `index.html` in a web browser.

```bash
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

### Option 2: Web Server
For better performance and audio support:

```bash
python -m http.server 8000
# or
npx http-server
```

Then visit `http://localhost:8000` in your browser.

## File Structure

```
ParabolicAngyBirds/
├── index.html                 # Main HTML file
├── styles.css                 # Game styling
├── js/
│   ├── game.js               # Main game logic
│   ├── game-objects.js       # Bird, Block, Tower classes
│   ├── levels.js             # Level definitions
│   ├── sound-manager.js      # Audio handling
│   └── particle-system.js    # Visual effects
├── sounds/
│   └── README.md             # Notes (no audio assets required)
└── README.md
```

## Sound Effects

All sounds are synthesized in `js/sound-manager.js`. See `sounds/README.md` for details.

## Mathematical Concepts

This game teaches:
- **Parabolic equations**: The vertex form `y = -a(x-h)² + k`
- **Parameter effects**:
  - `a`: Stretch factor (negative = downward opening)
  - `h`: Horizontal translation (vertex x-coordinate)
  - `k`: Vertical translation (vertex y-coordinate)
- **Physics**: Gravity, velocity, and collision detection
- **Problem-solving**: Estimating parameters to hit targets

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ⚠️ Partial support (touch input not yet implemented)

## Future Enhancements

- [ ] Touch/Mobile controls
- [ ] More levels
- [ ] Power-ups (multi-bird, slow-motion, etc.)
- [ ] Difficulty settings
- [ ] Leaderboards
- [ ] Custom level editor
- [ ] Multiplayer mode
- [ ] Different bird types with unique properties
- [ ] Animation and improved graphics

## Learning Resources

For more information about parabolic equations:
- Khan Academy: [Vertex form of parabolas](https://www.khanacademy.org)
- Math is Fun: [Parabola](https://www.mathsisfun.com)
- Wikipedia: [Parabola](https://en.wikipedia.org/wiki/Parabola)

## License

This project is open source and available for educational use.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Made with ❤️ for math and game lovers everywhere!**