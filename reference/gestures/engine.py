import time

from .base import TriggerAxis
from .skip import SkipDetector


class GestureEngine:
    """Turns per-frame Features + Baseline into discrete game actions.

    Actions: "left", "right", "up" (jump), "down" (duck).
    Running state is a presence gate; when required, actions are suppressed
    unless the player is actively skipping.
    """

    def __init__(self, cfg):
        self.cfg = cfg
        self.skip = SkipDetector(cfg.knee_lift_threshold, cfg.skip_timeout)
        self.left = TriggerAxis("left", cfg.lane_threshold, cfg.lane_release, cfg.lane_cooldown)
        self.right = TriggerAxis("right", cfg.lane_threshold, cfg.lane_release, cfg.lane_cooldown)
        self.up = TriggerAxis("up", cfg.jump_threshold, cfg.jump_release, cfg.cooldown)
        self.down = TriggerAxis("down", cfg.duck_threshold, cfg.duck_release, cfg.cooldown)
        self.running = False
        self.lane_ref_x = None  # moving reference so lanes are relative
        self.last_action_at = -1e9  # for the action grace window
        self._last_jump_at = -1e9   # to lock out duck around jumps
        self.signals = {"lane": 0.0, "jump": 0.0, "duck": 0.0}

    def update(self, f, baseline, now=None):
        now = now if now is not None else time.monotonic()
        sw = baseline.shoulder_width
        if self.lane_ref_x is None:
            self.lane_ref_x = baseline.hip_x

        # Lane is RELATIVE to the current spot: one step = one move, then re-center.
        dx = (f.hip_x - self.lane_ref_x) / sw         # + right, - left (mirrored view)
        jump = (baseline.hip_y - f.hip_y) / sw        # + up (relative to standing)
        duck = (f.shoulder_y - baseline.shoulder_y) / sw  # + down (relative to standing)
        self.signals = {"lane": dx, "jump": jump, "duck": duck}

        # Detect every gesture regardless of the gate.
        right = self.right.update(dx, now)
        left = self.left.update(-dx, now)
        if right or left:
            self.lane_ref_x = f.hip_x  # re-center after a lane move
        up = self.up.update(jump, now)
        if up:
            self._last_jump_at = now

        # Duck only while standing+crouching, never mid-jump. Suppress duck when the
        # body is rising, the jump axis is still latched, or just after a jump.
        jumping = (jump > self.cfg.jump_release
                   or self.up.state == TriggerAxis.TRIGGERED
                   or (now - self._last_jump_at) <= self.cfg.jump_duck_lockout)
        down = self.down.update(-1.0 if jumping else duck, now)
        actions = [a for a in (right, left, up, down) if a]
        if actions:
            self.last_action_at = now  # a move counts as staying alive

        skipping = self.skip.update(f, baseline, now)
        # A recent move overrides the skip gate for a few seconds.
        self.running = skipping or (now - self.last_action_at) <= self.cfg.action_grace

        if self.cfg.require_running and not self.running:
            return []
        return actions
