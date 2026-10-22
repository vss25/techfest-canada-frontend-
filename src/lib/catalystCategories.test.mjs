// The Catalyst Awards lists and the admin "Edit category & focus" form (catalystCategories.js).
// Run: node --test src/lib/catalystCategories.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  PILLARS, SECTORS, SPECIAL_AWARDS, categoryDirty, categoryFilterOptions, categoryOfForm, categoryOptions, categoryPayload, categoryShort,
  changedLine, focusDirty, focusPayload, focusSectorChoices, focusText, formProblem, overrideForm, restoreWhat,
} from "./catalystCategories.js";

const AI = "AI & Machine Learning";
const HEALTH = "Healthcare & Life Sciences";

test("the canonical lists: 5 pillars × 5 sectors, 3 special awards (the backend's names)", () => {
  assert.deepEqual(PILLARS, [AI, "Quantum Computing", "Cybersecurity & Digital Trust", "Robotics & Automation", "CleanTech & Sustainability"]);
  assert.deepEqual(SECTORS, ["Financial Services & Banking", HEALTH, "Energy & Critical Infrastructure", "Manufacturing, Supply Chain & Mobility",
    "Public Sector, Defence & Security"]);
  assert.deepEqual(SPECIAL_AWARDS.map((a) => [a.key, a.label]), [["lifetime", "Lifetime Achievement Award"], ["rising", "Rising Innovator Award"],
    ["crossborder", "Cross-Border Impact Award"]]);
});

test("categoryOptions: the server's lists when it sent them, else the built-in ones", () => {
  assert.deepEqual(categoryOptions().pillars, [...PILLARS]);
  const server = { pillars: ["P1"], sectors: ["S1"], specialAwards: [{ key: "rising", label: "Rising Innovator Award" }] };
  assert.deepEqual(categoryOptions(server), server);
  assert.deepEqual(categoryOptions({ pillars: [], sectors: "x", specialAwards: [null] }).sectors, [...SECTORS]);
});

test("labels: category and focus", () => {
  assert.equal(categoryShort({ categoryType: "matrix", pillar: AI, sector: HEALTH }), `${AI} × ${HEALTH}`);
  assert.equal(categoryShort({ categoryType: "special", specialAward: "crossborder" }), "Cross-Border Impact");
  assert.equal(categoryShort({ categoryType: "special", specialAward: "" }), "Special Recognition");
  assert.equal(focusText({ nomineePillar: AI, nomineeSector: "FinTech" }), `${AI} · FinTech`);
  assert.equal(focusText({ nomineeSector: "FinTech" }), "FinTech");
  assert.equal(focusText({}), "");
});

test("the form: starts from the nomination; names outside the lists start empty", () => {
  const n = { categoryType: "matrix", pillar: "Artificial Intelligence", sector: HEALTH, specialAward: "", nomineeSector: "FinTech", nomineePillar: "" };
  const f = overrideForm(n);
  assert.deepEqual(f, { categoryType: "matrix", pillar: "", sector: HEALTH, specialAward: "", nomineePillar: "", nomineeSector: "FinTech", note: "" });
  assert.equal(formProblem(f), "Choose a pillar.");
  assert.equal(categoryDirty(f, n), true);
  assert.equal(focusDirty(f, n), false);
  assert.deepEqual(focusSectorChoices("FinTech").at(-1), { value: "FinTech", label: "FinTech (as typed on the form)" });
  assert.equal(focusSectorChoices(HEALTH).length, 6); // None + 5
  assert.equal(focusSectorChoices("").length, 6);
});

test("dirty checks, problems and the request bodies", () => {
  const n = { categoryType: "matrix", pillar: AI, sector: HEALTH, specialAward: "", nomineeSector: "", nomineePillar: "" };
  const f = overrideForm(n);
  assert.equal(categoryDirty(f, n), false);
  assert.equal(formProblem(f), "");
  const special = { ...f, categoryType: "special" };
  assert.equal(categoryDirty(special, n), true);
  assert.equal(formProblem(special), "Choose a special award.");
  const rising = { ...special, specialAward: "rising", note: "  Better fit  " };
  assert.deepEqual(categoryOfForm(rising), { categoryType: "special", pillar: "", sector: "", specialAward: "rising" });
  assert.deepEqual(categoryPayload(rising), { categoryType: "special", specialAward: "rising", note: "Better fit" });
  assert.deepEqual(categoryPayload({ ...f, sector: "Financial Services & Banking" }), { categoryType: "matrix", pillar: AI, sector: "Financial Services & Banking" });
  assert.equal(categoryDirty({ ...f, sector: "Financial Services & Banking" }, n), true);
  // Switching the toggle back keeps the matrix values: not dirty.
  assert.equal(categoryDirty({ ...rising, categoryType: "matrix" }, n), false);
  const focus = { ...f, nomineePillar: "Quantum Computing" };
  assert.equal(focusDirty(focus, n), true);
  assert.deepEqual(focusPayload(focus), { nomineePillar: "Quantum Computing", nomineeSector: "" });
  assert.deepEqual(focusPayload({ ...focus, note: "x" }), { nomineePillar: "Quantum Computing", nomineeSector: "", note: "x" });
});

test("the changed line, what a restore puts back, the category filter with counts", () => {
  assert.equal(changedLine("Mia Example", "Oct 22, 2026", `${AI} × ${HEALTH}`), `Changed by Mia Example, Oct 22, 2026 · submitted as ${AI} × ${HEALTH}`);
  assert.equal(changedLine("", "", ""), "Changed by staff · submitted as none");
  assert.equal(restoreWhat({ categoryChanged: true, focusChanged: true }), "both");
  assert.equal(restoreWhat({ categoryChanged: true }), "category");
  assert.equal(restoreWhat({ focusChanged: true }), "focus");
  assert.equal(restoreWhat({}), "");
  const rows = [{ category: "B" }, { category: "A" }, { category: "B" }];
  assert.deepEqual(categoryFilterOptions(rows), [{ value: "A", label: "A (1)" }, { value: "B", label: "B (2)" }]);
  assert.deepEqual(categoryFilterOptions(rows, "C").at(-1), { value: "C", label: "C (0)" });
});
