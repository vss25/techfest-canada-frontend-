import { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, Link as LinkIcon, LogIn, MapPin, Ticket, User, Users } from "lucide-react";
import { useStore } from "../lib/store";
import { auth, isSignedIn, signOut } from "../lib/auth";
import { appliedBy, awards, loadApplications, matchesApplication, roleLine, websiteOf } from "../lib/awards";
import { Button, DoneButton, Empty, Sheet, Spinner, TopBar } from "../components/ui";
import { SearchField } from "../components/Filters";

/* =========================================================
   Catalyst Awards › Applications (Oct 21 2026; the organiser:
   "the list of companies/individuals, their basic details and
   the name of the applicant. Do not show which categories they
   applied for."). GET /api/app/awards/applications, pass
   holders only: the nominee, what they are (person, organisation
   or team), title · organisation, where, their website, and who
   applied ("Self-nominated" when it was themselves). A tap opens
   the same details in a small sheet; nothing else is shown.
========================================================= */

const TYPE = {
  Individual: { icon: User, label: "Individual" },
  Organisation: { icon: Building2, label: "Organisation" },
  "Team / Project": { icon: Users, label: "Team / Project" },
};
const typeOf = (item) => TYPE[item?.nomineeType] || TYPE.Individual;

function TypeIcon({ item }) {
  const t = typeOf(item);
  const Icon = t.icon;
  return <span className="app-type" role="img" aria-label={t.label} title={t.label}><Icon aria-hidden="true" /></span>;
}

function Row({ item, onOpen }) {
  const role = roleLine(item);
  const by = appliedBy(item);
  const web = websiteOf(item);
  return (
    <button type="button" className="app-row pressable" onClick={() => onOpen(item)}>
      <TypeIcon item={item} />
      <span className="app-row-main">
        <span className="row" style={{ gap: 6 }}>
          <b className="app-name">{item.nomineeName}</b>
          {web && <LinkIcon aria-label="Has a website" role="img" className="app-web" />}
        </span>
        {role && <span className="app-line ellipsis">{role}</span>}
        {item.nomineeLocation && <span className="app-line ellipsis"><MapPin aria-hidden="true" />{item.nomineeLocation}</span>}
        {by && <span className="app-by">{by}</span>}
      </span>
    </button>
  );
}

function Detail({ item, onClose }) {
  const t = typeOf(item);
  const web = websiteOf(item);
  const by = appliedBy(item);
  return (
    <Sheet open onClose={onClose} title={item.nomineeName} medium actions={{ right: <DoneButton onClick={onClose} /> }}>
      <div className="sheet-body stack app-detail">
        <div className="row" style={{ gap: 10 }}><TypeIcon item={item} /><span className="small bold">{t.label}</span></div>
        <dl className="app-fields">
          {item.nomineeTitle && <><dt>Title</dt><dd>{item.nomineeTitle}</dd></>}
          {item.nomineeOrganisation && <><dt>Organisation</dt><dd>{item.nomineeOrganisation}</dd></>}
          {item.nomineeLocation && <><dt>Location</dt><dd>{item.nomineeLocation}</dd></>}
          {web && <><dt>Website</dt><dd><a href={web} target="_blank" rel="noopener noreferrer">{web.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}</a></dd></>}
          {by && <><dt>Applicant</dt><dd>{item.selfNominated ? "Self-nominated" : String(item.applicantName).trim()}</dd></>}
        </dl>
      </div>
    </Sheet>
  );
}

export default function AwardApplications() {
  const a = useStore(auth);
  const { list, listError, listStatus, listCode } = useStore(awards);
  const signedIn = isSignedIn(a);
  const [q, setQ] = useState("");
  const [opened, setOpened] = useState(null);
  useEffect(() => { if (signedIn) loadApplications(); }, [signedIn]);

  const items = useMemo(() => {
    const all = list?.enabled ? list.items.filter((x) => x && x.nomineeName) : [];
    return all.filter((x) => matchesApplication(x, q));
  }, [list, q]);

  let body;
  if (!signedIn || listStatus === 401) {
    body = (
      <Empty icon={LogIn} title="Sign in to see applications" action={<Button variant="primary" onClick={() => signOut()}>Sign in</Button>} />
    );
  } else if (listStatus === 403 && listCode === "no_pass") {
    body = <Empty icon={Ticket} title="Applications are for pass holders" />;
  } else if (!list && listError) {
    body = <Empty icon={ClipboardList} title="Couldn't load the applications" action={<Button onClick={() => loadApplications()}>Try again</Button>}>{listError}</Empty>;
  } else if (!list) {
    body = <Spinner label="Loading applications" />;
  } else if (!list.enabled || !list.items.length) {
    body = <Empty icon={ClipboardList} title="No applications yet" />;
  } else {
    body = (
      <div className="stack">
        <div className="pad"><SearchField value={q} onChange={setQ} placeholder="Search applications" /></div>
        {items.length === 0 ? <div className="empty-note"><ClipboardList aria-hidden="true" />No applications match that.</div> : (
          <div className="pad stack-sm" style={{ gap: 10 }}>{items.map((x) => <Row key={x.id} item={x} onOpen={setOpened} />)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <TopBar title="Applications" />
      <main id="main" style={{ paddingTop: 12 }}>{body}</main>
      {opened && <Detail item={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
