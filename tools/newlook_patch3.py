# The new look, part 3 (Nov 25 2026, the owner: "the UI elements are bland again"): hooks for the event-grade
# pieces. Already applied. Re-run only on freshly regenerated boards, after newlook_patch.py and newlook_patch2.py:
#   python3 tools/newlook_patch3.py src/redesign/approved
import sys
ROOT = sys.argv[1]

def load(f):
    lines = open(f).read().split('\n')
    i = max(range(len(lines)), key=lambda k: len(lines[k]))
    return lines, i

def rep(s, old, new, count=1):
    n = s.count(old)
    assert n == count, f"expected {count} of {old[:90]!r}, found {n}"
    return s.replace(old, new)

CD_OLD = '{v.c.hasCountdown ? (<>'
CD_NEW = '{v.countdown !== undefined ? v.countdown : v.c.hasCountdown ? (<>'   # a ticking countdown (days, hours, min, sec)

f = ROOT + '/ApprovedSite.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, 'k === "form" ? (<section style={{"background": "#F5F3FA"}}>', 'k === "form" ? (<section className="nl-panel" style={{"background": "#F5F3FA"}}>')
s = rep(s, CD_OLD, CD_NEW)
# The event's facts strip: the date as a ticket stub (FEB / 24) instead of the calendar icon.
ICON = '<span style={{"flex": "0 0 44px", "height": "44px", "borderRadius": "12px", "background": "#F5F3FA", "display": "flex", "alignItems": "center", "justifyContent": "center"}}><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12v11H4zM4 8h12M7 3v4M13 3v4"'
a = s.index(ICON); assert s.count(ICON) == 1
e = s.index('</svg></span>', a) + len('</svg></span>')
s = s[:a] + '{v.dateStub || ' + s[a:e] + '}' + s[e:]
lines[li] = s; open(f, 'w').write('\n'.join(lines))

f = ROOT + '/ApprovedPhone.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, 'k === "form" ? (<section style={{"background": "#F5F3FA", "padding": "32px 16px"', 'k === "form" ? (<section className="nl-panel" style={{"background": "#F5F3FA", "padding": "32px 16px"')
s = rep(s, CD_OLD, CD_NEW)
lines[li] = s; open(f, 'w').write('\n'.join(lines))
print('ok')

# ---- Dark "stage" band for the home page's Agenda highlights (the owner: "this is too bland") ----
f = ROOT + '/ApprovedSite.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, 'k === "agenda" ? (<section id="p-agenda" style=', 'k === "agenda" ? (<section id="p-agenda" className="nl-stage" style=')
lines[li] = s; open(f, 'w').write('\n'.join(lines))
f = ROOT + '/ApprovedPhone.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, 'k === "agenda" ? (<section style={{"background": "#F5F3FA"', 'k === "agenda" ? (<section className="nl-stage" style={{"background": "#F5F3FA"')
lines[li] = s; open(f, 'w').write('\n'.join(lines))
print('ok stage')

# ---- A closing ticker above the footer on every page ("See you in Vancouver ✦ Feb 24, 2027 ✦ …") ----
for name in ('/ApprovedSite.jsx', '/ApprovedPhone.jsx'):
    f = ROOT + name
    lines, li = load(f); s = lines[li]
    s = rep(s, '<footer data-dark="1"', '{v.footTicker}<footer data-dark="1"')
    lines[li] = s; open(f, 'w').write('\n'.join(lines))
print('ok footer ticker')
