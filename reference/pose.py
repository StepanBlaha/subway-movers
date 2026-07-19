import os
import time
from dataclasses import dataclass

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# MediaPipe Pose landmark indices we care about
NOSE = 0
L_SHOULDER = 11
R_SHOULDER = 12
L_HIP = 23
R_HIP = 24
L_KNEE = 25
R_KNEE = 26

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "pose_landmarker_lite.task")

# Minimal skeleton for the HUD overlay (index pairs).
_CONNECTIONS = [
    (11, 12), (11, 23), (12, 24), (23, 24),           # torso box
    (11, 13), (13, 15), (12, 14), (14, 16),           # arms
    (23, 25), (25, 27), (24, 26), (26, 28),           # legs
]


@dataclass
class Features:
    """Per-frame body signals, all in normalized [0,1] image coords (y grows down)."""

    shoulder_x: float
    shoulder_y: float
    hip_x: float
    hip_y: float
    knee_l_y: float
    knee_r_y: float
    shoulder_width: float  # scale reference


def _mid(a, b):
    return (a.x + b.x) / 2.0, (a.y + b.y) / 2.0


class PoseEstimator:
    """Wraps the MediaPipe Tasks PoseLandmarker (VIDEO mode)."""

    def __init__(self, model_path=MODEL_PATH):
        if not os.path.exists(model_path):
            raise SystemExit(
                f"Missing pose model: {model_path}\n"
                "Download it with the curl command in the README."
            )
        options = vision.PoseLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
        )
        self._landmarker = vision.PoseLandmarker.create_from_options(options)

    def process(self, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts_ms = int(time.monotonic() * 1000)
        return self._landmarker.detect_for_video(mp_image, ts_ms)

    def draw(self, frame_bgr, result):
        if not result.pose_landmarks:
            return
        h, w = frame_bgr.shape[:2]
        lm = result.pose_landmarks[0]
        pts = [(int(p.x * w), int(p.y * h)) for p in lm]
        for a, b in _CONNECTIONS:
            if a < len(pts) and b < len(pts):
                cv2.line(frame_bgr, pts[a], pts[b], (0, 200, 0), 2, cv2.LINE_AA)
        for x, y in pts:
            cv2.circle(frame_bgr, (x, y), 3, (0, 220, 220), -1, cv2.LINE_AA)

    @staticmethod
    def extract(result):
        if not result.pose_landmarks:
            return None
        lm = result.pose_landmarks[0]
        sx, sy = _mid(lm[L_SHOULDER], lm[R_SHOULDER])
        hx, hy = _mid(lm[L_HIP], lm[R_HIP])
        sw = ((lm[L_SHOULDER].x - lm[R_SHOULDER].x) ** 2
              + (lm[L_SHOULDER].y - lm[R_SHOULDER].y) ** 2) ** 0.5
        if sw < 1e-4:
            return None
        return Features(
            shoulder_x=sx,
            shoulder_y=sy,
            hip_x=hx,
            hip_y=hy,
            knee_l_y=lm[L_KNEE].y,
            knee_r_y=lm[R_KNEE].y,
            shoulder_width=sw,
        )
