"use client";

import { useSettings } from "@/components/settings/use-settings";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { openSettings } = useSettings();

  useEffect(() => {
    openSettings();
    router.replace("/dashboard");
  }, [openSettings, router]);

  return null;
}
