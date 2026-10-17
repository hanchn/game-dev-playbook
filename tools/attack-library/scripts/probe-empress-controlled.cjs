/* Loopback-only controlled session on the original Empress 1.0 engine.
 *
 * The author server exposes the same protocol its own client uses. This script
 * starts a CPU battle, sends ordinary movement/attack/dodge/switch inputs and
 * records the authoritative per-fighter state stream. It does not inject damage,
 * cooldowns, PP or positions, and it never replaces game logic.
 *
 * Evidence written:
 *   states.jsonl       throttled authoritative snapshots
 *   report.json        phase deltas, observed casts/switches/dodges, limitations
 */
const path = require('node:path');
const fs = require('node:fs');

const OUT = process.env.EMPRESS_OUT;
if (!OUT) throw new Error('EMPRESS_OUT is required');
fs.mkdirSync(OUT, { recursive: true });
const base = path.resolve(__dirname, '../../../output/local-original-games/empress-1.0.0');
const WebSocket = require(path.join(base, 'runtime/node_modules/ws'));

const TEAM = ['charizard', 'greninja', 'pikachu'];
const phases = [
  { id: 'idle', until: 700, dx: 0, dy: 0 },
  { id: 'move-right', until: 1700, dx: 1, dy: 0 },
  { id: 'move-left', until: 2700, dx: -1, dy: 0 },
  { id: 'dodge', until: 3000, dx: 0, dy: 0, dodgeAt: 2750 },
  { id: 'cast-slot-0', until: 3900, dx: 0, dy: 0, castAt: [3050, 3600], castSlot: 0 },
  { id: 'move-up-right', until: 4700, dx: 1, dy: -1 },
  { id: 'switch-slot-1', until: 4800, dx: 0, dy: 0, switchAt: 4720, switchSlot: 1 },
  { id: 'cast-after-switch', until: 5600, dx: 0, dy: 0, castAt: [5000, 5450], castSlot: 0 },
  { id: 'move-and-cast', until: 6400, dx: 1, dy: 0, castAt: [5750, 6200], castSlot: 0 },
];
const END = 6500;

const ws = new WebSocket('ws://127.0.0.1:4369/ws', { headers: { Origin: 'http://127.0.0.1:4369' } });
const startedAt = { value: 0 };
let seq = 0;
let phase = { id: 'waiting', dx: 0, dy: 0 };
const fired = new Set();
const states = fs.createWriteStream(path.join(OUT, 'states.jsonl'));
const samples = [];
let lastSample = 0;
let summary = { hello: null, battleStart: null, errors: [], finished: null };

function pickFighter(state, team, slot) {
  const fighters = state.fighters || [];
  return fighters.find(f => f.team === team && f.slot === slot) ||
         fighters.filter(f => f.team === team).sort((a, b) => a.slot - b.slot)[0] || null;
}

function rowFor(state) {
  const mine = pickFighter(state, 0, null);
  const theirs = pickFighter(state, 1, null);
  return {
    time: state.time,
    tick: state.tick,
    phase: phase.id,
    mine: mine && { species: mine.species, x: +mine.x.toFixed(2), y: +mine.y.toFixed(2), hp: mine.hp,
                    maxHp: mine.maxHp, slot: mine.slot, dodge: mine.dodge, dodgeCooldown: mine.dodgeCooldown,
                    cooldowns: mine.cooldowns },
    theirs: theirs && { species: theirs.species, x: +theirs.x.toFixed(2), y: +theirs.y.toFixed(2), hp: theirs.hp },
  };
}

function send(payload) {
  seq += 1;
  ws.send(JSON.stringify({ type: 'input', seq, ...payload }));
}

