from dataclasses import dataclass


@dataclass
class Baseline:
    hip_x: float
    hip_y: float
    shoulder_y: float
    knee_y: float  # avg of both knees when standing
    shoulder_width: float


class Calibrator:
    """Average a few seconds of neutral standing to fix a personal baseline."""

    def __init__(self, frames_needed):
        self.frames_needed = frames_needed
        self._hip_x = 0.0
        self._hip_y = 0.0
        self._sh_y = 0.0
        self._knee_y = 0.0
        self._sw = 0.0
        self.count = 0

    @property
    def done(self):
        return self.count >= self.frames_needed

    @property
    def progress(self):
        return min(1.0, self.count / self.frames_needed)

    def feed(self, f):
        self._hip_x += f.hip_x
        self._hip_y += f.hip_y
        self._sh_y += f.shoulder_y
        self._knee_y += (f.knee_l_y + f.knee_r_y) / 2.0
        self._sw += f.shoulder_width
        self.count += 1

    def result(self):
        n = max(1, self.count)
        return Baseline(
            hip_x=self._hip_x / n,
            hip_y=self._hip_y / n,
            shoulder_y=self._sh_y / n,
            knee_y=self._knee_y / n,
            shoulder_width=self._sw / n,
        )
