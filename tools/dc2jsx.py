"""Convert an approved design-canvas board (.dc.html) into a React class component, 1:1.

Usage: python3 dc2jsx.py <board.dc.html> <out.jsx> <ComponentName> [blob_prefix]

The template becomes JSX (sc-if -> conditional, sc-for -> map), the DCLogic class becomes a
React.Component whose render() calls renderVals() exactly as the canvas does, and the board's
<helmet> CSS is emitted as a string rendered once. /_blob/<id> media point at blob_prefix.
"""
import re, sys, json

src, out, name = sys.argv[1], sys.argv[2], sys.argv[3]
blob_prefix = sys.argv[4] if len(sys.argv) > 4 else "/approved/"
html = open(src).read()

body = html[html.index("<x-dc>") + 6: html.index("</x-dc>")]
helmet = body[body.index("<helmet>"): body.index("</helmet>") + 9]
css = re.search(r"<style>(.*?)</style>", helmet, re.S).group(1)
body = body.replace(helmet, "")
script = re.search(r'data-dc-script[^>]*>(.*?)</script>', html, re.S).group(1)
props = json.loads(re.search(r"data-props='([^']*)'", html).group(1))

# media
EXT = {}
import os
for f in (os.listdir('public/approved') if os.path.isdir('public/approved') else []):
    b, e = os.path.splitext(f); EXT[b] = e
OVERRIDE = {"91b82cf91cc133bbda3abd88aa79c556": "/Tech_Festival_Canada_Logo_Dark_Transparent.webp"}
def blob(m):
    i = m.group(1)
    return OVERRIDE.get(i) or (blob_prefix + i + EXT.get(i, ""))
body = re.sub(r"/_blob/([0-9a-f]{32})", blob, body)
script = re.sub(r"/_blob/([0-9a-f]{32})", blob, script)

VOID = {"img", "input", "br", "hr", "source", "meta", "link", "area", "col", "embed", "track", "wbr"}
ATTR_MAP = {"class": "className", "for": "htmlFor", "tabindex": "tabIndex", "readonly": "readOnly", "maxlength": "maxLength",
            "autoplay": "autoPlay", "playsinline": "playsInline", "srcset": "srcSet", "crossorigin": "crossOrigin",
            "autocomplete": "autoComplete", "colspan": "colSpan", "rowspan": "rowSpan", "enterkeyhint": "enterKeyHint",
            "inputmode": "inputMode", "novalidate": "noValidate", "allowfullscreen": "allowFullScreen", "datetime": "dateTime"}
BOOL = {"disabled", "checked", "selected", "muted", "autoplay", "playsinline", "loop", "controls", "required", "readonly", "hidden", "multiple", "novalidate"}

tok_re = re.compile(r"<!--.*?-->|</([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:=\"[^\"]*\")?)*)\s*(/?)>|([^<]+)", re.S)
attr_re = re.compile(r"([^\s=/>]+)(?:=\"([^\"]*)\")?")
hole_re = re.compile(r"\{\{\s*([^}]*?)\s*\}\}")

def camel(k):
    if k.startswith("aria-") or k.startswith("data-"):
        return k
    if k in ATTR_MAP:
        return ATTR_MAP[k]
    if "-" in k:
        p = k.split("-"); return p[0] + "".join(x.capitalize() for x in p[1:])
    return k

class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.kids = tag, attrs, []

root = Node("#root", [])
stack = [root]
for m in tok_re.finditer(body):
    s = m.group(0)
    if s.startswith("<!--"):
        continue
    if m.group(1):
        t = m.group(1)
        while len(stack) > 1 and stack[-1].tag != t:
            stack.pop()
        if len(stack) > 1:
            stack.pop()
    elif m.group(2):
        t = m.group(2)
        attrs = [(a.group(1), a.group(2)) for a in attr_re.finditer(m.group(3) or "")]
        n = Node(t, attrs)
        stack[-1].kids.append(n)
        if t.lower() not in VOID and not m.group(4):
            stack.append(n)
    else:
        stack[-1].kids.append(m.group(5))

def res(expr, scope):
    e = expr.strip()
    if re.fullmatch(r"-?\d+(\.\d+)?|true|false|null", e) or e.startswith(("'", '"')):
        return e
    rootname = re.split(r"[.\[]", e)[0]
    return e if rootname in scope else "v." + e

