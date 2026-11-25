# The "new look" (Nov 25 2026): scripted, exact edits to the generated boards (each asserts its match count).
# Already applied. Re-run only on freshly regenerated boards: python3 tools/newlook_patch.py src/redesign/approved
import sys, re
ROOT = sys.argv[1]

def load(f):
    lines = open(f).read().split('\n')
    i = max(range(len(lines)), key=lambda k: len(lines[k]))
    return lines, i

def rep(s, old, new, count=1):
    n = s.count(old)
    assert n == count, f"expected {count} of {old[:90]!r}, found {n}"
    return s.replace(old, new)

def rep_in(s, start_marker, old, new, count=1, end_marker=None):
    a = s.index(start_marker)
    b = s.index(end_marker, a) if end_marker else section_end(s, a)
    seg = s[a:b]
    seg = rep(seg, old, new, count)
    return s[:a] + seg + s[b:]

def section_end(s, a):
    """Index just after the </section> that closes the <section starting at a."""
    assert s.startswith('<section', a), s[a:a+30]
    depth, i = 0, a
    while True:
        o = s.find('<section', i); c = s.find('</section>', i)
        if o != -1 and o < c:
            depth += 1; i = o + 8
        else:
            depth -= 1; i = c + 10
            if depth == 0: return i

def rail_after(s, marker):
    """Put {v.seasonRail} right after the first <section following marker (the page's hero)."""
    a = s.index('<section', s.index(marker))
    e = section_end(s, a)
    assert s[e:e+16] != '{v.seasonRail}', marker
    return s[:e] + '{v.seasonRail}' + s[e:]

LIVE = '{v.onSale ? <span className="nl-gp nl-live"><i className="nl-dot" aria-hidden="true" />Tickets on sale</span> : null}'

# ---------------- desktop ----------------
f = ROOT + '/ApprovedSite.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, '<section aria-label={v.homeHero ? v.homeHero.title : "Vancouver Briefing 2027"} style=',
        '<section className="nl-hero" aria-label={v.homeHero ? v.homeHero.title : "Vancouver Briefing 2027"} style=')
s = rep(s, '{k === "season" ? (<section aria-label="The 2027 season"', '{k === "season" ? (v.seasonRail || <section aria-label="The 2027 season"')
# Event hero (on sale): glass pills, "Tickets on sale" first, glass countdown.
FULL = '<section data-dark="1" aria-label="Vancouver Briefing 2027" style='
s = rep(s, FULL, '<section data-dark="1" className="nl-evhero" aria-label="Vancouver Briefing 2027" style=')
FULL = '<section data-dark="1" className="nl-evhero" aria-label="Vancouver Briefing 2027" style='
PILL = '<span style={{"height": "30px", "padding": "0 12px", "borderRadius": "999px"'
s = rep_in(s, FULL, PILL, '<span className="nl-gp" style={{"height": "30px", "padding": "0 12px", "borderRadius": "999px"', 3)
s = rep_in(s, FULL, '<div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}><span className="nl-gp"',
           '<div className="nl-pills" style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}>' + LIVE + '<span className="nl-gp"')
s = rep_in(s, FULL, '<div style={{"width": "76px", "padding": "10px 0", "borderRadius": "10px"', '<div className="nl-cd" style={{"width": "76px", "padding": "10px 0", "borderRadius": "10px"', 3)
# Event hero (coming soon): glass pills; "Details coming soon" is a status, not live: glass too.
SOON = '{v.isEventSoon ? (<><main><section data-dark="1" aria-label={v.c.title} style='
s = rep(s, SOON, '{v.isEventSoon ? (<><main><section data-dark="1" className="nl-evhero" aria-label={v.c.title} style=')
SOON = '<section data-dark="1" className="nl-evhero" aria-label={v.c.title} style='
s = rep_in(s, SOON, PILL, '<span className="nl-gp" style={{"height": "30px", "padding": "0 12px", "borderRadius": "999px"', 3)
s = rep_in(s, SOON, '<div style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}><span className="nl-gp"',
           '<div className="nl-pills" style={{"display": "flex", "flexWrap": "wrap", "gap": "8px"}}><span className="nl-gp"')
