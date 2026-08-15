"use client";

import { ChatComposer } from "./composer/ChatComposer";

export function ChatBox({
  value = "",
  onChange = () => {},
  onSend,
}: {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (payload: {
    text: string;
    files: File[];
  }) => void;
}) {
  return (
    <ChatComposer
      variant="Rounded"
      value={value}
      onChange={onChange}
      onSend={onSend}
    />
  );
}