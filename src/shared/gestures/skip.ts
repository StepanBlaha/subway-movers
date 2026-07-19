import type { Baseline } from "../calibrate";
import type { Features } from "../pose";

/**
 * Presence gate: are the legs still skipping in place? Counts a "step" each
 * time either knee rises above baseline by `liftThresh` (scaled by shoulder
 * width) then comes back down. No step within `timeout` seconds -> not running.
 */
export class SkipDetector {
  private lastStep = -1e9;
  private up = { l: false, r: false };
  stepCount = 0;

  constructor(
    private liftThresh: number,
    private timeout: number,
  ) {}

  update(f: Features, baseline: Baseline, now: number): boolean {
    const lift = this.liftThresh * baseline.shoulderWidth;
    const rearm = 0.5 * lift;

    const knees: [keyof typeof this.up, number][] = [
      ["l", f.kneeLY],
      ["r", f.kneeRY],
    ];
    for (const [side, kneeY] of knees) {
      const rise = baseline.kneeY - kneeY; // y grows down -> positive = up
      if (!this.up[side] && rise > lift) {
        this.up[side] = true;
        this.lastStep = now;
        this.stepCount += 1;
      } else if (this.up[side] && rise < rearm) {
        this.up[side] = false;
      }
    }
    return now - this.lastStep <= this.timeout;
  }
}
