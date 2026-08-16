import { useEffect, useMemo, useRef } from "react";
import { Compartment, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import { getLanguageExtension } from "./extensions/language-extension";
import { customTheme, editorHighlightExtension } from "./extensions/theme";
import { customSetup } from "./extensions/custom-setup";
import { minimap } from "./extensions/minimap";

const HOCUSPOCUS_URL =
  process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || "ws://localhost:1234";

interface Props {
  projectId: string;
  fileId: string;
  fileName: string;
}

/**
 * Realtime collaborative text editor (Yjs + Hocuspocus).
 *
 * How it works:
 * - Every file mounts its own Y.Doc, synced with the server over WebSocket.
 * - Authentication is automatic: the browser attaches the `Authorization`
 *   cookie during the WebSocket handshake, exactly like the Socket.io client.
 *   No token is passed to the provider on purpose.
 * - The document is intentionally NOT seeded from the REST file content. The
 *   server is the source of truth: it migrates legacy S3 files on first load.
 * - `yCollab` manages undo/redo through Yjs, so CodeMirror's built-in
 *   `history` extension must stay OUT of `customSetup` (it would conflict).
 * - Editing is only enabled once the connection is `connected`; while
 *   connecting/disconnected the editor is read-only (see `editableCompartment`).
 * - The parent remounts this component per file via the `key` prop, so a new
 *   Y.Doc/provider is created every time the active file changes, and the
 *   cleanup below destroys view + provider + doc.
 */
export const CodeEditor = ({ projectId, fileId, fileName }: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const languageExtension: Extension = useMemo(() => {
    return getLanguageExtension(fileName);
  }, [fileName]);

  useEffect(() => {
    if (!editorRef.current) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("content");

    // Toggled below: read-only while syncing, editable once connected.
    const editableCompartment = new Compartment();

    let view: EditorView | null = null;

    const provider = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `project:${projectId}:file:${fileId}`,
      document: ydoc,
      onStatus: ({ status }) => {
        view?.dispatch({
          effects: editableCompartment.reconfigure(
            EditorView.editable.of(status === "connected"),
          ),
        });
      },
    });

    view = new EditorView({
      parent: editorRef.current,
      extensions: [
        editableCompartment.of(EditorView.editable.of(false)),
        customTheme,
        editorHighlightExtension,
        customSetup,
        languageExtension,
        keymap.of([indentWithTab, ...yUndoManagerKeymap]),
        minimap(),
        indentationMarkers(),
        yCollab(ytext, provider.awareness),
      ],
    });

    return () => {
      view?.destroy();
      provider.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setup once per file
  }, [projectId, fileId, languageExtension]);

  return <div ref={editorRef} className="size-full pl-4 bg-background" />;
};