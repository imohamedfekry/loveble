"use client";

import { useEffect, useState } from "react";
import { getModKeyLabel, isMacOS } from "@/lib/keyboard";

export function useModKeyLabel() {
  const [label, setLabel] = useState("Ctrl");

  useEffect(() => {
    setLabel(getModKeyLabel(isMacOS()));
  }, []);

  return label;
}
