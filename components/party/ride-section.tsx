"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import { setRideStatus } from "@/lib/actions/ride";
import { SectionHeading } from "@/components/party/section-heading";
import { useI18n } from "@/lib/i18n/locale-context";

type Participant = {
  id: string;
  name: string;
  isDriver: boolean;
  seatsFree: number | null;
  needsRide: boolean;
};

type Status = "driving" | "needsRide" | "none";

function statusOf(p: Pick<Participant, "isDriver" | "needsRide">): Status {
  if (p.isDriver) return "driving";
  if (p.needsRide) return "needsRide";
  return "none";
}

export function RideSection({
  slug,
  participants,
}: {
  slug: string;
  participants: Participant[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const stored = useStoredParticipant(slug);
  const [busy, setBusy] = useState(false);

  const me = participants.find((p) => p.id === stored?.participantId) ?? null;
  const drivers = participants.filter((p) => p.isDriver);
  const needers = participants.filter((p) => p.needsRide);
  const totalSeats = drivers.reduce((sum, d) => sum + (d.seatsFree ?? 0), 0);

  const statusLabels: Record<Status, string> = {
    driving: t.rides.driving,
    needsRide: t.rides.needsRide,
    none: t.rides.none,
  };

  async function updateStatus(status: Status, seatsFree?: number) {
    if (!stored) return;
    setBusy(true);
    await setRideStatus(slug, stored.participantId, stored.editToken, { status, seatsFree });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading icon={Car}>{t.rides.heading}</SectionHeading>

      <div className="flex gap-2 text-sm">
        <span className="rounded-full bg-muted px-3 py-1">
          <span className="font-medium">{totalSeats}</span>{" "}
          <span className="text-muted-foreground">{t.rides.seatsOffered}</span>
        </span>
        <span className="rounded-full bg-muted px-3 py-1">
          <span className="font-medium">{needers.length}</span>{" "}
          <span className="text-muted-foreground">{t.rides.needRide}</span>
        </span>
      </div>

      {drivers.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {drivers.map((d) => (
            <li key={d.id}>{t.rides.driverSeats(d.name, d.seatsFree ?? 0)}</li>
          ))}
        </ul>
      )}

      {!stored ? (
        <p className="text-muted-foreground text-sm">{t.rides.joinPrompt}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {(["driving", "needsRide", "none"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                variant={me && statusOf(me) === status ? "default" : "outline"}
                disabled={busy}
                onClick={() => updateStatus(status, status === "driving" ? 1 : undefined)}
                className="h-11 text-sm"
              >
                {statusLabels[status]}
              </Button>
            ))}
          </div>

          {me && statusOf(me) === "driving" && (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-accent px-3 py-2">
              <span className="text-base">{t.rides.freeSeats}</span>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy || (me.seatsFree ?? 0) <= 0}
                  onClick={() => updateStatus("driving", (me.seatsFree ?? 0) - 1)}
                  className="h-11 w-11"
                  aria-label={t.rides.fewerSeatsAria}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-4 text-center text-base tabular-nums">
                  {me.seatsFree ?? 0}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={busy}
                  onClick={() => updateStatus("driving", (me.seatsFree ?? 0) + 1)}
                  className="h-11 w-11"
                  aria-label={t.rides.moreSeatsAria}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
