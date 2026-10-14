import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  signature,
  sanitize,
  conversionSource,
  validateDownload,
  TAGS,
  unwrapApiResponse,
} from "../scripts/hunyuan.mjs";
const cli = fileURLToPath(new URL("../scripts/hunyuan.mjs", import.meta.url));
test("observed successful error envelope accepts string zero and rejects auth failure", () => {
  const success = {error: {code: "0", message: ""}, bucketName: "TEST_BUCKET", region: "ap-guangzhou"};
  assert.equal(unwrapApiResponse(success), success);
  assert.deepEqual(unwrapApiResponse({error: {code: 0}, data: {creationsId: "TEST_TASK"}}), {creationsId: "TEST_TASK"});
  assert.throws(() => unwrapApiResponse({error: {code: "999", message: "web cookie user is empty"}}), /rejected/);
  assert.throws(() => unwrapApiResponse({code: "1"}), /rejected/);
});
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "hunyuan-offline-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, "project"),
    session = path.join(base, "private/session.json");
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.dirname(session));
  fs.writeFileSync(
    session,
    JSON.stringify({ headers: { cookie: "TEST_ONLY_SECRET" } }),
    { mode: 0o600 },
  );
  const views = Object.keys(TAGS).map((key, i) => {
    const file = key + ".png";
    fs.writeFileSync(
      path.join(root, file),
      Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.from([i]),
      ]),
    );
    return { key, file };
  });
  fs.writeFileSync(
    path.join(root, "docs/vehicle-catalog.json"),
    JSON.stringify({ vehicles: [{ id: "V01", name: "Test", views }] }),
  );
  const stateFile = path.join(root, "assets/models/V01/state.json");
  const privateFile = path.join(
    path.dirname(session),
    "tasks",
    crypto.createHash("sha256").update(root).digest("hex").slice(0, 16),
    "V01.json",
  );
  const mock = path.join(base, "mock.mjs"),
    calls = path.join(base, "calls.ndjson");
  fs.writeFileSync(
    mock,
    `import fs from 'node:fs';globalThis.fetch=async(url,options)=>{fs.appendFileSync(process.env.TEST_CALLS,JSON.stringify({url:String(url),method:options?.method,body:options?.body})+'\\n');if(String(url).includes('/detail?'))return {ok:true,json:async()=>({status:'success',result:[{assetId:'a1',status:'success',urlResult:{glb:'https://model.example/source.glb'}}]})};throw new Error('simulated network loss https://example.com/?token=TEST_ONLY_SECRET');};`,
  );
  function run(command, extra = []) {
    return spawnSync(
      process.execPath,
      [
        "--import",
        mock,
        cli,
        command,
        "--root",
        root,
        "--session",
        session,
        "--vehicle",
        "V01",
        ...extra,
      ],
      { encoding: "utf8", env: { ...process.env, TEST_CALLS: calls } },
    );
  }
  function writePrivate(data) {
    fs.mkdirSync(path.dirname(privateFile), { recursive: true });
    fs.writeFileSync(privateFile, JSON.stringify(data), { mode: 0o600 });
  }
  return {
    root,
    session,
    views,
    stateFile,
    privateFile,
    calls,
    run,
    writePrivate,
    base,
  };
}
test("signature matches observed public module 47436 fixed-vector", () => {
  // Evaluated original module from index__0ae1922cd34342abbea4.js with Date.now=1720000000000 and Math.random=0.
  // Source SHA256 6b5ab27287b14e188d671788ba25fcde37f781551f284093becdd3f0855198c9; see references/api-contract.md.
  assert.equal(
    signature({}, 1720000000, "AAAAAAAAAAAAAAAA").sign,
    "de80ef9d030de27a3e00ffc8b55f42ddf47de85f4815cfbb4085e6cf14b736ce",
  );
});
test("sanitization strips nested credentials and URL query/hash", () =>
  assert.deepEqual(
    sanitize({
      cookie: "secret",
      nested: {
        encryptTmpSecretKey: "secret",
        url: "https://model.example/a?sign=secret#secret",
        assetId: "id",
      },
    }),
    { nested: { url: "https://model.example/a", assetId: "id" } },
  ));
