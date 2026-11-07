import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const BRAVE_PATH = "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const OUT_DIR = "/Users/aniketbatham/.gemini/antigravity/brain/52dcfc6f-96a6-4768-981f-f91ea0ce84c4/screenshots";

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve) => {
      this.ws.onopen = () => resolve();
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function main() {
  console.log("=== Launching Brave Browser in headless mode ===");
  const browserProc = spawn(BRAVE_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1440,900",
    "http://localhost:3001",
  ]);

  let connected = false;
  let targets = [];

  for (let i = 0; i < 30; i++) {
    try {
      targets = await getJson("http://127.0.0.1:9222/json/list");
      if (targets && targets.length > 0) {
        connected = true;
        break;
      }
    } catch {
      await sleep(300);
    }
  }

  if (!connected || !targets[0]?.webSocketDebuggerUrl) {
    console.error("Failed to connect to Brave Browser CDP.");
    browserProc.kill();
    process.exit(1);
  }

  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  console.log(`Connected to page target: ${pageTarget.url}`);

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.ready();

  await client.send("Page.enable");
  await client.send("Runtime.enable");

  // Set desktop viewport
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  console.log("Waiting for page load and hydration...");
  await sleep(1500);

  // Set visited key so FirstVisitModal doesn't cover the canvas
  await client.send("Runtime.evaluate", {
    expression: `localStorage.setItem('xmile_has_visited', 'true'); location.reload();`,
  });
  await sleep(2000);

  const progressPoints = [
    0.0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.8, 0.88, 0.94, 1.0,
  ];

  console.log("\n=== Capturing Desktop Scroll-Story Progress Screenshots ===");
  for (const p of progressPoints) {
    const percent = Math.round(p * 100);
    // Scroll window
    await client.send("Runtime.evaluate", {
      expression: `window.scrollTo({ top: (document.documentElement.scrollHeight - window.innerHeight) * ${p}, behavior: 'instant' });`,
    });

    // Allow canvas rendering loop to interpolate
    await sleep(400);

    const { data } = await client.send("Page.captureScreenshot", {
      format: "png",
    });

    const filename = `desktop_progress_${String(percent).padStart(3, "0")}pct.png`;
    const filepath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(data, "base64"));
    console.log(`✓ Saved: ${filename} (${(data.length / 1024).toFixed(1)} KB base64)`);
  }

  console.log("\n=== Capturing Mobile Viewport Screenshots ===");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  // Mobile 0%
  await client.send("Runtime.evaluate", {
    expression: `window.scrollTo({ top: 0, behavior: 'instant' });`,
  });
  await sleep(1000);
  const mob0 = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT_DIR, "mobile_opening_000pct.png"), Buffer.from(mob0.data, "base64"));
  console.log("✓ Saved: mobile_opening_000pct.png");

  // Mobile 100%
  await client.send("Runtime.evaluate", {
    expression: `window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });`,
  });
  await sleep(400);
  const mob100 = await client.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT_DIR, "mobile_final_100pct.png"), Buffer.from(mob100.data, "base64"));
  console.log("✓ Saved: mobile_final_100pct.png");

  console.log("\nAll requested screenshots captured successfully in:", OUT_DIR);

  browserProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
