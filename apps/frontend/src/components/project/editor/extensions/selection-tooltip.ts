import { Tooltip, showTooltip, EditorView } from "@codemirror/view";
import { StateField, EditorState } from "@codemirror/state";
import { showQuickEditEffect, quickEditState } from "./quick-edit";
import { isMacOS, getModKeyLabel } from "@loveble/utils";
import { useChatContextStore } from "@/store/chat-context.store";
import { resolveProjectPath } from "@/lib/chat-context";

let editorView: EditorView | null = null;

export type SelectionTooltipContext = {
    projectId: string;
    fileId: string;
};

function addSelectionToChat(context: SelectionTooltipContext) {
    const view = editorView;
    if (!view) return;

    const selection = view.state.selection.main;
    if (selection.empty) return;

    const path = resolveProjectPath(context.projectId, context.fileId);
    if (!path) return;

    const lineStart = view.state.doc.lineAt(selection.from).number;
    const lineEnd = view.state.doc.lineAt(
        Math.max(selection.from, selection.to - 1),
    ).number;

    useChatContextStore.getState().add({
        kind: "selection",
        projectId: context.projectId,
        fileId: context.fileId,
        path,
        name: path.split("/").pop() ?? path,
        type: "file",
        lineStart,
        lineEnd,
    });
}

function createTooltipForSelection(
    state: EditorState,
    context: SelectionTooltipContext,
): readonly Tooltip[] {
    const selection = state.selection.main;

    if (selection.empty) {
        return [];
    }

    const isQuickEditActive = state.field(quickEditState);
    if (isQuickEditActive) {
        return [];
    }

    return [
        {
            pos: selection.to,
            above: false,
            strictSide: false,
            create() {
                const dom = document.createElement("div");
                dom.className =
                    "bg-muted text-popover-foreground z-50 rounded-sm border border-input p-1 shadow-md flex items-center gap-2 text-sm";

                const addToChatButton = document.createElement("button");
                addToChatButton.textContent = "Add to Chat";
                addToChatButton.className =
                    "font-sans p-1 px-2 hover:bg-foreground/10 rounded-sm";
                addToChatButton.onclick = () => {
                    addSelectionToChat(context);
                };

                const quickEditButton = document.createElement("button");
                quickEditButton.className =
                    "font-sans p-1 px-2 hover:bg-foreground/10 rounded-sm flex items-center gap-1";

                const quickEditButtonText = document.createElement("span");
                quickEditButtonText.textContent = "Quick Edit";

                const quickEditButtonShortcut = document.createElement("span");
                quickEditButtonShortcut.textContent = `${getModKeyLabel(isMacOS())} K`;
                quickEditButtonShortcut.className = "text-sm opacity-60";

                quickEditButton.appendChild(quickEditButtonText);
                quickEditButton.appendChild(quickEditButtonShortcut);

                quickEditButton.onclick = () => {
                    if (editorView) {
                        editorView.dispatch({
                            effects: showQuickEditEffect.of(true),
                        });
                    }
                };

                dom.appendChild(addToChatButton);
                dom.appendChild(quickEditButton);

                return { dom };
            },
        }
    ];
}

function createSelectionTooltipField(context: SelectionTooltipContext) {
    return StateField.define<readonly Tooltip[]>({
        create(state) {
            return createTooltipForSelection(state, context);
        },

        update(tooltips, transaction) {
            if (transaction.docChanged || transaction.selection) {
                return createTooltipForSelection(transaction.state, context);
            }
            for (const effect of transaction.effects) {
                if (effect.is(showQuickEditEffect)) {
                    return createTooltipForSelection(transaction.state, context);
                }
            }
            return tooltips;
        },

        provide: (field) => showTooltip.computeN(
            [field],
            (state) => state.field(field),
        ),
    });
}

const captureViewExtension = EditorView.updateListener.of((update) => {
    editorView = update.view;
});

export const selectionTooltip = (context: SelectionTooltipContext) => [
    createSelectionTooltipField(context),
    captureViewExtension,
];
