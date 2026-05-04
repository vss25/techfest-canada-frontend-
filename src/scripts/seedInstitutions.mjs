import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "021qtoci",
  dataset: process.env.SANITY_DATASET || "production",
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const institutions = [
  {
    _type: "institutionMarquee",
    name: "University of Toronto",
    url: "https://www.utoronto.ca",
    order: 1,
    active: true,
  },
  {
    _type: "institutionMarquee",
    name: "University of Waterloo",
    url: "https://uwaterloo.ca",
    order: 2,
    active: true,
  },
  {
    _type: "institutionMarquee",
    name: "McGill University",
    url: "https://www.mcgill.ca",
    order: 3,
    active: true,
  },
  {
    _type: "institutionMarquee",
    name: "University of British Columbia",
    url: "https://www.ubc.ca",
    order: 4,
    active: true,
  },
  {
    _type: "institutionMarquee",
    name: "University of Alberta",
    url: "https://www.ualberta.ca",
    order: 5,
    active: true,
  },
];

async function seed() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error("Missing SANITY_WRITE_TOKEN environment variable");
    process.exit(1);
  }

  console.log(`Seeding ${institutions.length} institutions...`);

  for (const institution of institutions) {
    const result = await client.create(institution);
    console.log(`Created: ${institution.name} (ID: ${result._id})`);
  }

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
