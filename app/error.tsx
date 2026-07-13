"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-context";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    // The server-side error is already logged by Next itself — this is
    // just so it's visible in the browser console too while debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold">{t.error.heading}</p>
      <p className="text-muted-foreground text-sm">{t.error.body}</p>
      <Button type="button" onClick={() => reset()}>
        {t.error.retry}
      </Button>
    </div>
  );
}
