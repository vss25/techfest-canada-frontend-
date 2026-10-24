/* Test helper (not a test, never in the app): vercel.json's routing, the way Vercel applies it, for the desk's tests
   (src/checkin/lib/deskPath.test.mjs) and the local E2E rig. Sources are path-to-regexp v6 patterns, compiled like
   Vercel's own routing (@vercel/routing-utils sourceToRegex: case-sensitive, strict, delimiter "/"):
     1. every matching `headers` rule adds its headers (a later rule's value for the same header wins);
     2. the first matching `redirect` answers (308 permanent, 307 otherwise; the query string is kept);
     3. a file of the deploy at that path is served;
     4. the first matching `rewrite` serves its destination (a file of the deploy, else 404).
   The lexer / parser / tokensToRegexp below follow path-to-regexp 6.x (the subset vercel.json can use). */

const escape = (s) => s.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

function lexer(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === "*" || c === "+" || c === "?") { tokens.push({ type: "MODIFIER", index: i, value: str[i++] }); continue; }
    if (c === "\\") { tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] }); continue; }
    if (c === "{") { tokens.push({ type: "OPEN", index: i, value: str[i++] }); continue; }
    if (c === "}") { tokens.push({ type: "CLOSE", index: i, value: str[i++] }); continue; }
    if (c === ":") {
      let name = "";
      let j = i + 1;
      while (j < str.length && /[0-9A-Za-z_]/.test(str[j])) name += str[j++];
      if (!name) throw new TypeError(`Missing parameter name at ${i}`);
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (c === "(") {
      let count = 1;
      let pattern = "";
      let j = i + 1;
      if (str[j] === "?") throw new TypeError(`Pattern cannot start with "?" at ${j}`);
      while (j < str.length) {
        if (str[j] === "\\") { pattern += str[j++] + str[j++]; continue; }
        if (str[j] === ")") { count--; if (count === 0) { j++; break; } }
        else if (str[j] === "(") { count++; if (str[j + 1] !== "?") throw new TypeError(`Capturing groups are not allowed at ${j}`); }
        pattern += str[j++];
      }
      if (count) throw new TypeError(`Unbalanced pattern at ${i}`);
      if (!pattern) throw new TypeError(`Missing pattern at ${i}`);
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}

function parse(str, delimiter = "/") {
  const tokens = lexer(str);
  const prefixes = "./";
  const defaultPattern = `[^${escape(delimiter)}]+?`;
  const result = [];
  let key = 0;
  let i = 0;
  let path = "";
  const tryConsume = (type) => (i < tokens.length && tokens[i].type === type ? tokens[i++].value : undefined);
  const mustConsume = (type) => {
    const v = tryConsume(type);
    if (v !== undefined) return v;
    throw new TypeError(`Unexpected ${tokens[i].type} at ${tokens[i].index}, expected ${type}`);
  };
  const consumeText = () => { let r = ""; let v; while ((v = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) r += v; return r; };
  while (i < tokens.length) {
    const char = tryConsume("CHAR");
    const name = tryConsume("NAME");
    const pattern = tryConsume("PATTERN");
    if (name || pattern) {
      let prefix = char || "";
      if (!prefixes.includes(prefix)) { path += prefix; prefix = ""; }
      if (path) { result.push(path); path = ""; }
      result.push({ name: name || key++, prefix, suffix: "", pattern: pattern || defaultPattern, modifier: tryConsume("MODIFIER") || "" });
      continue;
    }
    const value = char || tryConsume("ESCAPED_CHAR");
    if (value) { path += value; continue; }
    if (path) { result.push(path); path = ""; }
    if (tryConsume("OPEN")) {
      const prefix = consumeText();
      const nm = tryConsume("NAME") || "";
      const pat = tryConsume("PATTERN") || "";
      const suffix = consumeText();
      mustConsume("CLOSE");
      result.push({ name: nm || (pat ? key++ : ""), pattern: nm && !pat ? defaultPattern : pat, prefix, suffix, modifier: tryConsume("MODIFIER") || "" });
      continue;
    }
    mustConsume("END");
  }
  return result;
}

/** A vercel.json `source` → { re, keys } (case-sensitive, strict, delimiter "/", like Vercel). */
export function sourceToRegex(source) {
  const keys = [];
  let route = "^";
  for (const t of parse(source, "/")) {
    if (typeof t === "string") { route += escape(t); continue; }
    const prefix = escape(t.prefix);
    const suffix = escape(t.suffix);
    if (t.pattern) {
      keys.push(t.name);
      if (prefix || suffix) {
        if (t.modifier === "+" || t.modifier === "*") {
          const mod = t.modifier === "*" ? "?" : "";
          route += `(?:${prefix}((?:${t.pattern})(?:${suffix}${prefix}(?:${t.pattern}))*)${suffix})${mod}`;
        } else {
          route += `(?:${prefix}(${t.pattern})${suffix})${t.modifier}`;
        }
      } else if (t.modifier === "+" || t.modifier === "*") {
        route += `((?:${t.pattern})${t.modifier})`;
      } else {
        route += `(${t.pattern})${t.modifier}`;
      }
    } else {
      route += `(?:${prefix}${suffix})${t.modifier}`;
    }
  }
  route += "$";
  return { re: new RegExp(route), keys };
}

const cache = new Map();
/** The source's match for a path: { name: value } (unnamed groups by number), or null. */
export function match(source, pathname) {
  if (!cache.has(source)) cache.set(source, sourceToRegex(source));
  const { re, keys } = cache.get(source);
  const m = re.exec(pathname);
  if (!m) return null;
  const params = {};
  keys.forEach((k, i) => { params[k] = m[i + 1]; });
  return params;
}

const fill = (dest, params) => dest.replace(/:([A-Za-z_][0-9A-Za-z_]*)\*?/g, (all, k) => (k in params ? (params[k] ?? "") : all));

/**
 * How Vercel answers `url` (a path with an optional query) for a deploy whose files are `exists(path)`.
 * → { status, location?, file?, headers: { lower-case name: value }, rule }
 */
export function route(config, url, exists) {
  const q = url.indexOf("?");
  const pathname = q === -1 ? url : url.slice(0, q);
  const search = q === -1 ? "" : url.slice(q);
  const headers = {};
  for (const h of config.headers || []) {
    if (match(h.source, pathname)) for (const { key, value } of h.headers) headers[key.toLowerCase()] = value;
  }
  for (const r of config.redirects || []) {
    const p = match(r.source, pathname);
    if (!p) continue;
    const dest = fill(r.destination, p);
    const location = search && !dest.includes("?") ? dest + search : dest;
    return { status: r.statusCode || (r.permanent ? 308 : 307), location, headers, rule: `redirect ${r.source}` };
  }
  if (!pathname.endsWith("/") && exists(pathname)) return { status: 200, file: pathname, headers, rule: "file" };
  for (const r of config.rewrites || []) {
    const p = match(r.source, pathname);
    if (!p) continue;
    const file = fill(r.destination, p);
    return { status: exists(file) ? 200 : 404, file, headers, rule: `rewrite ${r.source}` };
  }
  return { status: 404, headers, rule: "none" };
}
