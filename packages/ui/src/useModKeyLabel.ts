"use client";

import { useState, useEffect } from "react";
import { getModKeyLabel, isMacOS } from "@loveble/utils";

export function useModKeyLabel() {
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    setModKey(getModKeyLabel(isMacOS()));
  }, []);

  return modKey;
}
