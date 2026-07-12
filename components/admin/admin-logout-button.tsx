"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adminLogout } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/locale-context";

export function AdminLogoutButton() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await adminLogout();
        router.refresh();
      }}
    >
      {t.admin.logout}
    </Button>
  );
}
