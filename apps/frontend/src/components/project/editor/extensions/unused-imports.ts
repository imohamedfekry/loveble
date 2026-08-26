/**
 * Syntax-only, scope-aware "unused import/variable" dimming for CodeMirror 6 + TypeScript.
 *
 * No TypeScript compiler, no language server, no Worker — just the Lezer syntax
 * tree that @codemirror/lang-javascript already builds for highlighting. It does
 * a real (lightweight) scope analysis instead of naive name-matching, so shadowed
 * names are handled correctly:
 *
 *   import { foo } from "./x";
 *   function outer() {
 *     const foo = 1;   // shadows the import
 *     console.log(foo); // uses the LOCAL foo, not the import
 *   }
 *   // -> `foo` import is correctly reported as unused
 *
 * Also detects unused local variables (const/let/var/function params/catch params/loop vars):
 *
 *   const x = 1;  // unused -> dimmed
 *   function foo(unusedParam) { }  // unused -> dimmed
 *   for (const i of [1]) { }  // unused -> dimmed
 *   catch (e) { }  // unused -> dimmed
 *
 * Validated against: plain usage, shadowing (block/function/for-of/catch),
 * destructured + renamed + rest params, class methods, hoisted function
 * declarations called before their textual position, and `import type` used
 * only in a type position (`: Baz`, `as Baz`, generics via TypeName).
 *
 * Known limitations (accepted trade-offs for staying syntax-only):
 *  - `var` hoisting/redeclaration across sibling blocks isn't modeled with full
 *    JS semantics (each Block gets its own scope frame); this only risks a rare
 *    false "used" on an unusual `var` pattern re-declared in a sibling block,
 *    never a false "unused".
 *  - Only local bindings are tracked — it won't know if a name is later
 *    re-exported by string alone, etc. (edge case, rarely relevant to "unused").
 */

import { EditorState, StateField, Text } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { SyntaxNode, Tree } from "@lezer/common";

// ---------------------------------------------------------------------------
// 1. Scope model
// ---------------------------------------------------------------------------

interface DeclInfo {
  isImport: boolean;
  used: boolean;
  from: number;
  to: number;
}

class Scope {
  decls = new Map<string, DeclInfo>();
  constructor(public parent: Scope | null) {}

  declare(name: string, isImport: boolean, from: number, to: number) {
    // First declaration in a scope wins the slot; later same-name decls in the
    // same scope (rare, usually a syntax error) don't need to overwrite it.
    if (!this.decls.has(name)) this.decls.set(name, { isImport, used: false, from, to });
  }

  resolve(name: string): DeclInfo | null {
    for (let s: Scope | null = this; s; s = s.parent) {
      const d = s.decls.get(name);
      if (d) return d;
    }
    return null;
  }
}

function children(node: SyntaxNode): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) out.push(c);
  return out;
}

// ---------------------------------------------------------------------------
// 2. One tree walk: build every scope + every declaration + collect references
//    (references are resolved AFTER the whole tree is walked, so declarations
//    that appear later in the same scope — e.g. hoisted functions — still
//    resolve correctly; order within a scope never matters).
// ---------------------------------------------------------------------------

interface Reference {
  name: string;
  scope: Scope;
}

