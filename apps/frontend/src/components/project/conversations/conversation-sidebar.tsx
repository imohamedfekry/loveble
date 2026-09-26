import { toast } from "sonner";
import { useState } from "react";
import {
    CopyIcon,
    HistoryIcon,
    LoaderIcon,
    PlusIcon
} from "lucide-react";
import { PastConversationsDialog } from "./conversations-dialog";
import { Button } from "@loveble/ui/button";
import { ConversationComposer } from "./ConversationComposer";

const MOCK_MESSAGES = [
    {
        id: "1",
        role: "user" as const,
        content: "Hello",
    },
    {
        id: "2",
        role: "assistant" as const,
        content: "Hello! How can I assist you today?",
    },
];

export const ConversationSidebar = ({
    projectId,
}: {
    projectId: string;
}) => {
    const [value, setValue] = useState("");
    const [sending, setSending] = useState(false);
    return (
        <>
            {/* <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={setSelectedConversationId}
        /> */}
            <div className="flex flex-col h-full bg-sidebar">
                <div className="h-8.75 flex items-center justify-between border-b">
                    <div className="text-sm truncate pl-3">
                        {/* {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE} */}
                        New conversation
                    </div>
                    <div className="flex items-center px-1 gap-1">
                        <Button
                            size="icon-xs"
                            variant="highlight"
                        // onClick={() => setPastConversationsOpen(true)}
                        >
                            <HistoryIcon className="size-3.5" />
                        </Button>
                        <Button
                            size="icon-xs"
                            variant="highlight"
                        // onClick={handleCreateConversation}
                        >
                            <PlusIcon className="size-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {MOCK_MESSAGES.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                    message.role === "user"
                                        ? "bg-muted"
                                        : ""
                                }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
                </div>

                <ConversationComposer
                    className="p-3 border-t"
                    projectId={projectId}
                    value={value}
                    onChange={setValue}
                    sending={sending}
                />
            </div>
        </>
    );
};
