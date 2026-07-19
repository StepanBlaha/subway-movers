import cv2

GREEN = (0, 220, 0)
RED = (0, 0, 220)
WHITE = (240, 240, 240)
YELLOW = (0, 220, 220)

FONT = cv2.FONT_HERSHEY_SIMPLEX


def _text(img, s, y, color=WHITE, scale=0.9, x=14):
    cv2.putText(img, s, (x, y), FONT, scale, (0, 0, 0), 5, cv2.LINE_AA)
    cv2.putText(img, s, (x, y), FONT, scale, color, 2, cv2.LINE_AA)


def draw_countdown(img, secs_left):
    n = int(secs_left) + 1
    _text(img, "FOCUS THE GAME, then step back - whole body in frame", 40, YELLOW, 0.9)
    big = str(n)
    (tw, th), _ = cv2.getTextSize(big, FONT, 6, 10)
    cx = (img.shape[1] - tw) // 2
    cy = (img.shape[0] + th) // 2
    cv2.putText(img, big, (cx, cy), FONT, 6, (0, 0, 0), 18, cv2.LINE_AA)
    cv2.putText(img, big, (cx, cy), FONT, 6, YELLOW, 8, cv2.LINE_AA)


def draw_calibrating(img, progress):
    _text(img, "CALIBRATING - stand neutral, arms slightly out", 40, YELLOW, 1.0)
    w = img.shape[1] - 28
    cv2.rectangle(img, (14, 56), (14 + w, 82), (60, 60, 60), -1)
    cv2.rectangle(img, (14, 56), (14 + int(w * progress), 82), YELLOW, -1)


def draw_hud(img, engine, last_action, dry_run):
    running = engine.running
    _text(img, "RUNNING" if running else "STOPPED - keep skipping!",
          46, GREEN if running else RED, 1.2)

    s = engine.signals
    _text(img, f"lane {s['lane']:+.2f}   jump {s['jump']:+.2f}   duck {s['duck']:+.2f}", 86, WHITE, 0.8)
    _text(img, f"steps {engine.skip.step_count}", 118, WHITE, 0.8)

    if last_action:
        arrow = {"left": "<< LEFT", "right": "RIGHT >>", "up": "^ JUMP", "down": "v DUCK"}
        _text(img, arrow.get(last_action, last_action.upper()), 168, YELLOW, 1.6)

    if dry_run:
        _text(img, "DRY-RUN - F9 to send keys", img.shape[0] - 20, YELLOW, 0.8)
    else:
        _text(img, "F8 recal  F9 dry-run  F10 quit", img.shape[0] - 20, WHITE, 0.8)
