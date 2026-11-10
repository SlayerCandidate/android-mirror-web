import { Adb, type AdbTransport, type AdbSocket } from "@yume-chan/adb";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { AdbWebCryptoCredentialManager, IndexedDb } from "@yume-chan/adb-credential-web";
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import { DefaultServerPath } from "@yume-chan/scrcpy";

const STORAGE_NAME = "android-mirror-web-keys";

export async function connectAndroidDevice() {
  if (!navigator.usb) {
    throw new Error("WebUSB is not supported in this browser.");
  }

  const manager = AdbDaemonWebUsbDeviceManager.BROWSER ?? new AdbDaemonWebUsbDeviceManager(navigator.usb);
  const device = await manager.requestDevice();
  if (!device) {
    throw new Error("No device selected.");
  }

  const connection = await device.connect();
  const storage = await IndexedDb.createStorage(STORAGE_NAME);
  const credentialManager = new AdbWebCryptoCredentialManager(storage, "android-mirror-web");

  const authTransport = await import("@yume-chan/adb").then(async ({ adbDaemonAuthenticate }) =>
    adbDaemonAuthenticate({
      serial: device.serial,
      connection,
      credentialManager,
    })
  );

  const adb = new Adb(authTransport);
  return { adb, device, credentialManager };
}

export async function startScrcpy(adb: Adb, options = {}) {
  const client = await AdbScrcpyClient.start(
    adb,
    DefaultServerPath,
    new AdbScrcpyOptionsLatest({
      video: true,
      audio: false,
      control: true,
      fullscreen: false,
      ...options,
    })
  );

  const video = await client.videoStream;
  return { client, video };
}

export async function fetchScrcpyServer(adb: Adb) {
  const jarUrl = "https://github.com/Genymobile/scrcpy/releases/latest/download/scrcpy-server-v2.7.jar";
  const response = await fetch(jarUrl);
  if (!response.ok) {
    throw new Error(`Failed to download scrcpy server: ${response.status}`);
  }

  const file = response.body;
  if (!file) {
    throw new Error("Response body is empty.");
  }

  await adb.sync.write({
    path: DefaultServerPath,
    readable: file,
  });
}

export function attachControlEvents(canvas: HTMLCanvasElement, client: AdbScrcpyClient<any>) {
  if (!client.controller) {
    return;
  }

  const writer = client.controller;
  const rect = canvas.getBoundingClientRect();

  const sendPointer = (type: "down" | "up" | "move", x: number, y: number) => {
    const px = (x / rect.width) * canvas.width;
    const py = (y / rect.height) * canvas.height;
    writer.injectTouch(type, [
      {
        id: 0,
        x: Math.round(px),
        y: Math.round(py),
        pressure: type === "up" ? 0 : 1,
      },
    ]);
  };

  canvas.addEventListener("pointerdown", (event) => {
    sendPointer("down", event.clientX - rect.left, event.clientY - rect.top);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (event.pressure > 0) {
      sendPointer("move", event.clientX - rect.left, event.clientY - rect.top);
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    sendPointer("up", event.clientX - rect.left, event.clientY - rect.top);
  });

  canvas.addEventListener("pointerleave", (event) => {
    sendPointer("up", event.clientX - rect.left, event.clientY - rect.top);
  });
}
