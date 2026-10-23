/** How long a volunteer can undo their own tap (the server allows a little more for the round trip). */
export const UNDO_MS = 15000;

/** The kitchen needs these first (allergies, then diets). */
export const DIETARY_LABELS = Object.freeze({
  nut_allergy: "Nut allergy", shellfish_allergy: "Shellfish allergy", gluten_free: "Gluten-free", dairy_free: "Dairy-free",
  vegan: "Vegan", vegetarian: "Vegetarian", halal: "Halal", kosher: "Kosher", other: "Other",
});
export const ALLERGY_KEYS = Object.freeze(["nut_allergy", "shellfish_allergy", "gluten_free", "dairy_free"]);
export const DIETARY_ORDER = Object.freeze(["nut_allergy", "shellfish_allergy", "gluten_free", "dairy_free", "vegan", "vegetarian", "halal", "kosher", "other"]);

/** The pass extras, as the desk shows them. */
export const EXTRA_LABELS = Object.freeze({ cxo: "CxO Breakfast", lunch: "Luncheons", awards: "Awards Night", gala: "Gala Dinner" });
export const EXTRA_ORDER = Object.freeze(["cxo", "lunch", "awards", "gala"]);
