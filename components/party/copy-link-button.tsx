"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-context";

export function CopyLinkButton() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleCopy}
      className="h-12 w-full text-base"
    >
      {copied ? t.copyLink.copied : t.copyLink.copy}
    </Button>
  );
}
