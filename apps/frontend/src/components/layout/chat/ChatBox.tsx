"use client";

import { ChatComposer } from "./composer/ChatComposer";

export function ChatBox({
  value = "",
  onChange = () => {},
  onSend,
  sending = false,
}: {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (payload: {
    text: string;
    files: File[];
  }) => void;
  sending?: boolean;
}) {
  return (
    <ChatComposer
      variant="Rounded"
      value={value}
      onChange={onChange}
      onSend={onSend}
      sending={sending}
    />
  );
}