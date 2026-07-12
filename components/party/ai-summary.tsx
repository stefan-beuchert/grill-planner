"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { generateAiSummary } from "@/lib/actions/ai-summary";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

function relativeTime(
  date: Date,
  t: {
    justNow: string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
    daysAgo: (n: number) => string;
  },
): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return t.justNow;
  if (diffMin < 60) return t.minutesAgo(diffMin);
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  return t.daysAgo(Math.floor(diffHours / 24));
}

export function AiSummary({
  slug,
  recap,
  openPoints,
  generatedAt,
}: {
  slug: string;
  recap: string | null;
  openPoints: string[];
  generatedAt: Date | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!stored) return;
    setBusy(true);
    setError(null);
    const result = await generateAiSummary(slug, stored.participantId, stored.editToken);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function copyOpenPoints() {
    await navigator.clipboard.writeText(openPoints.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!stored) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3">
      <SectionHeading icon={Sparkles}>{t.aiSummary.heading}</SectionHeading>

      {!generatedAt ? (
        <>
          <p className="text-muted-foreground text-sm">{t.aiSummary.intro}</p>
          <Button type="button" disabled={busy} onClick={generate} className="h-11">
            {busy ? t.aiSummary.generating : t.aiSummary.generateButton}
          </Button>
        </>
      ) : (
        <>
          <p className="text-base whitespace-pre-wrap">{recap}</p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t.aiSummary.openPointsHeading}</span>
              {openPoints.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyOpenPoints}
                  className="gap-1.5"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? t.aiSummary.copied : t.aiSummary.copyButton}
                </Button>
              )}
            </div>
            {openPoints.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t.aiSummary.noOpenPoints}</p>
            ) : (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {openPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">
              {t.aiSummary.generatedAgo(relativeTime(generatedAt, t.aiSummary))}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={generate}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              {busy ? t.aiSummary.generating : t.aiSummary.refreshButton}
            </Button>
          </div>
        </>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
