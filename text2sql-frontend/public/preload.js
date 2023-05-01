const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  rollDice: async () => {
    return await ipcRenderer.invoke("roll-dice");
  },
});
