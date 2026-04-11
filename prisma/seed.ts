import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

// NYU Schools with their codes
const schools = [
  { code: "UA", name: "College of Arts and Science" },
  { code: "UY", name: "Tandon School of Engineering" },
  { code: "UB", name: "Stern School of Business" },
  { code: "UE", name: "Steinhardt School of Culture, Education, and Human Development" },
  { code: "UF", name: "Liberal Studies" },
  { code: "UH", name: "Abu Dhabi" },
  { code: "UC", name: "School of Professional Studies" },
  { code: "UT", name: "Tisch School of the Arts" },
  { code: "UK", name: "Shanghai" },
  { code: "UL", name: "Gallatin School of Individualized Study" },
  { code: "UP", name: "Silver School of Social Work" },
  { code: "UM", name: "Rory Meyers College of Nursing" },
  { code: "GA", name: "Graduate School of Arts and Science" },
  { code: "GB", name: "Stern School of Business (Graduate)" },
  { code: "GE", name: "Steinhardt (Graduate)" },
  { code: "GH", name: "Abu Dhabi (Graduate)" },
  { code: "GI", name: "Institute of Fine Arts" },
  { code: "GL", name: "School of Law" },
  { code: "GM", name: "School of Medicine" },
  { code: "GP", name: "Robert F. Wagner Graduate School of Public Service" },
  { code: "GT", name: "Tisch School of the Arts (Graduate)" },
  { code: "GU", name: "Courant Institute of Mathematical Sciences" },
  { code: "GY", name: "Tandon School of Engineering (Graduate)" },
  { code: "DN", name: "College of Dentistry" },
  { code: "ML", name: "School of Medicine (Clinical)" },
];

async function main() {
  console.log("Seeding schools...");

  for (const school of schools) {
    await prisma.school.upsert({
      where: { code: school.code },
      update: { name: school.name },
      create: school,
    });
  }

  console.log(`Seeded ${schools.length} schools.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
