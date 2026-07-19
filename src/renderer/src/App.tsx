import { useEffect, useRef, useState } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { defaultConfig, type Action, type Target } from "@shared/config";
import { Calibrator, type Baseline } from "@shared/calibrate";
import { GestureEngine, type Signals } from "@shared/gestures/engine";
import { createPose, extract, drawSkeleton } from "@shared/pose";
import { Logo } from "./Logo";

type Phase = "idle" | "loading" | "countdown" | "calibrating" | "running";

const cfg = defaultConfig;

export default function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<Target>("web");
  const [dryRun, setDryRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // per-frame HUD state
  const [countLeft, setCountLeft] = useState(0);
  const [calibProgress, setCalibProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [signals, setSignals] = useState<Signals>({ lane: 0, jump: 0, duck: 0 });
  const [steps, setSteps] = useState(0);
  const [lastAction, setLastAction] = useState<Action | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<PoseLandmarker | null>(null);
  const engineRef = useRef<GestureEngine | null>(null);
  const calibRef = useRef<Calibrator | null>(null);
  const baselineRef = useRef<Baseline | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const countdownEndRef = useRef(0);
  const dryRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastActionAtRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    dryRef.current = dryRun;
  }, [dryRun]);

  async function handlePlay() {
    setError(null);
    setPhase("loading");
    try {
      await window.api.launchGame({ target, url: cfg.webUrl });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      if (!poseRef.current) poseRef.current = await createPose();
      engineRef.current = new GestureEngine(cfg);
      calibRef.current = new Calibrator(cfg.calibFrames);
      baselineRef.current = null;

      startCountdown();
      loop();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  function startCountdown() {
    countdownEndRef.current = performance.now() / 1000 + cfg.countdownSecs;
    setPhase("countdown");
  }

  function recalibrate() {
    engineRef.current = new GestureEngine(cfg);
    calibRef.current = new Calibrator(cfg.calibFrames);
    baselineRef.current = null;
    startCountdown();
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const v = videoRef.current;
    (v?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setPhase("idle");
  }

  function loop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    // Refs may not be mounted yet (canvas renders after the phase switch), so wait.
    if (!video || !canvas || !ctx || !poseRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const now = performance.now() / 1000;

    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // mirror
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      const result = poseRef.current!.detectForVideo(video, performance.now());
      // draw skeleton in mirrored space
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      drawSkeleton(ctx, result, canvas.width, canvas.height);
      ctx.restore();

      const feats = extract(result);
      // mirror hipX/shoulderX so screen matches body
      if (feats) {
        feats.hipX = 1 - feats.hipX;
        feats.shoulderX = 1 - feats.shoulderX;
      }
      const ph = phaseRef.current;

      if (ph === "countdown") {
        const left = countdownEndRef.current - now;
        setCountLeft(Math.max(0, left));
        if (left <= 0) setPhase("calibrating");
      } else if (ph === "calibrating" && feats) {
        const calib = calibRef.current!;
        calib.feed(feats);
        setCalibProgress(calib.progress);
        if (calib.done) {
          baselineRef.current = calib.result();
          setPhase("running");
        }
      } else if (ph === "running" && feats && baselineRef.current) {
        const eng = engineRef.current!;
        const actions = eng.update(feats, baselineRef.current, now);
        for (const a of actions) {
          if (!dryRef.current) window.api.sendAction(a);
          setLastAction(a);
          lastActionAtRef.current = now;
        }
        if (now - lastActionAtRef.current > 0.6) setLastAction(null);
        setRunning(eng.running);
        setSignals({ ...eng.signals });
        setSteps(eng.skip.stepCount);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => () => stop(), []);

  const playing = phase !== "idle" && phase !== "loading";

  return (
    <div className="app">
      <div className="titlebar">
        <div className="brand">
          <Logo size={18} />
          <div className="word">
            <b>Subway Movers</b>
            <span>{playing ? "Session" : "Body-Controlled"}</span>
          </div>
        </div>
        <button className="closeBtn" onClick={() => window.api.quit()}>
          ✕
        </button>
      </div>

      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      {!playing ? (
        <div className="idle">
          <div className="stickerField" aria-hidden="true">
            <span className="s s1">tap tap</span>
            <span className="s s2">run!</span>
          </div>
          <div className="content">
            <div className="heroMark">
              <Logo size={54} />
            </div>
            <h1 className="tagH1">
              <span className="tagWord w1">Subway</span>
              <span className="tagWord w2">Movers</span>
            </h1>
            <p className="tagline">
              Play the real Subway Surfers with your body. Hit Play and it
              opens the game, watches you through the webcam, and turns your
              moves into key taps.
            </p>
            <div className="form">
              <div className="row">
                <label htmlFor="target">Target</label>
                <select
                  id="target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value as Target)}
                >
                  <option value="web">Web (poki)</option>
                  <option value="bluestacks">BlueStacks</option>
                </select>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Dry-run (detect but don't send keys)
              </label>
              <button className="primary" onClick={handlePlay}>
                {phase === "loading" ? "Loading…" : "▶ Play"}
              </button>
            </div>
            <div className="keyRow">
              <span className="keyChip">◀ ▶ lean = lane</span>
              <span className="keyChip">▲ jump</span>
              <span className="keyChip">▼ duck</span>
            </div>
            {error && <div className="errorBox">{error}</div>}
          </div>
        </div>
      ) : (
        <>
          <div className="stage">
            <canvas ref={canvasRef} />

            {phase === "countdown" && (
              <>
                <div className="hint">Focus the game, then step back so your whole body is in frame</div>
                <div className="countdown">{Math.floor(countLeft) + 1}</div>
              </>
            )}

            {phase === "calibrating" && (
              <>
                <div className="hint">Calibrating, stand neutral with arms slightly out</div>
                <div className="calibBar">
                  <div style={{ width: `${Math.round(calibProgress * 100)}%` }} />
                </div>
              </>
            )}

            {phase === "running" && (
              <div className="overlayText">
                <div className={`status ${running ? "on" : "off"}`}>
                  {running ? "RUNNING" : "IDLE"}
                </div>
                <div className="signals">
                  lane {signals.lane.toFixed(2)} · jump {signals.jump.toFixed(2)} · duck{" "}
                  {signals.duck.toFixed(2)} · steps {steps}
                </div>
                {lastAction && (
                  <div className="bigAction">
                    {
                      { left: "◀ LEFT", right: "RIGHT ▶", up: "▲ JUMP", down: "▼ DUCK", restart: "↻ RESTART" }[
                        lastAction
                      ]
                    }
                  </div>
                )}
                {dryRun && <div className="dryTag">DRY-RUN</div>}
              </div>
            )}
          </div>

          <div className="controls">
            <button className="small" onClick={recalibrate}>
              Recalibrate
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              Dry-run
            </label>
            <button className="small" onClick={stop} style={{ marginLeft: "auto" }}>
              Stop
            </button>
          </div>
        </>
      )}
    </div>
  );
}
