import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __webroot = path.join(__dirname, "./built-web-app");

console.log("Hello, world!");
console.log(__filename);
console.log(__dirname);
console.log(__webroot);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // if (process.env.NODE_ENV === "development") {
  //   // Optionally run Vite dev server and load URL
  //   win.loadURL("http://localhost:3000");
  //   win.webContents.openDevTools();
  // } else {
  //   win.loadFile(path.join(__dirname, "../dist/index.html"));
  // }

  win.webContents.openDevTools();
  win.loadFile(path.join(__webroot, "index.html"));

  // Serial permission handler
  win.webContents.session.on(
    "select-serial-port",
    (event, portList, webContents, callback) => {
      console.log("portList", portList);
      event.preventDefault();
      const selectedPort = portList[portList.length - 1];
      console.log("selectedPort", selectedPort);
      if (!selectedPort) {
        callback("");
      } else {
        callback(selectedPort.portId);
      }
    },
  );

  // // Bluetooth selection event
  // win.webContents.on(
  //   "select-bluetooth-device",
  //   (event, deviceList, callback) => {
  //     event.preventDefault();
  //     // Example: pick first device, or show your own UI
  //     if (deviceList.length > 0) {
  //       callback(deviceList[0].deviceId);
  //     } else {
  //       callback(""); // cancel
  //     }
  //   },
  // );
}

app.whenReady().then(() => {
  app.commandLine.appendSwitch("enable-web-bluetooth");
  app.commandLine.appendSwitch("enable-experimental-web-platform-features");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
