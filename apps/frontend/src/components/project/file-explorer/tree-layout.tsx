import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
    TREE_ICON_SIZE,
    TREE_INDENT_SIZE,
    TREE_LABEL_GAP,
    TREE_TWISTIE_SIZE,
} from "./constants";

type TreeRowProps = {
    level: number;
    twistie?: ReactNode;
    icon: ReactNode;
    label: ReactNode;
    className?: string;
    labelClassName?: string;
};

/**
 * Custom tree row layout.
 *
 * The row spans full width; indentation is achieved via fixed-width
 * spacer columns — not cumulative padding on the row itself.
 *
 * Structure per row:
 *   [indent × level] [twistie 16px] [icon 16px] [gap] [label]
 */
export const TreeRow = ({
    level,
    twistie,
    icon,
    label,
    className,
    labelClassName,
}: TreeRowProps) => {
    return (
        <div
            className={cn(
                "flex w-full min-w-0 items-center text-start",
                className,
            )}
        >
            {Array.from({ length: level }).map((_, index) => (
                <TreeIndentGuide key={index} />
            ))}

            <TreeTwistieSlot>{twistie}</TreeTwistieSlot>
            <TreeIconSlot>{icon}</TreeIconSlot>

            <div
                className={cn(
                    "min-w-0 flex-1 truncate text-start",
                    labelClassName,
                )}
                style={{ marginInlineStart: TREE_LABEL_GAP }}
            >
                {label}
            </div>
        </div>
    );
};

const TreeIndentGuide = () => (
    <div
        className="relative shrink-0 self-stretch"
        style={{ width: TREE_INDENT_SIZE }}
        aria-hidden
    >
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/5" />
    </div>
);

const TreeTwistieSlot = ({ children }: { children?: ReactNode }) => (
    <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: TREE_TWISTIE_SIZE, height: TREE_TWISTIE_SIZE }}
    >
        {children}
    </div>
);

const TreeIconSlot = ({ children }: { children: ReactNode }) => (
    <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: TREE_ICON_SIZE, height: TREE_ICON_SIZE }}
    >
        {children}
    </div>
);
