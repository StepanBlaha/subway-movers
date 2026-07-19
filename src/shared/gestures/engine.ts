import type { Baseline } from "../calibrate";
import type { Action, Config } from "../config";
import type { Features } from "../pose";
import { TriggerAxis } from "./base";
import { SkipDetector } from "./skip";

export interface Signals {
  lane: number;
  jump: number;
  duck: number;
}

/**
 * Turns per-frame Features + Baseline into discrete game actions.
 * Lanes are RELATIVE (one sidestep = one move). A recent move keeps you
 * "alive" for `actionGrace` seconds so moving doesn't trip the skip gate.
 */
export class GestureEngine {
  readonly skip: SkipDetector;
  private left: TriggerAxis;
  private right: TriggerAxis;
  private up: TriggerAxis;
  private down: TriggerAxis;
  private restart: TriggerAxis;

  running = false;
  signals: Signals = { lane: 0, jump: 0, duck: 0 };
  private laneRefX: number | null = null;
  private lastActionAt = -1e9;
  private lastJumpAt = -1e9;

  constructor(private cfg: Config) {
    this.skip = new SkipDetector(cfg.kneeLiftThreshold, cfg.skipTimeout);
    this.left = new TriggerAxis("left", cfg.laneThreshold, cfg.laneRelease, cfg.laneCooldown);
    this.right = new TriggerAxis("right", cfg.laneThreshold, cfg.laneRelease, cfg.laneCooldown);
    this.up = new TriggerAxis("up", cfg.jumpThreshold, cfg.jumpRelease, cfg.cooldown);
    this.down = new TriggerAxis("down", cfg.duckThreshold, cfg.duckRelease, cfg.cooldown);
    this.restart = new TriggerAxis(
      "restart",
      cfg.restartThreshold,
      cfg.restartRelease,
      cfg.restartCooldown,
    );
  }

  update(f: Features, baseline: Baseline, now: number): Action[] {
    const sw = baseline.shoulderWidth;
    if (this.laneRefX === null) this.laneRefX = baseline.hipX;

    const dx = (f.hipX - this.laneRefX) / sw; // + right, - left (mirrored view)
    const jump = (baseline.hipY - f.hipY) / sw; // + up
    const duck = (f.shoulderY - baseline.shoulderY) / sw; // + down
    this.signals = { lane: dx, jump, duck };

    const right = this.right.update(dx, now);
    const left = this.left.update(-dx, now);
    if (right || left) this.laneRefX = f.hipX; // re-center after a lane move

    const up = this.up.update(jump, now);
    if (up) this.lastJumpAt = now;

    // Duck only while standing+crouching, never mid-jump.
    const jumping =
      jump > this.cfg.jumpRelease ||
      this.up.state === "triggered" ||
      now - this.lastJumpAt <= this.cfg.jumpDuckLockout;
    const down = this.down.update(jumping ? -1 : duck, now);

    // Restart: raise both hands above your shoulders (works on the game-over screen).
    const handsUp = (baseline.shoulderY - Math.max(f.wristLY, f.wristRY)) / sw;
    const restart = this.restart.update(handsUp, now);

    const actions = [right, left, up, down].filter((a): a is Action => a !== null);
    if (actions.length) this.lastActionAt = now;

    const skipping = this.skip.update(f, baseline, now);
    this.running = skipping || now - this.lastActionAt <= this.cfg.actionGrace;

    const gated = this.cfg.requireRunning && !this.running ? [] : actions;
    // restart always passes the gate (you're likely stopped on game-over)
    return restart ? [...gated, restart] : gated;
  }
}
