-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "scannedByParticipantId" TEXT,
    "store" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_line_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,

    CONSTRAINT "receipt_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_partyId_idx" ON "receipts"("partyId");

-- CreateIndex
CREATE INDEX "receipt_line_items_receiptId_idx" ON "receipt_line_items"("receiptId");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_scannedByParticipantId_fkey" FOREIGN KEY ("scannedByParticipantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line_items" ADD CONSTRAINT "receipt_line_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
