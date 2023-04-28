const { app, BrowserWindow, ipcMain } = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const { spawn, execFile } = require("child_process");
const axios = require("axios");

let mainWindow = null;
let pythonProcess = null;

// Python server parameters
const PY_HOST = "127.0.0.1";
const PY_PORT = 7377;
const PY_LOG_LEVEL = "info";

// Generate a random a SECRET_TOKEN used for communication with Python server
function generateHexString(length) {
  return [...Array(length)]
    .map((i) => (~~(Math.random() * 36)).toString(36))
    .join("");
}
const SECRET_TOKEN_LENGTH = 64;
const SECRET_TOKEN = generateHexString(SECRET_TOKEN_LENGTH);

// Conditionally include the dev tools installer to load React Dev Tools
let installExtension, REACT_DEVELOPER_TOOLS;

if (isDev) {
  const devTools = require("electron-devtools-installer");
  installExtension = devTools.default;
  REACT_DEVELOPER_TOOLS = devTools.REACT_DEVELOPER_TOOLS;
}

function launchPython() {
  if (isDev) {
    pythonProcess = spawn("python", [
      "./text2sql-backend/main",
      "--host",
      PY_HOST,
      "--port",
      PY_PORT,
      "--log-level",
      PY_LOG_LEVEL,
      "--secret",
      SECRET_TOKEN,
      "--reload",
    ]);
    console.log("Python process started in dev mode");
  } else {
    pythonProcess = execFile(
      path.join(__dirname, "../../../py_dist/main/main"),
      [
        "--host",
        PY_HOST,
        "--port",
        PY_PORT,
        "--log-level",
        PY_LOG_LEVEL,
        "--secret",
        SECRET_TOKEN,
      ]
    );
    console.log("Python process started in built mode");
  }
  return pythonProcess;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load from localhost if in development
  // Otherwise load index.html file
  if (isDev) {
    mainWindow.loadURL("http://localhost:5001");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../build/index.html"));
  }

  return mainWindow;
}

// Create a new browser window by invoking the createWindow
// function once the Electron application is initialized.
// Install REACT_DEVELOPER_TOOLS as well if isDev
app.whenReady().then(() => {
  if (isDev) {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((error) => console.log(`An error occurred: , ${error}`));
  }
  pythonProcess = launchPython();
  mainWindow = createWindow();
});

// Add a new listener that tries to quit the application when
// it no longer has any open windows. This listener is a no-op
// on macOS due to the operating system's window management behavior.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Add a new listener that creates a new browser window only if
// when the application has no visible windows after being activated.
// For example, after launching the application for the first time,
// or re-launching the already running application.
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// The code above has been adapted from a starter example in the Electron docs:
// https://www.electronjs.org/docs/tutorial/quick-start#create-the-main-script-file

ipcMain.handle("roll-dice", async (event, data) => {
  try {
    const resp = await axios.get(
      "http://localhost:7377/",
      {}, // No data
      {
        headers: { "secret-token": SECRET_TOKEN },
      }
    );
    return resp.data;
  } catch (err) {
    console.error(err);
    return;
  }
});
