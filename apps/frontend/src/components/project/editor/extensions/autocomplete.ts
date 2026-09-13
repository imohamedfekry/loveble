import type { Extension } from "@codemirror/state";
import {
  autocompletion,
  completeFromList,
  ifNotIn,
  snippetCompletion,
  type Completion,
} from "@codemirror/autocomplete";
import { javascriptLanguage } from "@codemirror/lang-javascript";
import { htmlLanguage } from "@codemirror/lang-html";
import { cssLanguage } from "@codemirror/lang-css";
import { pythonLanguage } from "@codemirror/lang-python";
import { jsonLanguage } from "@codemirror/lang-json";
import { yamlLanguage } from "@codemirror/lang-yaml";
import { xmlLanguage } from "@codemirror/lang-xml";

/** Shared autocompletion behavior for the whole editor. */
export const autocompleteConfig = autocompletion({
  activateOnTyping: true,
  activateOnTypingDelay: 60,
  maxRenderedOptions: 60,
  icons: true,
  closeOnBlur: true,
  selectOnOpen: true,
});

const jsSnippets: Completion[] = [
  snippetCompletion("console.log(${value})", {
    label: "clg",
    detail: "console.log",
    info: "Log a value to the console",
    type: "snippet",
    boost: 2,
  }),
  snippetCompletion("function ${name}(${params}) {\n\t${}\n}", {
    label: "fn",
    detail: "function",
    info: "Function declaration",
    type: "keyword",
  }),
  snippetCompletion("const ${name} = (${params}) => {\n\t${}\n}", {
    label: "af",
    detail: "arrow function",
    info: "Arrow function expression",
    type: "keyword",
  }),
  snippetCompletion("import ${name} from \"${module}\";", {
    label: "imp",
    detail: "import",
    info: "ES module import",
    type: "keyword",
  }),
  snippetCompletion("export default ${value};", {
    label: "exp",
    detail: "export default",
    type: "keyword",
  }),
  snippetCompletion(
    "const [${state}, set${State}] = useState(${initial});",
    {
      label: "usf",
      detail: "useState",
      info: "React state hook",
      type: "function",
      boost: 2,
    },
  ),
  snippetCompletion(
    "useEffect(() => {\n\t${}\n}, [${deps}]);",
    {
      label: "uef",
      detail: "useEffect",
      info: "React effect hook",
      type: "function",
      boost: 2,
    },
  ),
  snippetCompletion(
    "for (let ${i} = 0; ${i} < ${n}; ${i}++) {\n\t${}\n}",
    { label: "for", detail: "for loop", type: "keyword" },
  ),
  snippetCompletion("if (${cond}) {\n\t${}\n} else {\n\t\n}", {
    label: "ife",
    detail: "if / else",
    type: "keyword",
  }),
  snippetCompletion("try {\n\t${}\n} catch (${err}) {\n\t\n}", {
    label: "try",
    detail: "try / catch",
    type: "keyword",
  }),
  snippetCompletion("interface ${Name} {\n\t${}\n}", {
    label: "intf",
    detail: "interface",
    type: "type",
  }),
  snippetCompletion("type ${Name} = ${type};", {
    label: "type",
    detail: "type alias",
    type: "type",
  }),
];

const htmlSnippets: Completion[] = [
  snippetCompletion("<div className=\"${}\">${}</div>", {
    label: "div",
    detail: "div",
    type: "type",
  }),
  snippetCompletion(
    "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n\t<meta charset=\"UTF-8\" />\n\t<title>${title}</title>\n</head>\n<body>\n\t${}\n</body>\n</html>",
    { label: "html:5", detail: "boilerplate", type: "snippet" },
  ),
  snippetCompletion("<button onClick={${handler}}>${label}</button>", {
    label: "btn",
    detail: "button",
    type: "snippet",
  }),
  snippetCompletion("<input value={${v}} onChange={${fn}} />", {
    label: "input",
    detail: "controlled input",
    type: "snippet",
  }),
];

