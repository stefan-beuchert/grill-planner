"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/locale-context";

export function AdminLoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await adminLogin(passcode);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <Input
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder={t.admin.passcodePlaceholder}
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        className="h-12 text-center text-lg tracking-widest"
        autoFocus
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="h-12">
        {t.admin.unlock}
      </Button>
    </form>
  );
}
