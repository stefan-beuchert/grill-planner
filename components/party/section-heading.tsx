import type { LucideIcon } from "lucide-react";

export function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      {children}
    </h2>
  );
}
