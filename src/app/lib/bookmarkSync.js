/* =========================================================
   Saving / unsaving a session, in step with the server (Oct 25
   2026, "When I unsave a session my points stay"). The server
   used to flip whatever it had, so when this page and the server
   disagreed (another device, a stale tab, a request that never
   arrived) an "unsave" tap saved. Now each request says the state
   the person sees ({ saved: true | false }), and per session:
   at most one request is out at a time, the latest wanted state
   wins, and it's sent again if it changed while one was out.
   Pure (no store, no fetch), so node --test can run it.
========================================================= */

/**
 * `send(key, wanted)` → a promise of the server's answer for that state.
 * → { want(key, wanted), wanted(key) }:
 *   want: asks for `wanted`; → a promise of the answer to the request that carried the last state wanted (every
 *         tap in a burst gets the same one). It rejects only when that request failed.
 *   wanted: the state asked for while a request for `key` is out, else undefined.
 */
export function createBookmarkSync(send) {
  const jobs = new Map(); // key → { wanted, done }

  async function run(key, job) {
    try {
      for (;;) {
        const value = job.wanted;
        let answer;
        try {
          answer = await send(key, value);
        } catch (e) {
          if (job.wanted === value) throw e;
          continue; // tapped again meanwhile: send what they want now
        }
        if (job.wanted === value) return answer;
      }
    } finally {
      jobs.delete(key);
    }
  }

  return {
    want(key, wanted) {
      const job = jobs.get(key);
      if (job) {
        job.wanted = wanted;
        return job.done;
      }
      const fresh = { wanted, done: null };
      jobs.set(key, fresh);
      fresh.done = run(key, fresh);
      return fresh.done;
    },
    wanted: (key) => jobs.get(key)?.wanted,
  };
}
