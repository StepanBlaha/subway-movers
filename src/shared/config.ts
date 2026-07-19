export type Action = "left" | "right" | "up" | "down" | "restart";
export type Target = "web" | "bluestacks";

export interface Config {
  // startup / calibration
  countdownSecs: number; // time to focus the game + step into frame
  calibFrames: number; // frames of neutral standing pose to average

  // thresholds (fraction of shoulder width -> scale invariant)
  laneThreshold: number; // hip-center X step to switch lane (RELATIVE)
  laneRelease: number;
  laneCooldown: number; // longer gap so one step != two moves
  jumpThreshold: number; // hip-center rise (up)
  jumpRelease: number;
  duckThreshold: number; // shoulder-center drop (down)
  duckRelease: number;
  jumpDuckLockout: number; // ignore duck during/after a jump (seconds)
  restartThreshold: number; // both wrists above shoulders by this (x shoulder width)
  restartRelease: number;
  restartCooldown: number;

  // skip / running (presence gate)
  kneeLiftThreshold: number;
  skipTimeout: number;
  actionGrace: number; // a move keeps you "alive" this long w/o skipping

  // debounce
  cooldown: number; // min seconds between fires on the same axis

  // gameplay
  requireRunning: boolean; // gate: only send keys while running
  webUrl: string;
}

export const defaultConfig: Config = {
  countdownSecs: 8,
  calibFrames: 90,

  laneThreshold: 0.45,
  laneRelease: 0.2,
  laneCooldown: 0.55,
  jumpThreshold: 0.13,
  jumpRelease: 0.06,
  duckThreshold: 0.1,
  duckRelease: 0.05,
  jumpDuckLockout: 0.5,
  restartThreshold: 0.5, // raise both hands above your shoulders
  restartRelease: 0.15,
  restartCooldown: 1.5,

  kneeLiftThreshold: 0.18,
  skipTimeout: 1.5,
  actionGrace: 3.0,

  cooldown: 0.22,

  requireRunning: false,
  webUrl: "https://poki.com/en/g/subway-surfers",
};
