import { useEffect, useMemo, useRef, type MouseEvent } from "react"
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { colorPicker, colorPickerTheme } from "@replit/codemirror-css-color-picker";
import { getLanguageExtension } from "./extensions/language-extension";
import { interactiveValues } from "./extensions/interact";
import { customTheme, editorHighlightExtension } from "./extensions/theme";
import { customSetup } from "./extensions/custom-setup";
import { minimap } from "./extensions/minimap";
import { unusedDetection } from "./extensions/unused-detection";
import { collabExtension } from "@/lib/socket/hooks/useCollaboration";
import {
  dispatchRemotePresence,
  remotePresenceExtension,
} from "./extensions/remote-presence";
import { RemoteMice } from "./remote-mice";
import { serializeSelections, type RemotePeer } from "@/lib/socket/collab-protocol";

interface CollabConfig {
  clientID: string;
  startVersion: number;
}

export type LocalAwareness = {
  selection?: ReturnType<typeof serializeSelections>;
  mouse?: { x: number; y: number } | null;
};

interface Props {
  fileName: string;
  initialValue?: string;
  onChange?: (value: string) => void;
  collaboration?: CollabConfig;
  peers?: RemotePeer[];
  onViewReady?: (view: EditorView | null) => void;
  onLocalAwareness?: (awareness: LocalAwareness) => void;
}

export const CodeEditor = ({
  fileName,
  initialValue = "",
  onChange,
  collaboration,
  peers = [],
  onViewReady,
  onLocalAwareness,
}: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onLocalAwarenessRef = useRef(onLocalAwareness);

  onChangeRef.current = onChange;
  onLocalAwarenessRef.current = onLocalAwareness;

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName)
  }, [fileName])

  const isTypeScript = useMemo(() => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext === "ts" || ext === "tsx";
  }, [fileName])

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      customTheme,
      editorHighlightExtension,
      customSetup,
      languageExtension,
      colorPicker,
      colorPickerTheme,
      ...interactiveValues,
      keymap.of([indentWithTab]),
      minimap(),
      indentationMarkers(),
      ...(isTypeScript ? unusedDetection() : []),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }

        if (update.selectionSet || update.docChanged) {
          onLocalAwarenessRef.current?.({
            selection: serializeSelections(
              update.state.selection.ranges,
              update.state.selection.mainIndex,
            ),
          });
        }
      }),
    ];

    if (collaboration) {
      extensions.push(
        collabExtension({
          clientID: collaboration.clientID,
          startVersion: collaboration.startVersion,
        }),
        remotePresenceExtension(),
      );
    }

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions,
    });

    viewRef.current = view;
    onViewReady?.(view);

    return () => {
      onViewReady?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // Recreate when the collab snapshot version or file language changes.
    // initialValue is captured at construction; parent remounts via `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageExtension, collaboration?.clientID, collaboration?.startVersion]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !collaboration) return;
    dispatchRemotePresence(view, peers);
  }, [peers, collaboration]);

  const emitMouse = (event: MouseEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    onLocalAwarenessRef.current?.({
      mouse: {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      },
    });
  };

  return (
    <div
      ref={wrapperRef}
      className="relative size-full bg-background"
      onMouseMove={collaboration ? emitMouse : undefined}
      onMouseLeave={
        collaboration
          ? () => onLocalAwarenessRef.current?.({ mouse: null })
          : undefined
      }
    >
      <div ref={editorRef} className="size-full pl-4" />
      {collaboration && <RemoteMice peers={peers} />}
    </div>
  );
};
