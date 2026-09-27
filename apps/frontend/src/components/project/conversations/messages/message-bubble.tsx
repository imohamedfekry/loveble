import { useMemo } from "react";
import { Message } from "@/store/messages.store";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";
import { SystemMessage } from "./system-message";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const Component = useMemo(() => {
    switch (message.role) {
      case "user":
        return UserMessage;
      case "assistant":
        return AssistantMessage;
      case "system":
        return SystemMessage;
      default:
        return UserMessage;
    }
  }, [message.role]);

  return <Component message={message} />;
}
