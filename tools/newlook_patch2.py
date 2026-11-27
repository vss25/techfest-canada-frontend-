# The new look, part 2 (Nov 25 2026, the owner: "all of them"): the preview's sections and pages.
# Already applied. Re-run only on freshly regenerated boards, after newlook_patch.py:
#   python3 tools/newlook_patch2.py src/redesign/approved
# Each board keeps its own markup as the fallback: {v.x || <section …>}. LiveSite.jsx / LivePhone.jsx set v.x.
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

def section_end(s, a):
    assert s.startswith('<section', a), s[a:a+30]
    depth, i = 0, a
    while True:
        o = s.find('<section', i); c = s.find('</section>', i)
        if o != -1 and o < c: depth += 1; i = o + 8
        else:
            depth -= 1; i = c + 10
            if depth == 0: return i

def wrap(s, marker, name, after=''):
    """<section marker…>…</section>  →  {v.name || (<section…>…</section>)}after"""
    assert s.count(marker) == 1, (marker, s.count(marker))
    a = s.index(marker); e = section_end(s, a)
    return s[:a] + '{v.' + name + ' || (' + s[a:e] + ')}' + after + s[e:]

def wrap_first(s, marker, name):
    """The first <section right after marker  →  {v.name || (<section…>)}"""
    assert s.count(marker) == 1, marker
    a = s.index(marker) + len(marker); e = section_end(s, a)
    return s[:a] + '{v.' + name + ' || (' + s[a:e] + ')}' + s[e:]

NEW_KEYS = 'k === "next" ? (v.homeNext || null) : k === "speakers" ? (v.homeSpeakers || null) : k === "partners" ? (v.homePartners || null) : k === "agenda" ? ('
PAGES = '{v.isAgenda ? v.agendaPage : null}{v.isSpeaker ? v.speakerPage : null}{v.isEventFull ? ('

# ---------------- desktop ----------------
f = ROOT + '/ApprovedSite.jsx'
lines, li = load(f); s = lines[li]
A = '<a href="#" className="p-link" onClick={v.homeGo || v.goEvent} style={{"alignSelf": "flex-start", "color": "#151035", "fontSize": "16px", "fontWeight": "600"}}>Explore the event →</a>'
s = rep(s, A, '{v.heroCtas || ' + A + '}')
s = rep(s, 'k === "agenda" ? (', NEW_KEYS)
s = rep(s, 'k === "highlights" ? (<section aria-label="Toronto 2026 highlights"', 'k === "highlights" ? (v.homeLastYear || <section aria-label="Toronto 2026 highlights"')
s = wrap(s, '<section id="ev-agenda"', 'dayGlance')
s = wrap(s, '<section id="ev-speakers"', 'evOnStage', after='{v.passes}')
s = wrap_first(s, '{v.isSpeakers ? (<><main>', 'spkHero')
s = rep(s, '{v.isEventFull ? (', PAGES)
s = rep(s, '</section>{v.seasonRail}{v.aw2026 ? (', '</section>{v.seasonRail}{v.awDates}{v.aw2026 ? (')
# Header: Agenda · Speakers · Awards · Partners · More (Exhibit stays under More), the current one underlined.
NAV_OLD = '<a href="#" className={`p-link ${v.nav.speakers}`} onClick={v.sec.speakers} style={{"color": "#E8E5F1"}}>Speakers</a><a href="#" className={`p-link ${v.nav.exhibit}`} onClick={v.sec.exhibit} style={{"color": "#E8E5F1"}}>Exhibit</a><a href="#" className={`p-link ${v.nav.partners}`} onClick={v.goPartners} style={{"color": "#E8E5F1"}}>Partners</a><a href="#" className="p-link" onClick={v.goAwards} style={{"color": "#E8E5F1"}}>Awards</a>'
NAV_NEW = '<a href="#" className={`p-link ${v.nav.speakers}`} onClick={v.navSpeakers || v.sec.speakers} style={{"color": "#E8E5F1"}}>Speakers</a><a href="#" className={`p-link ${v.nav.awards || ""}`} onClick={v.goAwards} style={{"color": "#E8E5F1"}}>Awards</a><a href="#" className={`p-link ${v.nav.partners}`} onClick={v.goPartners} style={{"color": "#E8E5F1"}}>Partners</a>'
s = rep(s, NAV_OLD, NAV_NEW)
lines[li] = s; open(f, 'w').write('\n'.join(lines))

# ---------------- phone ----------------
f = ROOT + '/ApprovedPhone.jsx'
lines, li = load(f); s = lines[li]
A = '<a href="#" onClick={v.homeGo || v.goEvent} style={{"alignSelf": "flex-start", "color": "#151035", "fontSize": "16px", "fontWeight": "600", "textUnderlineOffset": "4px"}}>Explore the event →</a>'
s = rep(s, A, '{v.heroCtas || ' + A + '}')
s = rep(s, 'k === "agenda" ? (', NEW_KEYS)
s = rep(s, 'k === "highlights" ? (<section style={{"padding": "36px 16px"', 'k === "highlights" ? (v.homeLastYear || <section style={{"padding": "36px 16px"')
s = wrap(s, '<section id="m-agenda"', 'dayGlance')
s = wrap(s, '<section id="m-speakers"', 'evOnStage', after='{v.passes}')
s = wrap_first(s, '{v.isSpeakers ? (<><main className="m-in">', 'spkHero')
s = rep(s, '{v.isEventFull ? (', PAGES)
lines[li] = s; open(f, 'w').write('\n'.join(lines))
print('ok')
