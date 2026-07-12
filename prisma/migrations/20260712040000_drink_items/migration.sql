-- Drop old fixed-category drink model
ALTER TABLE "drink_selections" DROP CONSTRAINT IF EXISTS "drink_selections_participantId_fkey";
DROP INDEX IF EXISTS "drink_selections_participantId_type_key";
DELETE FROM "drink_selections";
ALTER TABLE "drink_selections" DROP COLUMN "type";
DROP TYPE IF EXISTS "DrinkType";

-- CreateTable
CREATE TABLE "drink_items" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drink_items_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "drink_selections" ADD COLUMN "drinkItemId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drink_items_partyId_name_key" ON "drink_items"("partyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "drink_selections_participantId_drinkItemId_key" ON "drink_selections"("participantId", "drinkItemId");

-- AddForeignKey
ALTER TABLE "drink_items" ADD CONSTRAINT "drink_items_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_selections" ADD CONSTRAINT "drink_selections_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_selections" ADD CONSTRAINT "drink_selections_drinkItemId_fkey" FOREIGN KEY ("drinkItemId") REFERENCES "drink_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
