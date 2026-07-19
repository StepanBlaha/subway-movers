import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const MODEL_URL = "models/pose_landmarker_lite.task";

// MediaPipe Pose landmark indices
const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;
const L_KNEE = 25;
const R_KNEE = 26;

const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24], // torso
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
];

export interface Features {
  shoulderX: number;
  shoulderY: number;
  hipX: number;
  hipY: number;
  kneeLY: number;
  kneeRY: number;
  wristLY: number;
  wristRY: number;
  shoulderWidth: number;
}

export async function createPose(): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const buf = new Uint8Array(await (await fetch(MODEL_URL)).arrayBuffer());
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: buf },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

export function extract(result: PoseLandmarkerResult): Features | null {
  const lm = result.landmarks?.[0];
  if (!lm) return null;
  const sx = (lm[L_SHOULDER].x + lm[R_SHOULDER].x) / 2;
  const sy = (lm[L_SHOULDER].y + lm[R_SHOULDER].y) / 2;
  const hx = (lm[L_HIP].x + lm[R_HIP].x) / 2;
  const hy = (lm[L_HIP].y + lm[R_HIP].y) / 2;
  const sw = Math.hypot(lm[L_SHOULDER].x - lm[R_SHOULDER].x, lm[L_SHOULDER].y - lm[R_SHOULDER].y);
  if (sw < 1e-4) return null;
  return {
    shoulderX: sx,
    shoulderY: sy,
    hipX: hx,
    hipY: hy,
    kneeLY: lm[L_KNEE].y,
    kneeRY: lm[R_KNEE].y,
    wristLY: lm[L_WRIST].y,
    wristRY: lm[R_WRIST].y,
    shoulderWidth: sw,
  };
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  result: PoseLandmarkerResult,
  w: number,
  h: number,
): void {
  const lm = result.landmarks?.[0];
  if (!lm) return;
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,220,0,0.9)";
  for (const [a, b] of CONNECTIONS) {
    if (!lm[a] || !lm[b]) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * w, lm[a].y * h);
    ctx.lineTo(lm[b].x * w, lm[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,220,220,0.95)";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  void NOSE;
}
