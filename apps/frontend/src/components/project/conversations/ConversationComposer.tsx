"use client";

import { ChatComposer } from "@/components/layout/chat/composer/ChatComposer";
import type { ComposerVariant } from "@/components/layout/chat/composer/types";

export function ConversationComposer({
    projectId,
    variant = "Rounded",
    value,
    onChange,
    onSend,
    sending,
    className,
}: {
    projectId: string;
    variant?: ComposerVariant;
    value: string;
    onChange: (value: string) => void;
    onSend?: (payload: { text: string; files: File[] }) => void;
    sending?: boolean;
    className?: string;
}) {
    return (
        <div className={`shrink-0 ${className ?? ""}`}>
            <ChatComposer
                variant={variant}
                value={value}
                onChange={onChange}
                onSend={onSend}
                sending={sending}
            />
        </div>
    );
}
