import { useEffect, useMemo, useState } from "react";
import { Building2, Star } from "lucide-react";
import { useStore } from "../lib/store";
import { refreshCMS } from "../lib/cms";
import { content, text } from "../lib/content";
import { refreshOrganisations, useOrganisations } from "../lib/orgs";
import { Chip, Spinner, TopBar } from "../components/ui";
import { FeaturedRow, OrgGrid, PartnerSheet } from "../components/Orgs";

/* Every attending organisation (GET /api/app/organisations, lib/orgs.js): the
   Featured Partners as one compact row that scrolls sideways, then straight
   away "In attendance": filter by topic or kind and a dense grid of logo tiles,
   three across on a phone, so the first ones show without scrolling past the
   sponsors (Oct 21 2026). A tap opens the partner sheet: what they are, who
   from there is coming, their website. */

/** iOS PartnersSection.topicFilters / kindFilters. */
const TOPIC_FILTERS = [
  ["AI", "Artificial Intelligence"], ["Cybersecurity", "Cybersecurity"], ["Quantum", "Quantum Computing"],
  ["Robotics", "Robotics & Automation"], ["Finance", "Banking, Financial Services & Insurance"],
  ["Healthcare", "Healthcare & Lifesciences"], ["Supply chain", "Supply Chain, Manufacturing & Infrastructure"],
  ["Sustainability", "Sustainability & CleanTech"], ["Energy", "Energy & Utilities"], ["Defence", "Defence & Public Safety"],
];
const KIND_FILTERS = ["Government", "Startups", "Academia & research", "Associations"];
const FILTERS = ["All", ...TOPIC_FILTERS.map(([l]) => l), ...KIND_FILTERS];

export default function Organisations() {
  const ct = useStore(content);
  const { featured, attending, loaded } = useOrganisations();
  const [filter, setFilter] = useState("All");
  const [opened, setOpened] = useState(null);
  useEffect(() => { refreshCMS(); refreshOrganisations(); }, []);

  const visible = useMemo(() => {
    if (filter === "All") return attending;
    const t = TOPIC_FILTERS.find(([l]) => l === filter);
    return t ? attending.filter((p) => p.topics.includes(t[1])) : attending.filter((p) => p.categoryLabel === filter);
  }, [attending, filter]);

  return (
    <div className="page">
      <TopBar title="Organisations" />
      <main id="main" className="stack-lg" style={{ paddingTop: 12 }}>
        {featured.length > 0 && (
          <section className="stack-sm" aria-labelledby="g-sponsors">
            <h2 id="g-sponsors" className="pad section-h row sponsor-h"><Star aria-hidden="true" /> Featured Partners</h2>
            <FeaturedRow list={featured} onOpen={setOpened} />
          </section>
        )}
        <section className="pad stack" aria-labelledby="g-attending">
          <h2 id="g-attending" className="attending-h">
            <Building2 aria-hidden="true" />{text(ct, "home.partners_title", "In attendance")}
            {attending.length > 0 && <span className="attending-count figure">{attending.length}</span>}
          </h2>
          <div className="chips" role="group" aria-label="Filter organisations" style={{ margin: "0 -16px" }}>
            {FILTERS.map((f) => <Chip key={f} on={filter === f} onClick={() => setFilter(f)}>{f}</Chip>)}
          </div>
          {!loaded ? <Spinner /> : visible.length === 0 ? (
            <p className="muted" style={{ margin: 0, padding: "18px 0", fontSize: 13 }}>No partners tagged {filter} yet.</p>
          ) : <OrgGrid list={visible} onOpen={setOpened} />}
        </section>
      </main>
      {opened && <PartnerSheet p={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}
