import { contextBridge, ipcRenderer } from "electron";

const api = {
  sendAction: (action: string): Promise<void> => ipcRenderer.invoke("action", action),
  launchGame: (payload: { target: "web" | "bluestacks"; url: string }): Promise<void> =>
    ipcRenderer.invoke("launch-game", payload),
  quit: (): Promise<void> => ipcRenderer.invoke("quit"),
  setSize: (w: number, h: number): Promise<void> => ipcRenderer.invoke("set-size", { w, h }),
};

contextBridge.exposeInMainWorld("api", api);

export type Api = typeof api;
