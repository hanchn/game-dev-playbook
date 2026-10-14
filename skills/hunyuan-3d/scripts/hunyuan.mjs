#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const BASE = "https://3d.hunyuan.tencent.com";
export function unwrapApiResponse(result) {
  // The site's successful genUploadInfo response includes error.code = "0".
  // Presence of the error envelope alone does not mean failure.
  if (
    (result.error && String(result.error.code) !== "0") ||
    (result.code != null && String(result.code) !== "0")
  ) {
    throw Error("Business API rejected request; inspect authenticated site");
  }
  return result.data ?? result;
}
export const TAGS = {
  front: "frontView",
  rear: "rearView",
  left: "leftView",
  right: "rightView",
  front_left_45: "frontLeftView",
  front_right_45: "frontRightView",
  bottom: "bottomView",
  top: "topView",
};
export function signature(
  params = {},
  timestamp = Math.floor(Date.now() / 1000),
  nonce = Array.from(
    crypto.randomBytes(16),
    (b) =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[b % 62],
  ).join(""),
) {
  const c = [
      122, 59, 92, 165, 30, 79, 166, 139, 142, 129, 139, 89, 219, 131, 101, 204,
    ],
    d = [122, 59, 92, 45, 30, 79, 106, 139, 156, 13, 46, 63, 74, 91, 108, 125],
    u = [3, 5, 2, 7, 1, 4, 6, 2, 5, 3, 1, 4, 2, 6, 3, 5],
    m = [14, 11, 13, 9, 15, 10, 12, 8, 6, 3, 5, 1, 7, 2, 4, 0];
  const rotated = c.map((v, i) => {
    let b = v ^ d[i];
    return ((b << u[i]) | (b >>> (8 - u[i]))) & 255;
  });
  let b = Buffer.from(m.map((i) => rotated[i]));
  let zero = b.indexOf(0);
  if (zero >= 0) b = b.subarray(0, zero);
  const q = { ...params, timestamp, nonce };
  const canonical = Object.entries(q)
    .filter(([, v]) => v != null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join("&");
  return {
    ...q,
    sign: crypto
      .createHmac("sha256", new TextDecoder().decode(b))
      .update(canonical)
      .digest("hex"),
  };
}
export function sanitize(v) {
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v)
        .filter(
          ([k]) => !/(cookie|secret|token|authorization|sign|header)/i.test(k),
        )
        .map(([k, x]) => [k, sanitize(x)]),
    );
  if (typeof v === "string" && /^https?:/.test(v)) {
    try {
      const u = new URL(v);
      u.search = "";
      u.hash = "";
      return u.href;
    } catch {}
  }
  return v;
}
function write(file, value, privateFile = false) {
  fs.mkdirSync(path.dirname(file), {
    recursive: true,
    mode: privateFile ? 0o700 : 0o755,
  });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", {
    mode: privateFile ? 0o600 : 0o644,
  });
  fs.renameSync(tmp, file);
  if (privateFile) fs.chmodSync(file, 0o600);
}
function read(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
export function validateDownload(bytes, format) {
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (zip) {
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
      if (bytes.readUInt32LE(i) === 0x06054b50) {
        end = i;
        break;
      }
    if (end < 0) throw Error("Invalid ZIP: no central directory");
    let offset = bytes.readUInt32LE(end + 16),
      names = [];
    const count = bytes.readUInt16LE(end + 10);
    for (let i = 0; i < count; i++) {
      if (
        offset + 46 > bytes.length ||
        bytes.readUInt32LE(offset) !== 0x02014b50
      )
        throw Error("Invalid ZIP directory");
      const length = bytes.readUInt16LE(offset + 28),
        extra = bytes.readUInt16LE(offset + 30),
        comment = bytes.readUInt16LE(offset + 32);
      names.push(
        bytes.subarray(offset + 46, offset + 46 + length).toString("utf8"),
      );
      offset += 46 + length + extra + comment;
    }
    if (!names.some((n) => n.toLowerCase().endsWith("." + format)))
      throw Error("ZIP lacks requested model format");
    return { container: "zip", members: names };
  }
  const head = bytes.subarray(0, 8192).toString("utf8");
  if (/^\s*</.test(head) || /<!doctype html/i.test(head))
    throw Error("Download is HTML/XML, not a model");
  if (
    format === "fbx" &&
    !bytes
      .subarray(0, 23)
      .toString("binary")
      .startsWith("Kaydara FBX Binary  \0") &&
    !/FBXHeaderExtension\s*:/.test(head)
  )
    throw Error("Invalid FBX signature");
  if (format === "glb" && bytes.subarray(0, 4).toString() !== "glTF")
    throw Error("Invalid GLB signature");
  return { container: "raw" };
}
export function conversionSource(asset) {
  if (asset.boneBindingData?.fbx)
    return { format: "fbx", url: asset.boneBindingData.fbx };
  if (asset.urlResult?.obj) return { format: "zip", url: asset.urlResult.obj };
  if (asset.urlResult?.glb) return { format: "glb", url: asset.urlResult.glb };
  throw Error("No supported conversion source in remote asset");
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith("--")) throw Error("Use named --options");
    opts[args[i].slice(2)] =
      args[i + 1]?.startsWith("--") || !args[i + 1] ? true : args[++i];
  }
  if (!command || command === "help") {
    console.log(
      "hunyuan.mjs create|upload|submit|status|download|quota|import-session --root PROJECT --vehicle V01 [--session FILE] [--har FILE] [--format fbx] [--face-count 1500000]",
    );
    return;
  }
  const root = path.resolve(opts.root || process.cwd());
  const sessionFile = path.resolve(
    opts.session || path.join(os.homedir(), ".codex/hunyuan-3d/session.json"),
  );
  if (sessionFile === root || sessionFile.startsWith(root + path.sep))
    throw Error("Session must be outside project");
  if (command === "import-session") {
    if (!opts.har) throw Error("--har required");
    const har = read(opts.har);
    const headers = {};
    for (const entry of har.log?.entries || []) {
      let u;
      try {
        u = new URL(entry.request.url);
      } catch {
        continue;
      }
      if (u.origin !== BASE || !u.pathname.startsWith("/api/3d/")) continue;
      for (const h of entry.request.headers || []) {
        const n = h.name.toLowerCase();
        if (
          n === "cookie" ||
          n === "authorization" ||
          n.startsWith("x-") ||
          n === "x_hunyuan_inner_user_id"
        )
          headers[n] = h.value;
      }
      if (!headers.cookie && entry.request.cookies?.length)
        headers.cookie = entry.request.cookies
          .map((c) => `${c.name}=${c.value}`)
          .join("; ");
    }
    if (!headers.cookie && !headers.authorization)
      throw Error("HAR has no authenticated same-origin business request");
    write(sessionFile, { headers, importedAt: new Date().toISOString() }, true);
    console.log(JSON.stringify({ sessionImported: true }));
    return;
  }
  const privateDir = path.join(
    path.dirname(sessionFile),
    "tasks",
    crypto.createHash("sha256").update(root).digest("hex").slice(0, 16),
  );
  const vehicle = opts.vehicle;
  if (command !== "quota" && !/^V\d{2}$/.test(vehicle || ""))
    throw Error("--vehicle Vxx required");
  const stateFile = path.join(
      root,
      "assets/models",
      vehicle || "quota",
      "state.json",
    ),
    privateFile = path.join(privateDir, (vehicle || "quota") + ".json");
  const save = (state, priv) => {
    write(stateFile, sanitize(state));
    if (priv) write(privateFile, priv, true);
  };
  if (command === "create") {
    if (fs.existsSync(stateFile))
      throw Error("Task state already exists; do not overwrite");
    const catalog = read(path.join(root, "docs/vehicle-catalog.json"));
    const v = catalog.vehicles.find((v) => v.id === vehicle);
    if (!v) throw Error("Vehicle missing in catalog");
    if (
      v.views.length !== 8 ||
      new Set(v.views.map((x) => x.key)).size !== 8 ||
      v.views.some((x) => !TAGS[x.key])
    )
      throw Error("Eight unique views required");
    const views = v.views.map((x) => {
      const p = path.resolve(root, x.file);
      if (!p.startsWith(root + path.sep)) throw Error("Image outside project");
      const b = fs.readFileSync(p);
      if (
        !b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        throw Error("Expected PNG");
      return {
        key: x.key,
        path: x.file,
        sha256: crypto.createHash("sha256").update(b).digest("hex"),
      };
    });
    if (new Set(views.map((x) => x.sha256)).size !== 8)
      throw Error("Duplicate image bytes");
    save({
      vehicle,
      name: v.name,
      status: "local_draft",
      remoteSubmitted: false,
      views,
      faceCount: Number(opts["face-count"] || 1500000),
      modelType: "multiView2ModelV3.1",
    });
    console.log(
      JSON.stringify({
        vehicle,
        status: "local_draft",
        remoteSubmitted: false,
      }),
    );
    return;
  }
  const session = read(sessionFile);
  if ((fs.statSync(sessionFile).mode & 0o077) !== 0)
    throw Error("Session permissions must be 0600");
  async function api(endpoint, body, sign = false) {
    const u = new URL(endpoint, BASE);
    if (sign)
      for (const [k, v] of Object.entries(signature()))
        u.searchParams.set(k, v);
    const response = await fetch(u, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-source": "web",
        "x-product": "hunyuan3d",
        Origin: BASE,
        Referer: BASE + "/creation",
        ...session.headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw Error(`Business API HTTP ${response.status}`);
    const result = await response.json();
    return unwrapApiResponse(result);
  }
  if (command === "quota") {
    const data = await api("/api/3d/planCreditInfo");
    console.log(JSON.stringify(sanitize(data)));
    return;
  }
  const lockFile = path.join(privateDir, vehicle + ".lock");
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  try {
    fs.closeSync(fs.openSync(lockFile, "wx", 0o600));
  } catch {
    throw Error(
      "Vehicle command already running; inspect stale private lock before retry",
    );
  }
  process.on("exit", () => {
    try {
      fs.unlinkSync(lockFile);
    } catch {}
  });
  const state = read(stateFile);
  let priv = fs.existsSync(privateFile) ? read(privateFile) : {};
  if (command === "upload") {
    if (state.remoteSubmitted || state.status === "submission_uncertain")
      throw Error("Task already submitted or uncertain");
    const require = createRequire(
      path.join(os.homedir(), ".codex/hunyuan-3d-runtime/package.json"),
    );
    const COS = require("cos-nodejs-sdk-v5");
    priv.uploads ||= {};
    for (const view of state.views) {
      const file = path.resolve(root, view.path),
        bytes = fs.readFileSync(file);
      if (
        crypto.createHash("sha256").update(bytes).digest("hex") !== view.sha256
      )
        throw Error("Image changed after create");
      if (priv.uploads[view.key]?.sha256 === view.sha256) continue;
      const info = await api("/api/3d/resource/genUploadInfo", {
        fileName: path.basename(file),
      });
      const cos = new COS({
        UseAccelerate: true,
        Protocol: "https:",
        getAuthorization: (_, cb) =>
          cb({
            TmpSecretId: info.encryptTmpSecretId,
            TmpSecretKey: info.encryptTmpSecretKey,
            SecurityToken: info.encryptToken,
            StartTime: info.startTime,
            ExpiredTime: info.expiredTime,
            ScopeLimit: true,
          }),
      });
      await new Promise((resolve, reject) =>
        cos.putObject(
          {
            Bucket: info.bucketName,
            Region: info.region,
            Key: info.location,
            Body: bytes,
          },
          (err, data) =>
            err ? reject(Error("COS upload failed")) : resolve(data),
        ),
      );
      const review = await api("/api/3d/resource/review", {
        sceneType: "playGround3D-2.0",
        text: "",
        resourceType: "image",
        resourceUrl: info.resourceUrl,
      });
      if (review.code !== 0) throw Error("Image review rejected");
      priv.uploads[view.key] = { url: info.resourceUrl, sha256: view.sha256 };
      state.uploadedViews = Object.keys(priv.uploads);
      save(state, priv);
    }
    state.status = "uploaded";
    save(state, priv);
    console.log(
      JSON.stringify({
        vehicle,
        status: state.status,
        uploadedViews: state.uploadedViews,
      }),
    );
    return;
  }
  if (command === "submit") {
    if (
      state.remoteSubmitted ||
      state.creationsId ||
      state.status === "submission_uncertain"
    )
      throw Error("Refusing duplicate/uncertain submission");
    if (
      state.status !== "uploaded" ||
      state.views.some((v) => !priv.uploads?.[v.key])
    )
      throw Error("Upload all eight views first");
    if (![1500000, 1000000, 500000, 50000].includes(state.faceCount))
      throw Error("Unsupported faceCount");
    const body = {
      sceneType: "playGround3D-2.0",
      count: 1,
      modelType: state.modelType,
      title: "",
      style: "",
      imageList: state.views.map((v) => priv.uploads[v.key].url),
      imageTagList: state.views.map((v) => TAGS[v.key]),
      enableLowPoly: false,
      faceCount: state.faceCount,
    };
    state.status = "submission_uncertain";
    state.submitAttemptAt = new Date().toISOString();
    save(state, priv);
    const data = await api("/api/3d/creations/generations", body, true);
    if (!data.creationsId)
      throw Error("No creationsId returned; reconcile before submitting again");
    state.creationsId = data.creationsId;
    state.remoteSubmitted = true;
    state.status = "submitted";
    save(state, priv);
    console.log(
      JSON.stringify({
        vehicle,
        creationsId: state.creationsId,
        status: state.status,
      }),
    );
    return;
  }
  if (!state.creationsId) throw Error("No remote creationsId");
  const detail = await api(
    "/api/3d/creations/detail?creationsId=" +
      encodeURIComponent(state.creationsId),
  );
  priv.detail = detail;
  state.remote = sanitize(detail);
  state.status = detail.status || "remote_status_unknown";
  save(state, priv);
  if (command === "status") {
    console.log(
      JSON.stringify({
        vehicle,
        creationsId: state.creationsId,
        status: state.status,
        remote: state.remote,
      }),
    );
    return;
  }
  if (command === "download") {
    const format = String(opts.format || "fbx").toLowerCase();
    if (!["fbx", "glb", "obj", "stl", "usdz"].includes(format))
      throw Error("Unsupported format");
    const assets = detail.result || detail.creations?.[0]?.result || [];
    const successful = assets.filter((a) => a.status === "success");
    if (!successful.length) throw Error("No successful remote assets");
    state.downloads ||= [];
    for (const asset of successful) {
      let url = asset.boneBindingData?.[format] || asset.urlResult?.[format],
        converted = false;
      if (
        !url &&
        priv.conversions?.[String(asset.assetId || "model") + ":" + format]
          ?.status === "complete"
      ) {
        url =
          priv.conversions[String(asset.assetId || "model") + ":" + format].url;
        converted = true;
      }
      if (!url) {
        const source = conversionSource(asset);
        priv.conversions ||= {};
        const conversionKey = String(asset.assetId || "model") + ":" + format;
        if (priv.conversions[conversionKey]?.status === "uncertain")
          throw Error(
            "Previous conversion outcome uncertain; reconcile before retry",
          );
        priv.conversions[conversionKey] = {
          status: "uncertain",
          attemptAt: new Date().toISOString(),
        };
        save(state, priv);
        const result = await api("/api/3d/creations/resourceConvert", {
          sourceResource: [source],
          targetFormatList: [format],
        });
        url = result.convertResult?.[0]?.url;
        if (url) {
          priv.conversions[conversionKey] = { status: "complete", url };
          save(state, priv);
        }
        converted = true;
      }
      if (!url) throw Error("Conversion returned no URL");
      const u = new URL(url);
      if (u.protocol !== "https:") throw Error("Download URL must be HTTPS");
      const res = await fetch(u, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw Error(`Download HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (!bytes.length) throw Error("Empty model download");
      const validation = validateDownload(bytes, format);
      const zip = validation.container === "zip";
      const id = String(asset.assetId || "model").replace(
        /[^a-zA-Z0-9_-]/g,
        "_",
      );
      const relative = `assets/models/${vehicle}/${id}.${format}${zip ? ".zip" : ""}`;
      fs.writeFileSync(path.join(root, relative), bytes);
      state.downloads.push({
        assetId: asset.assetId,
        format,
        path: relative,
        bytes: bytes.length,
        sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        converted,
        ...validation,
      });
      save(state, priv);
    }
    console.log(JSON.stringify({ vehicle, downloads: state.downloads }));
    return;
  }
  throw Error("Unknown command");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(
      JSON.stringify({
        error:
          error.message?.replace(/https?:\/\/\S+/g, "[redacted URL]") ||
          "Command failed",
      }),
    );
    process.exitCode = 1;
  });
