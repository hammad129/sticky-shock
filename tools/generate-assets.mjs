// DreamLayer visual pass for Sticky — The Quiet Stage.
// One credit per finished image. Skips files that already exist.
//
//   export DREAMLAYER_API_KEY="dlr_live_..."
//   node tools/generate-assets.mjs

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "assets");
const key = process.env.DREAMLAYER_API_KEY;
const API = "https://api.dreamlayer.io";

const STYLE =
  "Theatrical illustration, warm tungsten spotlight, deep burgundy stage curtains, worn honey wood, dusty air. A lanky stick-figure performer: round pale head, two dot eyes, thin black limbs, a small red shock collar, a tiny white bow tie. No letters, no words, no watermark, no logo.";

const jobs = [
  {
    file: "poster.png",
    body: {
      operation: "text_to_image",
      aspect_ratio: "1:1",
      max_credits: 1,
      prompt:
        STYLE +
        " Full-body side view, standing still at center stage in a pool of light. Empty wooden boards, dark audience beyond the light, burgundy curtains framing the shot. Quiet, slightly ominous, poster-like."
    }
  },
  {
    file: "backdrop.png",
    body: {
      operation: "text_to_image",
      aspect_ratio: "1:1",
      max_credits: 1,
      prompt:
        "A painted theater backdrop on canvas: a huge pale moon over a quiet black city skyline, faded pigment, visible canvas weave, warm dust in front of the paint. No people, no letters, no watermark."
    }
  },
  {
    file: "portrait.png",
    body: {
      operation: "text_to_image",
      aspect_ratio: "1:1",
      max_credits: 1,
      prompt:
        STYLE +
        " Close-up of the same performer's round head and red shock collar, facing slightly left, calm dot eyes, plain near-black background, as a broadcast camera shot."
    }
  }
];

if (!key) {
  console.error("Set DREAMLAYER_API_KEY first. A new account has no credits until the jam form is approved.");
  process.exit(1);
}

fs.mkdirSync(assets, { recursive: true });

const balanceRes = await fetch(API + "/v1/balance", {
  headers: { Authorization: "Bearer " + key, "DreamLayer-Version": "1" }
});
if (!balanceRes.ok) {
  console.error("Balance check failed", balanceRes.status, await balanceRes.text());
  process.exit(1);
}
const balance = await balanceRes.json();
console.log("Credits available:", balance.available ?? balance);

async function readSSE(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let download = null;
  let status = null;
  let question = null;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const event = (block.match(/^event:\s*(\S+)/m) || [])[1];
      const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(5).trim());
      if (event === "asset" && data.download_url) download = data.download_url;
      if (event === "question") question = data;
      if (event === "done") status = data.status || data;
      if (status || question) {
        try { await reader.cancel(); } catch (e) {}
        return { download, status, question };
      }
    }
  }
  return { download, status, question };
}

async function execute(body, idem) {
  const res = await fetch(API + "/v1/execute", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "DreamLayer-Version": "1",
      "Idempotency-Key": idem,
      Accept: "text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("execute " + res.status + " " + (await res.text()));
  const result = await readSSE(res);
  if (result.question) throw new Error("DreamLayer asked a question: " + JSON.stringify(result.question));
  if (result.status !== "completed" || !result.download) {
    throw new Error("Job did not complete: " + JSON.stringify(result.status));
  }
  return result.download;
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + key },
    redirect: "manual"
  });
  if (res.status >= 300 && res.status < 400) {
    const next = res.headers.get("location");
    const file = await fetch(next);
    if (!file.ok) throw new Error("storage download " + file.status);
    fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
    return;
  }
  if (!res.ok) throw new Error("download " + res.status);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

for (const job of jobs) {
  const dest = path.join(assets, job.file);
  if (fs.existsSync(dest)) {
    console.log("keep", job.file);
    continue;
  }
  console.log("generate", job.file);
  const idem = "sticky-" + job.file + "-" + crypto.createHash("sha256").update(JSON.stringify(job.body)).digest("hex").slice(0, 16);
  const url = await execute(job.body, idem);
  await download(url, dest);
  console.log("saved", dest);
}

const portrait = path.join(assets, "portrait.png");
const shocked = path.join(assets, "portrait-zap.png");
if (!fs.existsSync(shocked)) {
  if (!fs.existsSync(portrait)) {
    console.error("portrait.png missing, skipped the shocked face");
    process.exit(1);
  }
  console.log("upload portrait");
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(portrait)]), "portrait.png");
  const up = await fetch(API + "/v1/input-assets", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "DreamLayer-Version": "1" },
    body: form
  });
  if (!up.ok) throw new Error("upload " + up.status + " " + (await up.text()));
  const uploaded = await up.json();
  console.log("generate portrait-zap.png");
  const zapBody = {
    operation: "image_to_image",
    input_asset_id: uploaded.input_asset_id,
    aspect_ratio: "1:1",
    max_credits: 1,
    prompt:
      "Keep this exact stick-figure performer, red shock collar, and white bow tie. Same close-up. Change only the expression: X-shaped eyes, a flinch, and a few pale blue electric sparks on the collar. Plain dark background. No letters, no watermark."
  };
  const url = await execute(
    zapBody,
    "sticky-portrait-zap-" + crypto.createHash("sha256").update(JSON.stringify(zapBody)).digest("hex").slice(0, 16)
  );
  await download(url, shocked);
  console.log("saved", shocked);
} else {
  console.log("keep portrait-zap.png");
}
