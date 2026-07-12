import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  icon: Icon,
  title,
  count,
  defaultOpen = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-base font-semibold">
          <Icon className="size-4.5 text-primary" aria-hidden="true" />
          {title}
          {typeof count === "number" && (
            <span className="text-muted-foreground text-sm font-normal">({count})</span>
          )}
        </span>
        <ChevronDown
          className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="flex flex-col gap-3 border-t px-3 pt-3 pb-3">{children}</div>
    </details>
  );
}
