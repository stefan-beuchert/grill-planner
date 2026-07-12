/*
  Warnings:

  - You are about to drop the `drink_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drink_selections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `food_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `food_selections` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ItemListType" AS ENUM ('SHARED_PURCHASE', 'BRING_YOUR_OWN');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('FOOD', 'DRINK', 'OTHER');

-- DropForeignKey
ALTER TABLE "drink_items" DROP CONSTRAINT "drink_items_partyId_fkey";

-- DropForeignKey
ALTER TABLE "drink_selections" DROP CONSTRAINT "drink_selections_drinkItemId_fkey";

-- DropForeignKey
ALTER TABLE "drink_selections" DROP CONSTRAINT "drink_selections_participantId_fkey";

-- DropForeignKey
ALTER TABLE "food_items" DROP CONSTRAINT "food_items_partyId_fkey";

-- DropForeignKey
ALTER TABLE "food_selections" DROP CONSTRAINT "food_selections_foodItemId_fkey";

-- DropForeignKey
ALTER TABLE "food_selections" DROP CONSTRAINT "food_selections_participantId_fkey";

-- AlterTable
ALTER TABLE "parties" ADD COLUMN     "note" TEXT;

-- DropTable
DROP TABLE "drink_items";

-- DropTable
DROP TABLE "drink_selections";

-- DropTable
DROP TABLE "food_items";

-- DropTable
DROP TABLE "food_selections";

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "listType" "ItemListType" NOT NULL,
    "category" "ItemCategory",
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "purchasedByParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_partyId_idx" ON "items"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "items_partyId_listType_name_key" ON "items"("partyId", "listType", "name");

-- CreateIndex
CREATE INDEX "contributions_participantId_idx" ON "contributions"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "contributions_itemId_participantId_key" ON "contributions"("itemId", "participantId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_purchasedByParticipantId_fkey" FOREIGN KEY ("purchasedByParticipantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
