<div align="center">

# Subway Movers

**Play the real Subway Surfers with your body.**

A tiny always-on-top HUD sits in the corner of your screen, watches you
through the webcam, and turns your steps, jumps, and ducks into arrow-key
taps, sent straight into the web game or BlueStacks.

![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-333333?style=flat-square&labelColor=222222)
![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-39d353?style=flat-square&labelColor=222222)
![pose](https://img.shields.io/badge/pose-MediaPipe%20tasks--vision-39d353?style=flat-square&labelColor=222222)

</div>

---

## How it plays

No sensors, no controller, just a webcam and a spare 1.5 to 2 m of floor.
Hit **Play**, the game opens, an 8-second countdown gives you time to step
into frame, a 3-second calibration learns your neutral stance, then you're
live.

| Body move          | Game action   | Key |
| ------------------- | -------------- | :-: |
| Step / lean right   | Switch lane →   | →   |
| Step / lean left    | Switch lane ←   | ←   |
| Jump up              | Jump obstacle  | ↑   |
| Crouch / duck        | Roll under     | ↓   |

Lane moves are **relative**: one sidestep from wherever you're standing is
one lane, so you never drift out of frame. Duck is locked out during and
just after a jump so a jump never fires a phantom roll.

## Get it running

```bash
git clone https://github.com/StepanBlaha/subway-movers.git
cd subway-movers
npm install
npm run dev
```

A frameless 380x520 window appears top-left, floating above everything else
(including fullscreen games) without stealing focus.

1. Pick a **Target**, Web (poki) or BlueStacks, and hit **▶ Play**.
2. The game launches; grant camera access when prompted.
3. Step back until your whole body is in frame during the countdown.
4. Stand neutral through the 3-second calibration.
5. Move. The HUD shows live lane/jump/duck signals and the last action fired.

Use **Recalibrate** if you shift position mid-session, **Dry-run** to watch
detection without sending keys, and **Stop** to end the session.

### macOS permissions

System Settings, then **Privacy & Security**:

- **Camera**: allow your terminal (or the packaged app)
- **Accessibility**: required, or key taps are silently dropped by `nut.js`

### Notes

- MediaPipe's WASM runtime loads from the jsdelivr CDN, so the first run
  needs internet access.
- **BlueStacks**: open its Keymap editor, bind swipe Left/Right/Up/Down to
  the arrow keys, then keep the BlueStacks window focused while you play.

## Tuning

Every threshold lives in [`src/shared/config.ts`](src/shared/config.ts),
expressed as a fraction of shoulder width so it stays scale-invariant across
distance from the camera. Lower a threshold for smaller "lean in place"
moves, raise it to require bigger, more deliberate movement.

- `laneCooldown`: stops one step firing two lane changes
- `jumpDuckLockout`: stops a jump triggering a duck
- `requireRunning`: gate that only sends keys while the skip/run detector
  says you're moving (off by default)

## Under the hood

```
src/
  main/index.ts       Electron main: always-on-top window, nut.js key taps, launch game
  preload/index.ts     contextBridge API (sendAction / launchGame / quit)
  renderer/
    src/App.tsx        Play screen, camera canvas, countdown, calibrate, HUD
    src/Logo.tsx        App mark, reused in the titlebar and idle screen
    src/styles.css      Theme + layout
  shared/
    config.ts          Thresholds + shared types
    pose.ts             MediaPipe tasks-vision wrapper (init / extract / draw)
    calibrate.ts         Neutral-pose baseline capture
    gestures/
      base.ts             TriggerAxis, one-shot fire with hysteresis + cooldown
      skip.ts              SkipDetector, knee-oscillation running gate
      engine.ts            Features + Baseline -> actions (relative lanes, jump/duck lockout)
reference/               Original Python + OpenCV prototype, kept for reference
```

Pose detection runs fully in-app via MediaPipe `tasks-vision`; key injection
is native via [`nut.js`](https://github.com/nut-tree/nut-js) so it reaches
whatever window is focused, browser or emulator.

## Scripts

| Command             | What it does                        |
| -------------------- | ------------------------------------ |
| `npm run dev`         | Launch in dev mode with hot reload   |
| `npm run build`       | Production build via `electron-vite` |
| `npm run start`       | Preview a production build           |
| `npm run typecheck`   | Type-check main + renderer           |

## Landing page

[`docs/index.html`](docs/index.html) is a self-contained "sticker slap"
marketing page (no build step; styles are inline, fonts load from Google
Fonts). A matching [`docs/privacy.html`](docs/privacy.html) covers the
on-device privacy story. Both are served straight out of `docs/`, which is
GitHub Pages' default publish folder:

1. Repo Settings, then **Pages**, then set Source to the `main` branch and
   the `/docs` folder.
2. It publishes at `https://stepanblaha.github.io/subway-movers/`, with the
   privacy page at `.../subway-movers/privacy.html`.

Any static host works the same way, since it's just `index.html` and
`privacy.html`: Netlify (drag the `docs/` folder in), Vercel (`vercel deploy
docs`), or Cloudflare Pages (build output directory `docs`).

To preview it locally:

```bash
cd docs
python3 -m http.server 8080
# open http://localhost:8080
```
