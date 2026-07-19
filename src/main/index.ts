import { spawn } from "child_process";
import { join } from "path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { keyboard, Key } from "@nut-tree-fork/nut-js";

const WIDTH = 380;
const HEIGHT = 520;

keyboard.config.autoDelayMs = 0;

const KEY_MAP: Record<string, Key> = {
  left: Key.Left,
  right: Key.Right,
  up: Key.Up,
  down: Key.Down,
  restart: Key.Space,
};

let win: BrowserWindow | null = null;

function createWindow(): void {
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: 24,
    y: 24,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  // Float above other apps (incl. fullscreen browser games) without stealing focus.
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

async function tapKey(action: string): Promise<void> {
  const key = KEY_MAP[action];
  if (key === undefined) return;
  await keyboard.pressKey(key);
  await keyboard.releaseKey(key);
}

function launchGame(payload: { target: "web" | "bluestacks"; url: string }): void {
  if (payload.target === "web") {
    shell.openExternal(payload.url);
    return;
  }
  // BlueStacks: best-effort launch per platform.
  if (process.platform === "darwin") {
    spawn("open", ["-a", "BlueStacks"], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", "BlueStacks"], { detached: true, stdio: "ignore" }).unref();
  }
}

app.whenReady().then(() => {
  ipcMain.handle("action", (_e, action: string) => tapKey(action));
  ipcMain.handle("launch-game", (_e, payload) => launchGame(payload));
  ipcMain.handle("quit", () => app.quit());
  ipcMain.handle("set-size", (_e, { w, h }: { w: number; h: number }) => {
    win?.setSize(Math.round(w), Math.round(h));
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