# The season timeline directly under each page's hero.
for m in ['{v.isEventFull ? (', '{v.isEventSoon ? (', '{v.isSpeakers ? (', '{v.isAwards ? (', '{v.isPartners ? (']:  # past/2026 is one section with no separate hero
    s = rail_after(s, m)
# "See all speakers →" on the section that previews them.
s = rep(s, '>All speakers →</a>', '>See all speakers →</a>')
# Gold only on buttons that buy tickets.
s = rep(s, '"background": "#F5A623", "color": "#151035", "fontFamily": "inherit", "fontSize": "16px", "fontWeight": "700"}}>Talk to our partnerships team',
        '"background": "#FFFFFF", "color": "#151035", "fontFamily": "inherit", "fontSize": "16px", "fontWeight": "700"}}>Talk to our partnerships team')
s = rep(s, '"fontWeight": "700", "letterSpacing": "-0.02em", "color": "#F5A623"}}>', '"fontWeight": "700", "letterSpacing": "-0.02em", "color": "#FFFFFF"}}>', 4)
s = rep(s, '"background": "#151035", "color": "#F5A623", "d', '"background": "#151035", "color": "#FFFFFF", "d', 9)
s = rep(s, 'fill="none" stroke="#F5A623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{v.toastText}',
        'fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{v.toastText}')
s = rep(s, '<div className="p-bar" style={{"height": "2px", "background": "#F5A623"}} />', '<div className="p-bar" style={{"height": "2px", "background": "#151035"}} />')
lines[li] = s; open(f, 'w').write('\n'.join(lines))

# ---------------- phone ----------------
f = ROOT + '/ApprovedPhone.jsx'
lines, li = load(f); s = lines[li]
s = rep(s, '{v.isHome ? (<><main><section style=', '{v.isHome ? (<><main><section className="nl-hero" style=')
s = rep(s, '{k === "season" ? (<section aria-label="The 2027 season"', '{k === "season" ? (v.seasonRail || <section aria-label="The 2027 season"')
PPILL = '<span style={{"height": "26px", "padding": "0 10px", "borderRadius": "999px"'
FULL = '{v.isEventFull ? (<><main><section style='
s = rep(s, FULL, '{v.isEventFull ? (<><main><section className="nl-evhero" style=')
FULL = '{v.isEventFull ? (<><main><section className="nl-evhero" style='
s = rep_in(s, FULL, PPILL, '<span className="nl-gp" style={{"height": "26px", "padding": "0 10px", "borderRadius": "999px"', 2, end_marker='</section>')
s = rep_in(s, FULL, '<div style={{"display": "flex", "flexWrap": "wrap", "gap": "6px"}}><span className="nl-gp"',
           '<div className="nl-pills" style={{"display": "flex", "flexWrap": "wrap", "gap": "6px"}}>' + LIVE + '<span className="nl-gp"', end_marker='</section>')
s = rep_in(s, FULL, '<span style={{"width": "64px", "padding": "8px 0", "borderRadius": "10px"', '<span className="nl-cd" style={{"width": "64px", "padding": "8px 0", "borderRadius": "10px"', 2, end_marker='</section>')
SOON = '{v.isEventSoon ? (<><main><section data-dark="1" style='
s = rep(s, SOON, '{v.isEventSoon ? (<><main><section data-dark="1" className="nl-evhero" style=')
SOON = '{v.isEventSoon ? (<><main><section data-dark="1" className="nl-evhero" style='
s = rep_in(s, SOON, PPILL, '<span className="nl-gp" style={{"height": "26px", "padding": "0 10px", "borderRadius": "999px"', 2, end_marker='</section>')
for m in ['{v.isEventFull ? (', '{v.isEventSoon ? (', '{v.isSpeakers ? (']:  # the phone's past page has no hero
    s = rail_after(s, m)
