/* The website's built-in wording, as a list of hashes (Nov 25 2026).

   Admin › Content › Website text & media lists every piece of text on a page. To tell staff which
   pieces are built into the site (changed there) and which come from their records (events,
   speakers, partners, tickets, agenda…: changed on those pages), the panel needs to know what the
   site's code itself says. This reads the public site's source (not the staff panel, the web app or
   the check-in desk) and hashes every piece of JSX text and every string in it. vite.config.js
   serves the result as the module "virtual:ttfc-builtin-copy", so it is always this build's own list
   and nothing is kept by hand. Run it alone to see the count: node tools/builtinCopy.mjs */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { hashText, isCopy, squash } from "../src/lib/siteCopyRules.js";

const SKIP_DIRS = new Set(["admin", "app", "checkin", "jury", "scripts", "getApp", "assets"]);
const CODE = /\.(jsx?|tsx?|mjs)$/;

function files(dir, root, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { if (!(dir === root && SKIP_DIRS.has(name))) files(full, root, out); }
    else if (CODE.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

function strings(node, out) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "JSXText" || node.type === "StringLiteral") out.push(node.value);
  else if (node.type === "TemplateLiteral") for (const q of node.quasis) out.push(q.value.cooked || "");
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "extra" || key === "leadingComments" || key === "trailingComments" || key === "innerComments") continue;
    const v = node[key];
    if (Array.isArray(v)) for (const x of v) strings(x, out);
    else if (v && typeof v === "object") strings(v, out);
  }
}

/** { hashes: sorted unique numbers, texts: the strings themselves, files: how many were read }. */
export function collectBuiltinCopy(srcDir) {
  const seen = new Set();
  const list = files(srcDir, srcDir);
  for (const file of list) {
    let ast;
    try {
      ast = parse(readFileSync(file, "utf8"), { sourceType: "module", errorRecovery: true, plugins: ["jsx", ...(/\.tsx?$/.test(file) ? ["typescript"] : [])] });
    } catch (err) { console.warn(`builtinCopy: skipped ${relative(srcDir, file)} (${err.message})`); continue; }
    const found = [];
    strings(ast.program, found);
    for (const s of found) { const t = squash(s); if (t.length > 1 && isCopy(t)) seen.add(t); }
  }
  const texts = [...seen];
  return { hashes: [...new Set(texts.map(hashText))].sort((a, b) => a - b), texts, files: list.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = collectBuiltinCopy(fileURLToPath(new URL("../src", import.meta.url)));
  console.log(`${out.texts.length} built-in pieces of text in ${out.files} files (${out.hashes.length} hashes)`);
}