const cssSnippets: Completion[] = [
  snippetCompletion("display: flex;\nalign-items: ${center};\njustify-content: ${center};", {
    label: "flex",
    detail: "flex center",
    type: "property",
  }),
  snippetCompletion("display: grid;\ngrid-template-columns: ${1fr 1fr};", {
    label: "grid",
    detail: "grid",
    type: "property",
  }),
  snippetCompletion("@media (max-width: ${768}px) {\n\t${}\n}", {
    label: "media",
    detail: "@media",
    type: "keyword",
  }),
];

const pythonSnippets: Completion[] = [
  snippetCompletion("def ${name}(${params}):\n\t${}", {
    label: "def",
    detail: "function",
    type: "keyword",
    boost: 2,
  }),
  snippetCompletion("class ${Name}:\n\tdef __init__(self${params}):\n\t\t${}", {
    label: "class",
    detail: "class",
    type: "type",
  }),
  snippetCompletion("if __name__ == \"__main__\":\n\t${}", {
    label: "main",
    detail: "entrypoint",
    type: "snippet",
  }),
  snippetCompletion("for ${x} in ${iterable}:\n\t${}", {
    label: "for",
    detail: "for loop",
    type: "keyword",
  }),
  snippetCompletion("print(${value})", {
    label: "print",
    detail: "print()",
    type: "function",
  }),
];

const jsonSnippets: Completion[] = [
  { label: "true", detail: "boolean", type: "keyword", boost: -1 },
  { label: "false", detail: "boolean", type: "keyword", boost: -1 },
  { label: "null", detail: "null", type: "keyword", boost: -1 },
];

const yamlSnippets: Completion[] = [
  snippetCompletion("${key}: ${value}", {
    label: "kv",
    detail: "key: value",
    type: "property",
  }),
  snippetCompletion("- ${item}", {
    label: "list",
    detail: "list item",
    type: "snippet",
  }),
  snippetCompletion("---\n${}\n", {
    label: "doc",
    detail: "document start",
    type: "snippet",
  }),
];

const xmlSnippets: Completion[] = [
  snippetCompletion("<${tag}>${}</${tag}>", {
    label: "tag",
    detail: "element",
    type: "type",
  }),
  snippetCompletion("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n${}", {
    label: "decl",
    detail: "xml declaration",
    type: "snippet",
  }),
  snippetCompletion("<${tag} ${attr}=\"${value}\" />", {
    label: "self",
    detail: "self-closing",
    type: "snippet",
  }),
];

/**
 * Returns autocomplete extensions tailored to the file language.
 * Language-specific snippets are scoped via `language.data.of`
 * so they merge with the built-in word completions instead of
 * replacing them; `ifNotIn` keeps them out of strings/comments.
 */
export const getAutocompleteExtension = (fileName: string): Extension => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return [
        autocompleteConfig,
        javascriptLanguage.data.of({
          autocomplete: ifNotIn(
            ["String", "Comment", "TemplateString"],
            completeFromList(jsSnippets),
          ),
        }),
      ];
    case "html":
      return [
        autocompleteConfig,
        htmlLanguage.data.of({
          autocomplete: completeFromList(htmlSnippets),
        }),
      ];
    case "css":
      return [
        autocompleteConfig,
        cssLanguage.data.of({
          autocomplete: completeFromList(cssSnippets),
        }),
      ];
    case "py":
      return [
        autocompleteConfig,
        pythonLanguage.data.of({
          autocomplete: ifNotIn(
            ["String", "Comment"],
            completeFromList(pythonSnippets),
          ),
        }),
      ];
    case "json":
      return [
        autocompleteConfig,
        jsonLanguage.data.of({
          autocomplete: completeFromList(jsonSnippets),
        }),
      ];
    case "yaml":
    case "yml":
      return [
        autocompleteConfig,
        yamlLanguage.data.of({
          autocomplete: ifNotIn(
            ["String", "Comment"],
            completeFromList(yamlSnippets),
          ),
        }),
      ];
    case "xml":
    case "svg":
      return [
        autocompleteConfig,
        xmlLanguage.data.of({
          autocomplete: completeFromList(xmlSnippets),
        }),
      ];
    default:
      return [autocompleteConfig];
  }
};