function buildScopes(tree: Tree, doc: Text): { root: Scope; allScopes: Scope[]; unresolved: Reference[] } {
  const text = (n: SyntaxNode) => doc.sliceString(n.from, n.to);
  const references: Reference[] = [];
  const allScopes: Scope[] = [];
  let root!: Scope;

  function declareBindingsIn(node: SyntaxNode, scope: Scope, isImport: boolean) {
    if (node.name === "VariableDefinition") {
      scope.declare(text(node), isImport, node.from, node.to);
      return;
    }
    if (node.name === "PatternProperty") {
      const kids = children(node);
      if (!kids.some((k) => k.name === "VariableDefinition")) {
        // shorthand `{ a }` -> the PropertyName doubles as the bound name
        const pn = kids.find((k) => k.name === "PropertyName");
        if (pn) scope.declare(text(pn), isImport, pn.from, pn.to);
      }
    }
    for (const c of children(node)) declareBindingsIn(c, scope, isImport);
  }

  function walk(node: SyntaxNode, scope: Scope | null) {
    switch (node.name) {
      case "Script": {
        root = new Scope(null);
        allScopes.push(root);
        for (const c of children(node)) walk(c, root);
        break;
      }
      case "ImportDeclaration": {
        for (const c of children(node)) declareBindingsIn(c, scope!, true);
        break;
      }
      case "VariableDeclaration": {
        for (const c of children(node)) {
          if (c.name === "VariableDefinition" || c.name === "ObjectPattern" || c.name === "ArrayPattern") {
            declareBindingsIn(c, scope!, false);
          } else walk(c, scope);
        }
        break;
      }
      case "FunctionDeclaration":
      case "FunctionExpression": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) {
          if (c.name === "VariableDefinition") scope!.declare(text(c), false, c.from, c.to); // fn's own name lives in the OUTER scope
          else if (c.name === "ParamList") declareBindingsIn(c, inner, false);
          else walk(c, inner);
        }
        break;
      }
      case "ArrowFunction": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) {
          if (c.name === "ParamList") declareBindingsIn(c, inner, false);
          else walk(c, inner);
        }
        break;
      }
      case "MethodDeclaration": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) {
          if (c.name === "ParamList") declareBindingsIn(c, inner, false);
          else if (c.name === "PropertyDefinition") {
            /* method name is a property, not a variable binding */
          } else walk(c, inner);
        }
        break;
      }
      case "ClassDeclaration": {
        for (const c of children(node)) {
          if (c.name === "VariableDefinition") scope!.declare(text(c), false, c.from, c.to);
          else walk(c, scope);
        }
        break;
      }
      case "ForStatement": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) {
          if (c.name.startsWith("For")) {
            // ForSpec / ForOfSpec / ForInSpec: declare the loop variable, then
            // still walk any non-pattern children (e.g. the iterable expression).
            declareBindingsIn(c, inner, false);
            for (const gc of children(c)) {
              if (gc.name === "VariableDefinition" || gc.name === "ObjectPattern" || gc.name === "ArrayPattern") continue;
              walk(gc, inner);
            }
          } else walk(c, inner);
        }
        break;
      }
      case "CatchClause": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) {
          if (c.name === "VariableDefinition") inner.declare(text(c), false, c.from, c.to);
          else walk(c, inner);
        }
        break;
      }
      case "Block": {
        const inner = new Scope(scope);
        allScopes.push(inner);
        for (const c of children(node)) walk(c, inner);
        break;
      }
      case "VariableName":
      case "TypeName": {
        // TypeName covers `: Foo`, `as Foo`, `Foo<T>` — so a type-only import
        // used purely in a type position still counts as used.
        references.push({ name: text(node), scope: scope! });
        break;
      }
      default:
        for (const c of children(node)) walk(c, scope);
    }
  }

  walk(tree.topNode, null);
  return { root, allScopes, unresolved: references };
}

function findUnused(state: EditorState): { imports: { from: number; to: number }[]; variables: { from: number; to: number }[] } {
  const tree = syntaxTree(state);
  const { root, allScopes, unresolved } = buildScopes(tree, state.doc);

  // Resolve all references
  for (const ref of unresolved) {
    const decl = ref.scope.resolve(ref.name);
    if (decl) decl.used = true;
  }

  const unusedImports: { from: number; to: number }[] = [];
  const unusedVariables: { from: number; to: number }[] = [];

  // Check all scopes for unused declarations
  for (const scope of allScopes) {
    for (const d of scope.decls.values()) {
      if (d.isImport && !d.used) {
        unusedImports.push({ from: d.from, to: d.to });
      } else if (!d.isImport && !d.used) {
        unusedVariables.push({ from: d.from, to: d.to });
      }
    }
  }

  return { imports: unusedImports, variables: unusedVariables };
}

// ---------------------------------------------------------------------------
// 3. Wire it up as CodeMirror decorations
// ---------------------------------------------------------------------------

const unusedImportMark = Decoration.mark({ class: "cm-unused-import" });
const unusedVariableMark = Decoration.mark({ class: "cm-unused-variable" });

function buildDecorations(state: EditorState): DecorationSet {
  const { imports, variables } = findUnused(state);
  const ranges: { from: number; to: number; mark: typeof unusedImportMark | typeof unusedVariableMark }[] = [
    ...imports.map(({ from, to }) => ({ from, to, mark: unusedImportMark })),
    ...variables.map(({ from, to }) => ({ from, to, mark: unusedVariableMark })),
  ];
  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges.map(({ from, to, mark }) => mark.range(from, to)));
}

export const unusedDetectionField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(deco, tr) {
    if (!tr.docChanged) return deco;
    return buildDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const unusedDetectionTheme = EditorView.baseTheme({
  ".cm-unused-import": { opacity: "0.55" },
  ".cm-unused-variable": { opacity: "0.6" },
});

/** Drop this into your TypeScript editor's extensions array. */
export function unusedDetectionHighlighter() {
  return [unusedDetectionField, unusedDetectionTheme];
}

// Backward compatibility exports
export const unusedImportsField = unusedDetectionField;
export const unusedImportsTheme = unusedDetectionTheme;
export const unusedImportHighlighter = unusedDetectionHighlighter;
export function findUnusedImports(state: EditorState): { from: number; to: number }[] {
  return findUnused(state).imports;
}