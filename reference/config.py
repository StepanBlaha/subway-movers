from dataclasses import dataclass, field


@dataclass
class Config:
    # --- camera / display ---
    camera_index: int = 0
    flip: bool = True         # mirror view so screen matches your body
    display_width: int = 1100  # upscale the HUD window so it's readable from afar

    # --- startup / calibration ---
    countdown_secs: float = 8.0  # time to focus the game + step into frame
    calib_frames: int = 90       # frames of neutral standing pose to average

    # --- thresholds (fraction of shoulder width -> scale invariant) ---
    # lanes are RELATIVE: one sidestep from your current spot = one lane move.
    lane_threshold: float = 0.45   # hip-center X step to switch lane
    lane_release: float = 0.20     # return under this to re-arm
    lane_cooldown: float = 0.55    # longer gap so one step != two moves
    jump_threshold: float = 0.20   # hip-center rise (up) - small hop is enough
    jump_release: float = 0.10
    duck_threshold: float = 0.15   # shoulder-center drop (down) - slight crouch
    duck_release: float = 0.08
    jump_duck_lockout: float = 0.5  # ignore duck for this long during/after a jump

    # --- skip / running (presence gate) ---
    knee_lift_threshold: float = 0.18  # knee rise above baseline = a step
    skip_timeout: float = 1.5          # seconds w/o a step -> not running
    action_grace: float = 3.0          # a move keeps you "alive" this long w/o skipping

    # --- debounce ---
    cooldown: float = 0.22  # min seconds between fires on the same axis

    # --- gameplay ---
    require_running: bool = False  # gate: only send keys while running (OFF for now)
    pause_enabled: bool = False    # send pause_key when you stop/resume skipping
    pause_key: str = "esc"         # try "esc"; swap to "p"/"space" if your game differs

    # --- output keys (pynput key names) ---
    keymap: dict = field(
        default_factory=lambda: {
            "left": "left",
            "right": "right",
            "up": "up",
            "down": "down",
        }
    )
