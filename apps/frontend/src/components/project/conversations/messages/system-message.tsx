import { Message } from "@/store/messages.store";

interface SystemMessageProps {
  message: Message;
}

export function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="flex justify-center">
      <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
        {message.content}
      </div>
    </div>
  );
}