ws.on('message', raw => {
  let msg;
  try { msg = JSON.parse(raw.toString('utf8')); } catch { return; }
  if (msg.type === 'hello') {
    summary.hello = { local: msg.local, playerId: msg.playerId, catalogVersion: msg.catalogVersion };
    ws.send(JSON.stringify({ type: 'startCpu', team: TEAM, arena: 'stadium', difficulty: 'easy', cpuLevel: 1 }));
  } else if (msg.type === 'battleStart') {
    summary.battleStart = { id: msg.id, mode: msg.mode, difficulty: msg.difficulty, arena: msg.arena,
                            selfTeam: msg.selfTeam };
    startedAt.value = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt.value;
      if (elapsed >= END) {
        clearInterval(timer);
        ws.send(JSON.stringify({ type: 'leave' }));
        finish();
        return;
      }
      const next = phases.find(p => elapsed < p.until) || phases[phases.length - 1];
      const changed = next.id !== phase.id;
      phase = next;
      const payload = { dx: phase.dx, dy: phase.dy };
      if (phase.dodgeAt && !fired.has('dodge') && elapsed >= phase.dodgeAt) { payload.dodge = true; fired.add('dodge'); }
      if (phase.castAt && !fired.has('cast-' + phase.id + '-' + phase.castAt[0]) && elapsed >= phase.castAt[0]) {
        payload.cast = phase.castSlot; fired.add('cast-' + phase.id + '-' + phase.castAt[0]);
      }
      if (phase.castAt && !fired.has('cast-' + phase.id + '-' + phase.castAt[1]) && elapsed >= phase.castAt[1]) {
        payload.cast = phase.castSlot; fired.add('cast-' + phase.id + '-' + phase.castAt[1]);
      }
      if (phase.switchAt && !fired.has('switch') && elapsed >= phase.switchAt) {
        payload.switch = phase.switchSlot; fired.add('switch');
      }
      if (changed) summary[phase.id] = { startedAtMs: elapsed };
      send(payload);
    }, 16);
  } else if (msg.type === 'state') {
    const now = Date.now();
    if (now - lastSample >= 60) {
      lastSample = now;
      const row = rowFor(msg);
      states.write(JSON.stringify(row) + '\n');
      samples.push(row);
    }
  } else if (msg.type === 'error') {
    summary.errors.push(msg.message);
  } else if (msg.type === 'result') {
    summary.finished = { winner: msg.winner, reason: msg.reason };
  }
});

ws.on('error', error => { summary.wsError = error.message; });

function finish() {
  states.end();
  const byPhase = {};
  for (const row of samples) {
    const bucket = byPhase[row.phase] || (byPhase[row.phase] = { samples: 0, first: row, last: row,
      minHp: 999, maxHp: -1, speciesSeen: new Set(), casts: new Set() });
    bucket.samples += 1;
    bucket.last = row;
    bucket.minHp = Math.min(bucket.minHp, row.mine.hp);
    bucket.maxHp = Math.max(bucket.maxHp, row.mine.hp);
    bucket.speciesSeen.add(row.mine.species);
    const cooldowns = row.mine.cooldowns || {};
    for (const key of Object.keys(cooldowns)) if (cooldowns[key] > 0) bucket.casts.add(key);
  }
  const phasesOut = {};
  for (const id of Object.keys(byPhase)) {
    const bucket = byPhase[id];
    phasesOut[id] = {
      samples: bucket.samples,
      speciesSeen: [...bucket.speciesSeen],
      displacement: {
        dx: +(bucket.last.mine.x - bucket.first.mine.x).toFixed(2),
        dy: +(bucket.last.mine.y - bucket.first.mine.y).toFixed(2),
      },
      hpAtStart: bucket.first.mine.hp,
      hpAtEnd: bucket.last.mine.hp,
      minHp: bucket.minHp,
      nonZeroCooldownsSeen: [...bucket.casts],
      opponentHpAtEnd: bucket.last.theirs ? bucket.last.theirs.hp : null,
    };
  }
  const report = {
    schema: 'empress-controlled-session/v1',
    target: 'http://127.0.0.1:4369/',
    engine: 'author Empress 1.0.0 server (original ASAR runtime, rulesModified=false)',
    mode: 'original startCpu solo battle, easy CPU, stadium arena',
    team: TEAM,
    protocolSummary: summary,
    inputSchedule: phases,
    phases: phasesOut,
    samples: samples.length,
    scope: 'Protocol-level controlled session on the original engine: ordinary movement, dodge, cast and switch ' +
           'inputs with authoritative state captured from the server. No damage, cooldown, PP or position writes. ' +
           'A cast that appears on cooldown is evidence that the input was accepted, not proof of a hit or of ' +
           'native frame timing. Visual screenshots from 2026-10-16 browser QA are separate evidence.',
    visualEvidence: 'data/research/empress-controlled-qa-20261016/qa-report.json (2026-10-16, browser, separate run)',
    moveHitVerified: false,
    nativeTimingVerified: false,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ samples: report.samples, phases: Object.keys(phasesOut), errors: summary.errors }));
  process.exit(0);
}

setTimeout(() => { if (!summary.finished && !summary.battleStart) { summary.timeout = true; finish(); } }, 20000);
