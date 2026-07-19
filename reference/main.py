import argparse
import threading
import time

import cv2

from calibrate import Calibrator
from config import Config
from gestures import GestureEngine
from input_backend import KeyboardBackend, NullBackend
from overlay import draw_calibrating, draw_countdown, draw_hud
from pose import PoseEstimator

WINDOW = "Subway Movers"

COUNTDOWN = "countdown"  # focus the game + step into frame
CALIBRATING = "calib"    # averaging neutral pose
RUNNING = "running"      # playing


def keytest(cfg):
    """Prove arrow keys reach the focused window. Focus the game, watch it react."""
    kb = KeyboardBackend(cfg.keymap)
    print("KEYTEST: focus the game window NOW. Sending arrows every 1s. Ctrl-C to stop.")
    for i in range(3, 0, -1):
        print(f"  starting in {i}...")
        time.sleep(1)
    try:
        while True:
            for action in ("left", "right", "up", "down"):
                print(f"  -> {action}")
                kb.send(action)
                time.sleep(1.0)
    except KeyboardInterrupt:
        print("\nkeytest stopped")


def main():
    ap = argparse.ArgumentParser(description="Control Subway Surfers with your body.")
    ap.add_argument("--camera", type=int, default=None, help="camera index override")
    ap.add_argument("--dry-run", action="store_true", help="detect but do not send keys")
    ap.add_argument("--keytest", action="store_true", help="send arrows on a timer to test the game link")
    args = ap.parse_args()

    cfg = Config()
    if args.camera is not None:
        cfg.camera_index = args.camera

    if args.keytest:
        keytest(cfg)
        return

    cap = cv2.VideoCapture(cfg.camera_index)
    if not cap.isOpened():
        raise SystemExit(f"Cannot open camera {cfg.camera_index}")

    pose = PoseEstimator()
    engine = GestureEngine(cfg)
    keyboard = KeyboardBackend(cfg.keymap)
    dry_run = args.dry_run

    # shared flags settable from the global-hotkey thread (works while the game is focused)
    flags = {"recalibrate": False, "toggle_dry": False, "quit": False}
    _start_hotkeys(flags)

    calibrator = Calibrator(cfg.calib_frames)
    baseline = None
    last_action = None
    last_action_at = 0.0
    prev_running = True  # assume the game is running right after calibration

    state = COUNTDOWN
    countdown_end = time.monotonic() + cfg.countdown_secs

    def backend():
        return NullBackend() if dry_run else keyboard

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if cfg.flip:
            frame = cv2.flip(frame, 1)
        if cfg.display_width and frame.shape[1] != cfg.display_width:
            h, w = frame.shape[:2]
            frame = cv2.resize(frame, (cfg.display_width, int(h * cfg.display_width / w)))

        result = pose.process(frame)
        pose.draw(frame, result)
        feats = pose.extract(result)
        now = time.monotonic()

        # apply global-hotkey requests
        if flags["quit"]:
            break
        if flags["toggle_dry"]:
            dry_run = not dry_run
            flags["toggle_dry"] = False
        if flags["recalibrate"]:
            flags["recalibrate"] = False
            calibrator = Calibrator(cfg.calib_frames)
            engine = GestureEngine(cfg)
            baseline = None
            prev_running = True
            state = COUNTDOWN
            countdown_end = now + cfg.countdown_secs

        if state == COUNTDOWN:
            left = countdown_end - now
            if left <= 0:
                state = CALIBRATING
            else:
                draw_countdown(frame, left)
        elif state == CALIBRATING:
            if feats is not None:
                calibrator.feed(feats)
                if calibrator.done:
                    baseline = calibrator.result()
                    state = RUNNING
            draw_calibrating(frame, calibrator.progress)
        elif state == RUNNING and feats is not None:
            actions = engine.update(feats, baseline, now)
            if cfg.pause_enabled and engine.running != prev_running:
                backend().tap(cfg.pause_key)
                prev_running = engine.running
            for action in actions:
                backend().send(action)
                last_action, last_action_at = action, now
            if last_action and (now - last_action_at) > 0.6:
                last_action = None
            draw_hud(frame, engine, last_action, dry_run)

        cv2.imshow(WINDOW, frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        if key == ord("k"):
            dry_run = not dry_run
        if key == ord("c"):
            calibrator = Calibrator(cfg.calib_frames)
            engine = GestureEngine(cfg)
            baseline = None
            prev_running = True
            state = COUNTDOWN
            countdown_end = now + cfg.countdown_secs

    cap.release()
    cv2.destroyAllWindows()


def _start_hotkeys(flags):
    """Global hotkeys (fire even when the game is focused): F8 recalibrate, F9 dry-run, F10 quit."""
    try:
        from pynput import keyboard as kb
    except Exception:
        return

    def on(name):
        def _cb():
            flags[name] = True
        return _cb

    listener = kb.GlobalHotKeys({
        "<f8>": on("recalibrate"),
        "<f9>": on("toggle_dry"),
        "<f10>": on("quit"),
    })
    listener.daemon = True
    listener.start()


if __name__ == "__main__":
    main()
