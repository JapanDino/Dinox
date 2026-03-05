import { PrismaClient } from "@prisma/client";
import { loadDemoData } from "../src/data/prisma/demo-seed";

const prisma = new PrismaClient();

async function main() {
  await loadDemoData(prisma);
  console.log("Seed complete: projects, tags and items loaded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
