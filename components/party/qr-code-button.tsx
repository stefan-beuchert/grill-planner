"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n/locale-context";

export function QrCodeButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setUrl(window.location.href);
          setOpen(true);
        }}
        className="h-12 w-full text-base"
      >
        {t.qrCode.button}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.qrCode.dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {url && <QRCodeSVG value={url} size={220} />}
            <p className="text-muted-foreground text-center text-sm">{t.qrCode.dialogHint}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