def tmpl(val, scope):
    """attribute value with holes -> JS template literal (or a plain expression if it is one hole)."""
    holes = hole_re.findall(val)
    if hole_re.fullmatch(val.strip()):
        return res(holes[0], scope)
    out = "`" + hole_re.sub(lambda h: "${" + res(h.group(1), scope) + "}", val.replace("`", "\\`")) + "`"
    return out

def style_obj(val):
    parts = []
    for decl in [d for d in val.split(";") if d.strip()]:
        if ":" not in decl:
            continue
        k, v = decl.split(":", 1)
        k, v = k.strip(), v.strip()
        key = k if k.startswith("--") else re.sub(r"-([a-z])", lambda x: x.group(1).upper(), k)
        parts.append(json.dumps(key) + ": " + json.dumps(v))
    return "{" + ", ".join(parts) + "}"

def jtext(t, scope):
    if not t.strip():
        return " " if "\n" not in t and t else ""
    t = re.sub(r"\s+", " ", t)
    out, last = [], 0
    for h in hole_re.finditer(t):
        out.append(esc(t[last:h.start()]))
        out.append("{" + res(h.group(1), scope) + "}")
        last = h.end()
    out.append(esc(t[last:]))
    return "".join(out)

def esc(s):
    return s.replace("{", "{'{'}").replace("}", "{'}'}").replace(">", "&gt;").replace("<", "&lt;")

def emit(n, scope, ind):
    pad = "  " * ind
    if isinstance(n, str):
        return jtext(n, scope)
    tag = n.tag
    if tag == "sc-if":
        cond = dict(n.attrs).get("value", "")
        c = tmpl(cond, scope)
        inner = "".join(emit(k, scope, ind + 1) for k in n.kids)
        return "{" + c + " ? (<>" + inner + "</>) : null}"
    if tag == "sc-for":
        a = dict(n.attrs)
        lst = tmpl(a.get("list", ""), scope)
        var = a.get("as", "item")
        sc2 = scope | {var}
        inner = "".join(emit(k, sc2, ind + 1) for k in n.kids)
        return "{(" + lst + " || []).map((" + var + ", " + var + "__i) => (<React.Fragment key={" + var + "__i}>" + inner + "</React.Fragment>))}"
    attrs = []
    textarea_default = None
    for k, val in n.attrs:
        if k.startswith("hint-"):
            continue
        lk = k.lower()
        if val is None:
            if lk in BOOL:
                key = {"checked": "defaultChecked", "selected": "defaultChecked"}.get(lk, camel(lk))
                if lk == "selected":
                    continue
                attrs.append(f"{key}")
            else:
                attrs.append(camel(k))
            continue
        if lk == "style":
            if hole_re.search(val):
                attrs.append("style={css(" + tmpl(val, scope) + ")}")
            else:
                attrs.append("style={" + style_obj(val) + "}")
            continue
        key = camel(k)
        if k.startswith("on") and k[2:3].isupper():
            attrs.append(f"{k}={{{tmpl(val, scope)}}}")
            continue
        if lk == "value" and tag in ("input", "select"):
            key = "defaultValue"
        if lk == "checked":
            key = "defaultChecked"
        if lk in BOOL and not hole_re.search(val):
            attrs.append(f"{key}")
            continue
        if hole_re.search(val):
            attrs.append(f"{key}={{{tmpl(val, scope)}}}")
        else:
            attrs.append(f"{key}={json.dumps(val)}")
    if tag == "textarea":
        txt = "".join(k if isinstance(k, str) else "" for k in n.kids)
        if txt.strip():
            if hole_re.search(txt):
                attrs.append("defaultValue={" + tmpl(txt.strip(), scope) + "}")
            else:
                attrs.append("defaultValue=" + json.dumps(txt.strip()))
        return "<textarea " + " ".join(attrs) + " />"
    a = (" " + " ".join(attrs)) if attrs else ""
    if tag.lower() in VOID or not n.kids:
        return f"<{tag}{a} />"
    inner = "".join(emit(k, scope, ind + 1) for k in n.kids)
    return f"<{tag}{a}>{inner}</{tag}>"

