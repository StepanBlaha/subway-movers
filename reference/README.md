# Subway Movers

Play the real Subway Surfers with your body. A webcam watches you, MediaPipe
reads your pose, and the app fires arrow-key taps into whatever game window has
focus — the web version **or** BlueStacks running the official app.

## Controls

| Body move                         | Game action     | Key   |
| --------------------------------- | --------------- | ----- |
| Skip legs in place (keep going!)  | Stay running    | gate  |
| Step / lean right                 | Switch lane R   | →     |
| Step / lean left                  | Switch lane L   | ←     |
| Jump up                           | Jump obstacle   | ↑     |
| Crouch / duck                     | Roll under      | ↓     |

**Presence gate:** stop skipping and the app pauses the game (sends `pause_key`,
default Esc) and stops sending moves. Start skipping again to resume. Lanes are
**relative** — one sidestep from wherever you stand = one lane move.

**Global hotkeys** (fire even while the game is focused): `F8` recalibrate ·
`F9` toggle dry-run · `F10` quit. No need to click the camera window.

## Setup

```bash
cd subway-movers
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# one-time: download the pose model (uses the Tasks API, works on Python 3.13)
mkdir -p models
curl -sSL -o models/pose_landmarker_lite.task \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"

python main.py            # add --dry-run to test without sending keys
```

Stand ~1.5–2 m back so the camera sees your whole body. On launch, hold a
neutral standing pose for ~2 s to calibrate. Recalibrate anytime with `c`.

### Hotkeys
- `q` quit · `k` toggle dry-run · `c` recalibrate

## Driving the game

The app only presses ← → ↑ ↓. Point them at your target:

- **Web (poki.com/en/g/subway-surfers):** open the game, click it once so it
  has keyboard focus, then keep the browser window frontmost.
- **BlueStacks (official Android app):** open the Keymap editor, bind swipe
  Left/Right/Up/Down to the arrow keys, keep the BlueStacks window frontmost.

Same code either way — it just types arrows into the focused window.

> macOS: grant the terminal/Python **Accessibility** and **Camera** permission
> (System Settings → Privacy & Security) or key sending is silently blocked.

## Tuning

All thresholds live in `config.py`, expressed as a fraction of your shoulder
width so they scale to any distance. Lower them for a smaller "lean in place"
style; raise them to require bigger, full-body movements. `cooldown` controls
minimum time between repeat fires on one axis.

## Layout

```
main.py           capture loop: read -> pose -> gate -> send -> draw
pose.py           MediaPipe wrapper + per-frame Features
calibrate.py      neutral-pose baseline capture
gestures/
  base.py         TriggerAxis: one-shot fire w/ hysteresis + cooldown
  skip.py         SkipDetector: knee-oscillation running gate
  engine.py       maps Features+Baseline -> actions
input_backend.py  KeyboardBackend (pynput) / NullBackend
overlay.py        OpenCV HUD
config.py         all thresholds + keymap
```
