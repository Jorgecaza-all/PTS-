// Seeds the Lot table with real UT lots/garages pulled from the campus parking map + spec.
// Run with: npx prisma db seed  (after adding `"prisma": {"seed": "ts-node prisma/seed.ts"}` to package.json,
// or convert this to a .js/.mjs script if you'd rather skip ts-node — Claude Code can wire this however fits.)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GARAGES = [
  { name: "BRG - Brazos Garage" },
  { name: "CCG - Conference Center Garage" },
  { name: "ECG - East Campus Garage" }, // confirmed to exist; missing from the map PDF on file
  { name: "GUG - Guadalupe Garage" },
  { name: "HCG - Health Center Garage" }, // confirmed to exist; missing from the map PDF on file
  { name: "MAG - Manor Garage" },
  { name: "SAG - San Antonio Garage" },
  { name: "SJG - San Jacinto Garage" },
  { name: "SWG - Speedway Garage" },
  { name: "TRG - Trinity Garage" },
  { name: "TSG - 27th Street Garage" },
];

// Numbered open lots confirmed against both the wireframes and the hand-annotated map.
// TODO: confirm this is the complete list with UT Parking & Transportation — these are just the ones seen so far.
const OPEN_LOTS = ["Lot 37", "Lot 38", "Lot 39", "Lot 40", "Lot 118", "LHN - Longhorn Lot (Baseball/Softball area)"];

async function main() {
  for (const g of GARAGES) {
    await prisma.lot.create({ data: { name: g.name, accessType: "GATE_ACCESS" } });
  }
  for (const name of OPEN_LOTS) {
    await prisma.lot.create({ data: { name, accessType: "OPEN_LOT" } });
  }
  console.log("Seeded lots.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