jsx = '<div className="ap-root">' + "".join(emit(k, set(), 2) for k in root.kids).strip() + "</div>"
# The canvas renders each board on a clean page. The website's old global stylesheets
# (styles.css, index.css) restyle bare elements, so undo them inside .ap-root only, at zero
# specificity (:where) so the board's own classes and inline styles still win.
RESET = """
:where(.ap-root), :where(.ap-root) * { margin: revert; padding: revert; box-sizing: revert; }
:where(.ap-root) { line-height: normal; font-family: Poppins, system-ui, sans-serif; text-align: left; }
:where(.ap-root) h1, :where(.ap-root) h2, :where(.ap-root) h3, :where(.ap-root) h4, :where(.ap-root) h5, :where(.ap-root) h6 { font-family: inherit; letter-spacing: normal; font-weight: bold; font-size: revert; line-height: revert; }
:where(.ap-root) a { font-weight: inherit; text-decoration: revert; }
:where(.ap-root) button { border-radius: revert; border: revert; padding: revert; font-size: revert; font-weight: revert; font-family: revert; background-color: revert; transition: revert; }
:where(.ap-root) nav, :where(.ap-root) header, :where(.ap-root) footer { display: block; justify-content: normal; align-items: normal; padding: 0; width: auto; height: auto; background: none; backdrop-filter: none; border: 0; position: static; z-index: auto; text-align: left; margin: 0; }
:where(.ap-root) img { max-width: none; }
"""

cls = script.strip()
cls = re.sub(r"class\s+Component\s+extends\s+DCLogic\s*\{", "class " + name + "Logic extends React.Component {", cls, count=1)
# Let a wrapper swap the board's sample data for live data: `const CITIES = {...};` in
# renderVals becomes `const CITIES = this.dataFor("CITIES", {...});`. dataFor returns the
# board's value unless props.data has the key (a value, or a function of the board's value).
DATA_KEYS = ["CITIES", "PT", "PTG", "AW", "BOOTHS", "TIERS", "types", "sessionsData"]
def match_close(t, i):
    pairs = {"{": "}", "[": "]", "(": ")"}
    stack, q, n = [], None, len(t)
    while i < n:
        c = t[i]
        if q:
            if c == "\\": i += 2; continue
            if c == q: q = None
        elif c in "'\"`": q = c
        elif c in pairs: stack.append(pairs[c])
        elif c in ")]}":
            stack.pop()
            if not stack: return i
        i += 1
    raise ValueError("unbalanced")
for k in DATA_KEYS:
    m = re.search(r"\n    const " + k + r" = ", cls)
    if not m: continue
    a = m.end()
    b = match_close(cls, a)
    cls = cls[:a] + 'this.dataFor("' + k + '", ' + cls[a:b + 1] + ")" + cls[b + 1:]
defaults = {k: v.get("default") for k, v in props.items() if isinstance(v, dict) and "default" in v}

code = f"""/* eslint-disable */
// GENERATED from the approved design board by tools/dc2jsx.py. Do not edit by hand:
// change the board and regenerate, or wrap this component. Redesign step 2, Nov 2026.
import React from "react";

export const {name.upper()}_CSS = {json.dumps(RESET + css)};

function css(s) {{
  const o = {{}};
  String(s).split(";").forEach((d) => {{
    const i = d.indexOf(":");
    if (i < 0) return;
    const k = d.slice(0, i).trim();
    const val = d.slice(i + 1).trim();
    if (!k || val === "" || val === "undefined" || val === "null") return;
    o[k.startsWith("--") ? k : k.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] = val;
  }});
  return o;
}}

{cls}

export default class {name} extends {name}Logic {{
  static defaultProps = {json.dumps(defaults)};
  dataFor(k, base) {{
    const d = this.props.data && this.props.data[k];
    if (d === undefined || d === null) return base;
    return typeof d === "function" ? d(base) : d;
  }}
  render() {{
    const v = this.renderVals();
    return (
      <>
        <style>{{{name.upper()}_CSS}}</style>
        {jsx}
      </>
    );
  }}
}}
"""
open(out, "w").write(code)
print("wrote", out, len(code), "chars")
