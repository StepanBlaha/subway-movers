import type { Action } from "../config";

type State = "neutral" | "triggered";

/**
 * Discrete one-shot trigger with hysteresis + cooldown. Fires once when
 * `signal` crosses `fireThresh`; re-arms only after the signal drops under
 * `releaseThresh` AND `cooldown` seconds have passed.
 */
export class TriggerAxis {
  state: State = "neutral";
  private lastFire = -1e9;

  constructor(
    private action: Action,
    private fireThresh: number,
    private releaseThresh: number,
    private cooldown: number,
  ) {}

  update(signal: number, now: number): Action | null {
    if (this.state === "neutral") {
      if (signal >= this.fireThresh && now - this.lastFire >= this.cooldown) {
        this.state = "triggered";
        this.lastFire = now;
        return this.action;
      }
    } else if (signal <= this.releaseThresh) {
      this.state = "neutral";
    }
    return null;
  }
}
