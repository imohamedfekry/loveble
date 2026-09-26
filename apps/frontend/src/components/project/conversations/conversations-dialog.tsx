"use client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandList, CommandInput } from "@loveble/ui/command";
import { formatDistanceToNow } from "date-fns";

interface PastConversationsDialogProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (conversationId: string) => void;
};

export const PastConversationsDialog = ({
    projectId,
    open,
    onOpenChange,
    onSelect,
}: PastConversationsDialogProps) => {
    // const conversations = useConversations(projectId);

    const handleSelect = (conversationId: string) => {
        onSelect(conversationId);
        onOpenChange(false);
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Past Conversations"
            description="Search and select a past conversation"
        >
            <CommandInput placeholder="Search conversations..." />
            <CommandList>
                <CommandEmpty>No conversations found.</CommandEmpty>
                <CommandGroup heading="Conversations">
                    {/* {conversations?.map((conversation) => (
            <CommandItem
              key={conversation._id}
              value={`${conversation.title}-${conversation._id}`}
              onSelect={() => handleSelect(conversation._id)}
            >
              <div className="flex flex-col gap-0.5">
                <span>{conversation.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(conversation._creationTime, {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </CommandItem>
          ))} */}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
};