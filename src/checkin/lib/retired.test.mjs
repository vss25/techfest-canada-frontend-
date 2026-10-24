/* node --test src/checkin/lib/retired.test.mjs: opening /checkin/ asks the browser to update the service worker a
   device still has at the app's earlier address (so its replacement, src/checkin/retiredSw.js, arrives now), and
   nothing else: other workers (the attendee app's /app/, the desk's own /checkin/) are left alone; nothing is
   unregistered; no browser support or an error never breaks the app. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RETIRED_DESK_PATHS } from "../deskPath.js";
import { retiredRegistrations, retireOldWorkers } from "./retired.js";

const ORIGIN = "https://www.thetechfestival.com";
const reg = (path, { fail = false } = {}) => {
  const r = { scope: ORIGIN + path, updates: 0, unregisters: 0 };
  r.update = () => { r.updates++; return fail ? Promise.reject(new Error("offline")) : Promise.resolve(); };
  r.unregister = () => { r.unregisters++; return Promise.resolve(true); };
  return r;
};

test("only the earlier address's worker is updated; none is unregistered", async () => {
  const old = reg(RETIRED_DESK_PATHS[0]);
  const others = [reg("/checkin/"), reg("/app/"), reg("/"), reg(`${RETIRED_DESK_PATHS[0]}x/`), reg("/checkin-zzzzzzzzzzzz/")];
  const container = { getRegistrations: async () => [others[0], old, ...others.slice(1)] };
  assert.equal(await retireOldWorkers(container), 1);
  assert.equal(old.updates, 1);
  for (const r of [old, ...others]) assert.equal(r.unregisters, 0);
  for (const r of others) assert.equal(r.updates, 0, r.scope);
  assert.deepEqual(retiredRegistrations([others[1], old, { scope: "not a url" }, null].filter(Boolean)), [old]);
});

test("never throws: no service workers, no getRegistrations, a failing update or lookup", async () => {
  assert.equal(await retireOldWorkers(null), 0);
  assert.equal(await retireOldWorkers(undefined), 0);
  assert.equal(await retireOldWorkers({}), 0);
  assert.equal(await retireOldWorkers({ getRegistrations: async () => { throw new Error("SecurityError"); } }), 0);
  assert.equal(await retireOldWorkers({ getRegistrations: () => { throw new Error("sync"); } }), 0);
  assert.equal(await retireOldWorkers({ getRegistrations: async () => [reg(RETIRED_DESK_PATHS[0], { fail: true })] }), 1);
  const throwing = { scope: ORIGIN + RETIRED_DESK_PATHS[0], update: () => { throw new Error("InvalidStateError"); } };
  assert.equal(await retireOldWorkers({ getRegistrations: async () => [throwing] }), 1);
  assert.equal(await retireOldWorkers({ getRegistrations: async () => null }), 0);
  // In node there's no navigator: the default container is missing, and that's fine.
  assert.equal(await retireOldWorkers(), 0);
});
