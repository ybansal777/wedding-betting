#!/usr/bin/env node
//
// Replaces the PRD's estimated capacity figures with measured ones.
//
//   node scripts/loadtest.mjs <leaderboard-url> [--guests 200] [--seconds 60]
//
// Simulates the read pattern that actually matters: N guests polling one
// event's leaderboard on a jittered ~30s cycle, exactly as GuestGame does.
//
// It reports the cache-hit ratio alongside latency because that ratio IS the
// capacity story — at 100% hits the database sees one request per TTL window
// regardless of how many phones are in the room, and at 0% it sees all of them.
//
// SAFETY: the target URL must be passed explicitly. There is no default and no
// environment fallback, so this cannot wander onto a production deployment by
// accident. Do not point it at a live event's URL during a real wedding.

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("http"));

const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : fallback;
};

const GUESTS = flag("guests", 200);
const SECONDS = flag("seconds", 60);
const POLL_MS = flag("poll", 30000);

if (!url) {
  console.error(`
Usage: node scripts/loadtest.mjs <leaderboard-url> [--guests 200] [--seconds 60]

Example:
  node scripts/loadtest.mjs http://localhost:3000/api/events/<uuid>/leaderboard

Pass the URL explicitly — this script will not guess a target.
`);
  process.exit(1);
}

const latencies = [];
let ok = 0;
let failed = 0;
let cacheHits = 0;
let cacheMisses = 0;
const errors = new Map();

const jitter = (ms) => ms * (0.75 + Math.random() * 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function poll() {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { headers: { "cache-control": "max-age=0" } });
    latencies.push(performance.now() - t0);

    if (res.ok) ok++;
    else {
      failed++;
      errors.set(res.status, (errors.get(res.status) || 0) + 1);
    }

    // Vercel reports HIT/MISS/STALE here; other CDNs use similar headers.
    const age =
      res.headers.get("x-vercel-cache") || res.headers.get("cf-cache-status");
    if (age) {
      if (/hit|stale/i.test(age)) cacheHits++;
      else cacheMisses++;
    }
  } catch (err) {
    failed++;
    latencies.push(performance.now() - t0);
    const key = err.code || "network";
    errors.set(key, (errors.get(key) || 0) + 1);
  }
}

async function guest() {
  // Stagger arrivals across the first poll window, like guests scanning over
  // the course of a few minutes rather than all at once.
  await sleep(Math.random() * POLL_MS);
  const until = Date.now() + SECONDS * 1000;
  while (Date.now() < until) {
    await poll();
    await sleep(jitter(POLL_MS));
  }
}

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  ];
};

console.log(
  `▸ ${GUESTS} simulated guests · ${SECONDS}s · polling every ~${POLL_MS / 1000}s`
);
console.log(`▸ target: ${url}\n`);

const started = Date.now();
const ticker = setInterval(() => {
  const elapsed = Math.round((Date.now() - started) / 1000);
  process.stdout.write(
    `\r  ${elapsed}s · ${ok + failed} requests · ${failed} failed   `
  );
}, 1000);

await Promise.all(Array.from({ length: GUESTS }, guest));
clearInterval(ticker);

const total = ok + failed;
const rps = total / SECONDS;

console.log(`\n
──────────────────────────────────────────
  requests        ${total}   (${rps.toFixed(1)}/s)
  ok / failed     ${ok} / ${failed}
  p50             ${pct(latencies, 50).toFixed(0)} ms
  p95             ${pct(latencies, 95).toFixed(0)} ms
  p99             ${pct(latencies, 99).toFixed(0)} ms
  max             ${Math.max(...latencies).toFixed(0)} ms`);

if (cacheHits + cacheMisses > 0) {
  const ratio = (100 * cacheHits) / (cacheHits + cacheMisses);
  console.log(
    `  cache hit rate  ${ratio.toFixed(1)}%  (${cacheHits} hit / ${cacheMisses} miss)`
  );
  console.log(
    `  origin load     ~${((rps * (100 - ratio)) / 100).toFixed(1)} req/s reaching the database`
  );
} else {
  console.log(`  cache hit rate  no CDN cache headers seen (running locally?)`);
}

if (errors.size) {
  console.log(`\n  errors:`);
  for (const [k, v] of errors) console.log(`    ${k}: ${v}`);
}
console.log(`──────────────────────────────────────────`);

process.exit(failed > total * 0.01 ? 1 : 0);
