import time


class TriggerAxis:
    """Discrete one-shot trigger with hysteresis + cooldown.

    Fires once when `signal` crosses `fire_thresh`; will not re-fire until the
    signal falls back under `release_thresh` AND `cooldown` seconds have passed.
    """

    NEUTRAL = "neutral"
    TRIGGERED = "triggered"

    def __init__(self, action, fire_thresh, release_thresh, cooldown):
        self.action = action
        self.fire_thresh = fire_thresh
        self.release_thresh = release_thresh
        self.cooldown = cooldown
        self.state = self.NEUTRAL
        self._last_fire = 0.0

    def update(self, signal, now=None):
        """Return `action` on the frame it fires, else None."""
        now = now if now is not None else time.monotonic()
        if self.state == self.NEUTRAL:
            if signal >= self.fire_thresh and (now - self._last_fire) >= self.cooldown:
                self.state = self.TRIGGERED
                self._last_fire = now
                return self.action
        else:  # TRIGGERED
            if signal <= self.release_thresh:
                self.state = self.NEUTRAL
        return None
