import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "021qtoci",
  dataset: process.env.SANITY_DATASET || "production",
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const partners = [
  {
    _type: "partner",
    name: "University of Toronto",
    category: "academicResearchInstitutions",
    url: "https://www.utoronto.ca",
    order: 1,
    active: true,
  },
  {
    _type: "partner",
    name: "University of Waterloo",
    category: "academicResearchInstitutions",
    url: "https://uwaterloo.ca",
    order: 2,
    active: true,
  },
  {
    _type: "partner",
    name: "McGill University",
    category: "academicResearchInstitutions",
    url: "https://www.mcgill.ca",
    order: 3,
    active: true,
  },
  {
    _type: "partner",
    name: "Department of Innovation",
    category: "governmentPartners",
    url: "https://www.canada.ca",
    order: 1,
    active: true,
  },
  {
    _type: "partner",
    name: "Sample Corporate Partner",
    category: "corporateEnterprisePartners",
    url: "https://example.com",
    order: 1,
    active: true,
  },
];

async function seed() {
  if (!process.env.SANITY_WRITE_TOKEN) {
    console.error("Missing SANITY_WRITE_TOKEN environment variable");
    process.exit(1);
  }

  console.log(`Seeding ${partners.length} partners...`);

  for (const partner of partners) {
    const result = await client.create(partner);
    console.log(`Created: ${partner.name} (ID: ${result._id})`);
  }

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
