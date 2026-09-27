import { Message } from "@/store/messages.store";

interface AssistantMessageProps {
  message: Message;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm text-foreground">
        {message.content}
      </div>
    </div>
  );
}
