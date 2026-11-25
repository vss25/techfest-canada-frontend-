# Event naming and the Home entry in the event menu (Nov 25 2026, the owner): "City Briefing" / "National Festival"
# everywhere on the boards, and the header's event menu becomes Home, then City Briefings (the five cities), then
# National Festival (Toronto, November 2027). Already applied. Re-run only on freshly regenerated boards, after patches 1 to 3:
#   python3 tools/newlook_patch4.py src/redesign/approved
import re, sys
ROOT = sys.argv[1]

def rep(s, old, new, count=1):
    n = s.count(old)
    assert n == count, f"expected {count} of {old[:90]!r}, found {n}"
    return s.replace(old, new)

def wording(s):
    s = s.replace('Main Event', 'National Festival')
    # Toronto 2027 is in November (the boards said October).
    s = s.replace("month: 'Oct', date: 'October 2027'", "month: 'Nov', date: 'November 2027'").replace('Awards Night · Toronto, Oct 2027', 'Awards Night · Toronto, Nov 2027')
    s = s.replace('Oct 2027 · National Festival', 'Nov 2027 · National Festival').replace('National Festival in October 2027.', 'National Festival in November 2027.').replace('</strong> · October 2027, Toronto<br />', '</strong> · November 2027, Toronto<br />')
    return re.sub(r'(?<!City )Briefing', 'City Briefing', s)

HEAD = '{m.head ? <span style={{"marginTop": "4px", "padding": "10px 12px 4px", "fontSize": "11px", "fontWeight": "700", "letterSpacing": "0.1em", "textTransform": "uppercase", "color": "#52525B"}}>{m.label}</span> : '

# ---------------- desktop ----------------
f = ROOT + '/ApprovedSite.jsx'
s = wording(open(f).read())
OLD = '<span style={{"padding": "8px 12px 4px", "fontSize": "12px", "fontWeight": "600", "color": "#52525B"}}>2027 season</span>{(v.menuItems || []).map((m, m__i) => (<React.Fragment key={m__i}><a href="#" role="menuitem" className="p-press" onClick={m.pick} style={css(`padding: 9px 12px; border-radius: 8px; text-decoration: none; display: flex; justify-content: space-between; background: ${m.bg}`)}><span style={css(`font-weight: ${m.weight}`)}>{m.label}</span><span style={{"color": "#52525B"}}>{m.month}</span></a></React.Fragment>))}'
NEW = ('<a href="#" role="menuitem" className="p-press" onClick={v.goHome} style={css(`padding: 9px 12px; border-radius: 8px; text-decoration: none; display: flex; justify-content: space-between; background: ${v.isHome ? "#F5F3FA" : "transparent"}`)}><span style={css(`font-weight: ${v.isHome ? 700 : 400}`)}>Home</span><span style={{"color": "#52525B"}}>2027 season</span></a>'
       '{(v.menuItems || []).map((m, m__i) => (<React.Fragment key={m__i}>' + HEAD +
       '<a href="#" role="menuitem" className="p-press" onClick={m.pick} style={css(`padding: 9px 12px; border-radius: 8px; text-decoration: none; display: flex; justify-content: space-between; background: ${m.bg}`)}><span style={css(`font-weight: ${m.weight}`)}>{m.label}</span><span style={{"color": "#52525B"}}>{m.month}</span></a>}</React.Fragment>))}')
s = rep(s, OLD, NEW)
open(f, 'w').write(s)

# ---------------- phone ----------------
f = ROOT + '/ApprovedPhone.jsx'
s = wording(open(f).read())
OLD = '<span style={{"fontSize": "12px", "fontWeight": "600", "color": "#52525B", "padding": "4px 0"}}>2027 season</span>{(v.cities || []).map((c, c__i) => (<React.Fragment key={c__i}><a href="#" className="m-press" onClick={c.go} style={css(`min-height: 48px; padding: 0 14px; border-radius: 10px; background: ${c.bg}; text-decoration: none; display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: ${c.weight}`)}><span>{c.label}</span><span style={{"fontSize": "13px", "color": "#52525B"}}>{c.tag}</span></a></React.Fragment>))}'
PHEAD = '{c.head ? <span style={{"marginTop": "8px", "fontSize": "11px", "fontWeight": "700", "letterSpacing": "0.1em", "textTransform": "uppercase", "color": "#52525B", "padding": "4px 0"}}>{c.label}</span> : '
NEW = ('<a href="#" className="m-press" onClick={v.goHome} style={css(`min-height: 48px; padding: 0 14px; border-radius: 10px; background: ${v.isHome ? "#F5F3FA" : "transparent"}; text-decoration: none; display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: ${v.isHome ? 700 : 400}`)}><span>Home</span><span style={{"fontSize": "13px", "color": "#52525B"}}>2027 season</span></a>'
       '{(v.cities || []).map((c, c__i) => (<React.Fragment key={c__i}>' + PHEAD +
       '<a href="#" className="m-press" onClick={c.go} style={css(`min-height: 48px; padding: 0 14px; border-radius: 10px; background: ${c.bg}; text-decoration: none; display: flex; align-items: center; justify-content: space-between; font-size: 16px; font-weight: ${c.weight}`)}><span>{c.label}</span><span style={{"fontSize": "13px", "color": "#52525B"}}>{c.tag}</span></a>}</React.Fragment>))}')
s = rep(s, OLD, NEW)
open(f, 'w').write(s)
print('ok')

# ---- Home › Agenda highlights: the new section with an event picker (boards keep theirs as the fallback) ----
import io
for name, old in (('/ApprovedSite.jsx', 'k === "agenda" ? (<section id="p-agenda" className="nl-stage" style='),
                  ('/ApprovedPhone.jsx', 'k === "agenda" ? (<section className="nl-stage" style={{"background": "#F5F3FA"')):
    f = ROOT + name
    s = open(f).read()
    s = rep(s, old, old.replace('k === "agenda" ? (', 'k === "agenda" ? (v.homeAgenda || '))
    open(f, 'w').write(s)
print('ok agenda')
