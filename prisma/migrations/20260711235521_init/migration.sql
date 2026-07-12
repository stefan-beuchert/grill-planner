-- CreateEnum
CREATE TYPE "DrinkType" AS ENUM ('BEER', 'SOFT_DRINK', 'WINE', 'OTHER');

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "editToken" TEXT NOT NULL,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "seatsFree" INTEGER,
    "needsRide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_selections" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "food_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drink_selections" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "type" "DrinkType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "drink_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parties_slug_key" ON "parties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "participants_editToken_key" ON "participants"("editToken");

-- CreateIndex
CREATE INDEX "participants_partyId_idx" ON "participants"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "food_items_partyId_name_key" ON "food_items"("partyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "food_selections_participantId_foodItemId_key" ON "food_selections"("participantId", "foodItemId");

-- CreateIndex
CREATE UNIQUE INDEX "drink_selections_participantId_type_key" ON "drink_selections"("participantId", "type");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_selections" ADD CONSTRAINT "food_selections_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_selections" ADD CONSTRAINT "food_selections_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drink_selections" ADD CONSTRAINT "drink_selections_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
