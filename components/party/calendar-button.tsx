import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function CalendarButton({ slug, t }: { slug: string; t: Dictionary }) {
  return (
    <Button
      variant="secondary"
      render={<a href={`/party/${slug}/calendar.ics`} download />}
      nativeButton={false}
      className="h-12 w-full text-base"
    >
      {t.calendar.addButton}
    </Button>
  );
}