# The bottom buy bar: date, "From $…", Get tickets (the header has no ticket button on phones).
s = rep(s, '<div style={{"position": "absolute", "left": "0", "right": "0", "bottom": "0", "zIndex": "20", "background": "#FFFFFF", "borderTop": "1px solid #E8E5F1"',
        '<div className="nl-buybar" style={{"position": "absolute", "left": "0", "right": "0", "bottom": "0", "zIndex": "20", "background": "#FFFFFF", "borderTop": "1px solid #E8E5F1"')
s = rep(s, '"fontSize": "16px", "fontWeight": "700"}}>Tickets</button>', '"fontSize": "16px", "fontWeight": "700"}}>Get tickets</button>')
s = rep(s, '<strong style={{"fontSize": "28px", "color": "#F5A623"}}>', '<strong style={{"fontSize": "28px", "color": "#FFFFFF"}}>', 4)
s = rep(s, '<strong style={{"fontSize": "28px", "color": "#D6308C"}}>', '<strong style={{"fontSize": "28px", "color": "#151035"}}>', 2)
s = rep(s, '"background": "#151035", "color": "#F5A623", "d', '"background": "#151035", "color": "#FFFFFF", "d', 7)
s = rep(s, '<div className="m-bar" style={{"height": "2px", "background": "#F5A623"}} />', '<div className="m-bar" style={{"height": "2px", "background": "#151035"}} />')
lines[li] = s; open(f, 'w').write('\n'.join(lines))
print("ok")

# ---- Nov 25 2026, the owner: the header logo was tiny and showed the 2026 dates: the dateless logo, cropped tight ----
def fix(f, reps):
    lines=open(f).read().split('\n'); i=max(range(len(lines)),key=lambda k:len(lines[k])); s=lines[i]
    for old,new,n in reps:
        assert s.count(old)==n,(f,old[:80],s.count(old)); s=s.replace(old,new)
    lines[i]=s; open(f,'w').write('\n'.join(lines))
O='/Tech_Festival_Canada_Logo_Dark_Transparent.webp'; N='/ttfc-logo-header.png'
fix('src/redesign/approved/ApprovedSite.jsx',[
 (f'<img src="{O}" alt="The Tech Festival Canada" style={{{{"height": "38px", "width": "auto"}}}} />', f'<img src="{N}" alt="The Tech Festival Canada" style={{{{"height": "44px", "width": "auto"}}}} />',1),
 (f'<img src="{O}" alt="The Tech Festival Canada" style={{{{"height": "26px", "width": "auto"}}}} />', f'<img src="{N}" alt="The Tech Festival Canada" style={{{{"height": "22px", "width": "auto"}}}} />',1),
 (f'<img src="{O}" alt="" style={{{{"height": "64px", "width": "auto"}}}} />', f'<img src="{N}" alt="" style={{{{"height": "52px", "width": "auto"}}}} />',1),
 ('<header data-dark="1" style={{"position": "sticky", "top": "0", "zIndex": "20", "background": "#151035", "color": "#FFFFFF"}}><div style={{"maxWidth": "1280px", "margin": "0 auto", "padding": "14px 32px"',
  '<header data-dark="1" style={{"position": "sticky", "top": "0", "zIndex": "20", "background": "#151035", "color": "#FFFFFF"}}><div style={{"maxWidth": "1280px", "margin": "0 auto", "padding": "11px 32px"',1),
])
fix('src/redesign/approved/ApprovedPhone.jsx',[
 (f'<img src="{O}" alt="The Tech Festival Canada" style={{{{"height": "30px", "width": "auto"}}}} />', f'<img src="{N}" alt="The Tech Festival Canada" style={{{{"height": "38px", "width": "auto"}}}} />',1),
 (f'<img src="{O}" alt="" style={{{{"height": "52px", "width": "auto"}}}} />', f'<img src="{N}" alt="" style={{{{"height": "44px", "width": "auto"}}}} />',1),
])
print('ok')
