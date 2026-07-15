"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/party/section-heading";
import { ReceiptCard, type ReceiptData } from "@/components/party/receipt-card";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { scanReceipt } from "@/lib/actions/receipt";
import { useI18n } from "@/lib/i18n/locale-context";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

// Resizes and re-encodes the captured photo entirely client-side (canvas ->
// JPEG data URL) before it ever leaves the browser — keeps the Server
// Action payload small and avoids persisting/uploading the original photo
// anywhere. The photo itself is never sent anywhere but this one request;
// see prisma/schema.prisma's Receipt doc-comment for why it isn't stored.
async function resizeImageToBase64(file: File): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const bitmap = await createImageBitmapFromFile(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { base64, mimeType: "image/jpeg" };
}

async function createImageBitmapFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function ReceiptSection({
  slug,
  receipts,
  participants,
}: {
  slug: string;
  receipts: ReceiptData[];
  participants: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !stored) return;

    setError(null);
    setScanning(true);
    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const result = await scanReceipt(slug, stored.participantId, stored.editToken, base64, mimeType);
      if (!result.success) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError(t.receipt.extractionFailed);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={ReceiptIcon}>{t.receipt.heading}</SectionHeading>
      <p className="text-muted-foreground text-sm">{t.receipt.hint}</p>

      {!stored ? (
        <p className="text-muted-foreground text-sm">{t.receipt.joinPrompt}</p>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            type="button"
            disabled={scanning}
            onClick={() => fileInputRef.current?.click()}
            className="h-12 gap-2 text-base"
          >
            <Camera className="size-4" />
            {scanning ? t.receipt.scanning : t.receipt.scanButton}
          </Button>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </>
      )}

      {receipts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t.receipt.empty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {receipts.map((receipt) => (
            <ReceiptCard key={receipt.id} slug={slug} receipt={receipt} participants={participants} />
          ))}
        </div>
      )}
    </div>
  );
}