test("HAR import accepts only same-origin business requests and writes 0600", (t) => {
  const f = fixture(t),
    har = path.join(f.base, "session.har");
  const entries = [
    {
      request: {
        url: "https://evil.example/api/3d/detail",
        headers: [{ name: "Cookie", value: "EVIL_SECRET" }],
      },
    },
    {
      request: {
        url: "https://3d.hunyuan.tencent.com/api/3d/planCreditInfo",
        headers: [{ name: "Cookie", value: "VALID_SECRET" }],
      },
    },
  ];
  fs.writeFileSync(har, JSON.stringify({ log: { entries } }));
  const r = f.run("import-session", ["--har", har]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.statSync(f.session).mode & 0o777, 0o600);
  const stored = JSON.parse(fs.readFileSync(f.session));
  assert.equal(stored.headers.cookie, "VALID_SECRET");
  assert.doesNotMatch(r.stdout + r.stderr, /VALID_SECRET|EVIL_SECRET/);
  fs.writeFileSync(
    har,
    JSON.stringify({ log: { entries: entries.slice(0, 1) } }),
  );
  assert.notEqual(f.run("import-session", ["--har", har]).status, 0);
});
test("draft is local, requires eight distinct views, refuses overwrite", (t) => {
  const f = fixture(t);
  assert.equal(f.run("create").status, 0);
  const state = JSON.parse(fs.readFileSync(f.stateFile));
  assert.equal(state.remoteSubmitted, false);
  assert.equal(state.status, "local_draft");
  assert.equal(state.views.length, 8);
  assert.equal(fs.existsSync(f.calls), false);
  assert.notEqual(f.run("create").status, 0);
  fs.unlinkSync(f.stateFile);
  fs.copyFileSync(
    path.join(f.root, f.views[0].file),
    path.join(f.root, f.views[1].file),
  );
  assert.match(f.run("create").stderr, /Duplicate image bytes/);
  fs.writeFileSync(
    path.join(f.root, "docs/vehicle-catalog.json"),
    JSON.stringify({ vehicles: [{ id: "V01", views: f.views.slice(0, 7) }] }),
  );
  assert.match(f.run("create").stderr, /Eight unique views/);
});
test("uncertain submission persists before request and second attempt sends nothing", (t) => {
  const f = fixture(t);
  assert.equal(f.run("create").status, 0);
  const state = JSON.parse(fs.readFileSync(f.stateFile));
  state.status = "uploaded";
  fs.writeFileSync(f.stateFile, JSON.stringify(state));
  f.writePrivate({
    uploads: Object.fromEntries(
      state.views.map((v) => [
        v.key,
        { url: "https://model.example/" + v.key },
      ]),
    ),
  });
  const first = f.run("submit");
  assert.notEqual(first.status, 0);
  assert.doesNotMatch(first.stderr, /TEST_ONLY_SECRET/);
  assert.equal(
    JSON.parse(fs.readFileSync(f.stateFile)).status,
    "submission_uncertain",
  );
  assert.equal(fs.readFileSync(f.calls, "utf8").trim().split("\n").length, 1);
  const second = f.run("submit");
  assert.match(second.stderr, /duplicate\/uncertain/);
  assert.equal(fs.readFileSync(f.calls, "utf8").trim().split("\n").length, 1);
});
test("uncertain conversion persists and does not retry conversion request", (t) => {
  const f = fixture(t);
  assert.equal(f.run("create").status, 0);
  const state = JSON.parse(fs.readFileSync(f.stateFile));
  state.creationsId = "c1";
  state.remoteSubmitted = true;
  fs.writeFileSync(f.stateFile, JSON.stringify(state));
  assert.notEqual(f.run("download").status, 0);
  assert.equal(
    JSON.parse(fs.readFileSync(f.privateFile)).conversions["a1:fbx"].status,
    "uncertain",
  );
  assert.match(
    f.run("download").stderr,
    /Previous conversion outcome uncertain/,
  );
  const calls = fs
    .readFileSync(f.calls, "utf8")
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(
    calls.filter((x) => x.url.includes("resourceConvert")).length,
    1,
  );
  assert.equal(calls.filter((x) => x.url.includes("/detail?")).length, 2);
});
test("observed source precedence treats obj URL as zip", () => {
  assert.deepEqual(
    conversionSource({ urlResult: { obj: "obj", glb: "glb" } }),
    { format: "zip", url: "obj" },
  );
  assert.deepEqual(
    conversionSource({
      boneBindingData: { fbx: "fbx" },
      urlResult: { obj: "obj" },
    }),
    { format: "fbx", url: "fbx" },
  );
  assert.throws(() => conversionSource({}));
});
function zipFixture(name) {
  const filename = Buffer.from(name),
    local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(filename.length, 26);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50);
  directory.writeUInt16LE(filename.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(directory.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length, 16);
  return Buffer.concat([local, filename, directory, filename, end]);
}
test("FBX/ZIP format validation rejects HTML, invalid files and wrong archive format", () => {
  assert.equal(
    validateDownload(Buffer.from("Kaydara FBX Binary  \0\x1a\0"), "fbx")
      .container,
    "raw",
  );
  assert.equal(
    validateDownload(Buffer.from("; FBX 7.4\nFBXHeaderExtension: {"), "fbx")
      .container,
    "raw",
  );
  assert.throws(() =>
    validateDownload(Buffer.from("<html>unauthorized</html>"), "fbx"),
  );
  assert.throws(() => validateDownload(Buffer.from("fake fbx"), "fbx"));
  assert.throws(() => validateDownload(Buffer.from("PKbad"), "fbx"));
  assert.equal(
    validateDownload(zipFixture("model.fbx"), "fbx").container,
    "zip",
  );
  assert.throws(() => validateDownload(zipFixture("preview.png"), "fbx"));
});
