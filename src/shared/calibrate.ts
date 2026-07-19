import type { Features } from "./pose";

export interface Baseline {
  hipX: number;
  hipY: number;
  shoulderY: number;
  kneeY: number; // avg of both knees when standing
  shoulderWidth: number;
}

/** Average a few seconds of neutral standing to fix a personal baseline. */
export class Calibrator {
  private hipX = 0;
  private hipY = 0;
  private shY = 0;
  private kneeY = 0;
  private sw = 0;
  count = 0;

  constructor(private framesNeeded: number) {}

  get done(): boolean {
    return this.count >= this.framesNeeded;
  }

  get progress(): number {
    return Math.min(1, this.count / this.framesNeeded);
  }

  feed(f: Features): void {
    this.hipX += f.hipX;
    this.hipY += f.hipY;
    this.shY += f.shoulderY;
    this.kneeY += (f.kneeLY + f.kneeRY) / 2;
    this.sw += f.shoulderWidth;
    this.count += 1;
  }

  result(): Baseline {
    const n = Math.max(1, this.count);
    return {
      hipX: this.hipX / n,
      hipY: this.hipY / n,
      shoulderY: this.shY / n,
      kneeY: this.kneeY / n,
      shoulderWidth: this.sw / n,
    };
  }
}
