import { useEffect, useMemo, useRef } from "react"
import { EditorView, keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { colorPicker, colorPickerTheme } from "@replit/codemirror-css-color-picker";
import { getLanguageExtension } from "./extensions/language-extension";
import { interactiveValues } from "./extensions/interact";
import { customTheme, editorHighlightExtension } from "./extensions/theme";
import { customSetup } from "./extensions/custom-setup";
import { minimap } from "./extensions/minimap";


interface Props {
  fileName: string;
  initialValue?: string;
  onChange: (value: string) => void;
}

export const CodeEditor = ({ 
  fileName, 
  initialValue = "",
  onChange
}: Props) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const languageExtension = useMemo(() => {
    return getLanguageExtension(fileName)
  }, [fileName])

  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      doc: initialValue,
      parent: editorRef.current,
      extensions: [
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
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialValue is only used for initial document
  }, [languageExtension]);

  return (
    <div ref={editorRef} className="size-full pl-4 bg-background" />
  );
};