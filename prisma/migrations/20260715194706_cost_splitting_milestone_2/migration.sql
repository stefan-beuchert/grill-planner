-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "paidByParticipantId" TEXT;

-- CreateTable
CREATE TABLE "receipt_line_item_splits" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,

    CONSTRAINT "receipt_line_item_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipt_line_item_splits_participantId_idx" ON "receipt_line_item_splits"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_line_item_splits_lineItemId_participantId_key" ON "receipt_line_item_splits"("lineItemId", "participantId");

-- CreateIndex
CREATE INDEX "receipts_paidByParticipantId_idx" ON "receipts"("paidByParticipantId");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paidByParticipantId_fkey" FOREIGN KEY ("paidByParticipantId") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line_item_splits" ADD CONSTRAINT "receipt_line_item_splits_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "receipt_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_line_item_splits" ADD CONSTRAINT "receipt_line_item_splits_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every ReceiptLineItem that existed before this table did gets
-- a split row for every participant currently in that line item's party.
INSERT INTO "receipt_line_item_splits" ("id", "lineItemId", "participantId")
SELECT md5(rli."id" || p."id"), rli."id", p."id"
FROM "receipt_line_items" rli
JOIN "receipts" r ON r."id" = rli."receiptId"
JOIN "participants" p ON p."partyId" = r."partyId";
