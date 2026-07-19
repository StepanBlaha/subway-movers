import time


class SkipDetector:
    """Presence gate: are the legs still skipping in place?

    Counts a "step" each time either knee rises above baseline by
    `lift_thresh` (scaled by shoulder width) then comes back down. If no step
    happens within `timeout` seconds, `running` goes False.
    """

    def __init__(self, lift_thresh, timeout):
        self.lift_thresh = lift_thresh
        self.timeout = timeout
        self._last_step = 0.0
        self._up = {"l": False, "r": False}
        self.step_count = 0

    def update(self, f, baseline, now=None):
        now = now if now is not None else time.monotonic()
        lift = self.lift_thresh * baseline.shoulder_width
        rearm = 0.5 * lift  # hysteresis before another step counts

        for side, knee_y in (("l", f.knee_l_y), ("r", f.knee_r_y)):
            rise = baseline.knee_y - knee_y  # y grows down -> rise is positive up
            if not self._up[side] and rise > lift:
                self._up[side] = True
                self._last_step = now
                self.step_count += 1
            elif self._up[side] and rise < rearm:
                self._up[side] = False

        return (now - self._last_step) <= self.timeout

    @property
    def running(self):
        return (time.monotonic() - self._last_step) <= self.timeout
