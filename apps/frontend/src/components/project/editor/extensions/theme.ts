import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const customTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--editor-bg)",
    color: "var(--editor-variable)",
    outline: "none !important",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none !important",
  },
  ".cm-content": {
    caretColor: "var(--editor-caret)",
    fontFamily: "var(--font-plex-mono), monospace",
    fontSize: "14px",
    padding: "0 0 0 8px",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--editor-caret)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--editor-selection) !important",
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--editor-selection-match)",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--editor-active-line)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--editor-active-line-gutter)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter-bg)",
    color: "var(--editor-gutter-fg)",
    border: "none",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "2.5rem",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--editor-gutter-fg)",
  },
  ".cm-scroller": {
    scrollbarWidth: "thin",
    scrollbarColor: "var(--border) transparent",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--editor-matching-bracket)",
    outline: "1px solid var(--editor-matching-bracket)",
  },
  ".cm-searchMatch": {
    backgroundColor: "var(--editor-search-match)",
    outline: "1px solid var(--editor-search-match)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "var(--editor-selection)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--editor-tooltip-bg)",
    color: "var(--editor-tooltip-fg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    padding: "3px 8px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  ".cm-panels": {
    backgroundColor: "var(--editor-tooltip-bg)",
    color: "var(--editor-tooltip-fg)",
  },
  ".cm-completionMatchedText": {
    color: "var(--editor-function)",
    textDecoration: "underline",
  },
})

export const editorHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--editor-comment)", fontStyle: "italic" },
  { tag: [tags.keyword, tags.operatorKeyword, tags.controlKeyword, tags.definitionKeyword], color: "var(--editor-keyword)" },
  { tag: [tags.string, tags.special(tags.string), tags.docString, tags.character], color: "var(--editor-string)" },
  { tag: [tags.number, tags.integer, tags.float], color: "var(--editor-number)" },
  { tag: [tags.bool, tags.atom, tags.null, tags.labelName], color: "var(--editor-boolean)" },
{
  tag: [
    tags.function(tags.variableName),
    tags.function(tags.propertyName),
    tags.definition(tags.function(tags.variableName)),
  ],
  color: "var(--editor-function)",
},  { tag: [tags.variableName, tags.definition(tags.variableName), tags.self], color: "var(--editor-variable)" },
  { tag: [tags.propertyName], color: "var(--editor-property)" },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.moduleKeyword, tags.definition(tags.typeName)], color: "var(--editor-type)" },
  { tag: [tags.operator, tags.arithmeticOperator, tags.compareOperator, tags.logicOperator, tags.bitwiseOperator], color: "var(--editor-operator)" },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "var(--editor-punctuation)" },
  { tag: [tags.tagName, tags.definition(tags.tagName)], color: "var(--editor-tag)" },
  { tag: [tags.attributeName], color: "var(--editor-attribute)" },
  { tag: [tags.constant(tags.variableName), tags.standard(tags.variableName)], color: "var(--editor-constant)" },
  { tag: [tags.heading], color: "var(--editor-keyword)", fontWeight: "600" },
  { tag: [tags.emphasis], fontStyle: "italic" },
  { tag: [tags.strong], fontWeight: "600" },
  { tag: [tags.link, tags.url], color: "var(--editor-function)", textDecoration: "underline" },
  { tag: [tags.meta, tags.processingInstruction], color: "var(--editor-comment)" },
  { tag: [tags.invalid], color: "var(--destructive)" },
])

export const editorHighlightExtension = syntaxHighlighting(editorHighlightStyle)