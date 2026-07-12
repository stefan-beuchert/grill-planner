"use client";

import { useState } from "react";
import { PartyWelcome } from "@/components/party/party-welcome";
import { useStoredParticipant } from "@/lib/hooks/use-stored-participant";
import type { Locale } from "@/lib/i18n/locales";

export function PartyShell({
  slug,
  title,
  startsAt,
  location,
  locale,
  children,
}: {
  slug: string;
  title: string;
  startsAt: Date;
  location: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const stored = useStoredParticipant(slug);
  // Set once a first-time visitor chooses "just looking" — lets them browse
  // read-only without joining, for the rest of this page view. Not
  // persisted: revisiting later shows the welcome screen again, since
  // they still haven't joined.
  const [browsing, setBrowsing] = useState(false);

  if (!stored && !browsing) {
    return (
      <PartyWelcome
        slug={slug}
        title={title}
        startsAt={startsAt}
        location={location}
        locale={locale}
        onBrowse={() => setBrowsing(true)}
      />
    );
  }

  return <>{children}</>;
}
