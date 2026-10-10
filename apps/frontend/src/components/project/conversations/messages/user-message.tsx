import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { Message } from "@/store/messages.store";

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  const text = message.content?.trim();
  if (!text) return null;

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13.5px] leading-relaxed text-primary-foreground shadow-hairline">
        <Streamdown
          mode="static"
          dir="auto"
          plugins={{ code }}
          shikiTheme={["github-light", "github-dark"]}
          codeBlockMaxHeight={320}
          className="[overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_[data-streamdown=link]]:text-primary-foreground! [&_[data-streamdown=link]]:underline [&_[data-streamdown=link]]:underline-offset-2 [&_pre]:my-1.5 [&_code]:font-mono"
        >
          {text}
        </Streamdown>
      </div>
    </div>
  );
}
