-- Rerun-safe lot seeding needs a unique key to upsert on.
CREATE UNIQUE INDEX "Lot_name_key" ON "Lot"("name");
