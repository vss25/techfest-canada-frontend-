import React from "react";
import { InteractiveGlobe } from "../../components/ui/interactive-globe";

/* The festival's 5 × 5 as it is on the production home page (src/components/AboutUs.tsx): the five tech pillars
   on one side, the five applied sectors on the other, and the rotating interactive globe between them with its
   turning ring. Shown beside "Next up" on the new home page (Nov 25 2026, the owner: "add the 5*5 matrix animation
   that is currently there on production"). Loaded on demand (NewLook.jsx), the static grid shows meanwhile. */
const PILLARS = ["Artificial Intelligence", "Quantum Computing", "Cybersecurity & Digital Trust", "Robotics & Automation", "Sustainability & CleanTech"];
const SECTORS = ["Healthcare & Lifesciences", "Banking, Financial Services & Insurance", "Supply Chain, Manufacturing & Infrastructure", "Defence & Public Safety", "Energy & Utilities"];

export default function PillarGlobe() {
  return (
    <div className="nx-globe">
      <div className="nx-globe-col">
        <span className="nx-globe-h p"><i aria-hidden="true" />5 tech pillars</span>
        <ul>{PILLARS.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <div className="nx-globe-mid">
        <span className="nx-globe-ring" aria-hidden="true" />
        <InteractiveGlobe size={280} isDarkMode autoRotateSpeed={0.0012} />
      </div>
      <div className="nx-globe-col r">
        <span className="nx-globe-h s">5 applied sectors<i aria-hidden="true" /></span>
        <ul>{SECTORS.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
