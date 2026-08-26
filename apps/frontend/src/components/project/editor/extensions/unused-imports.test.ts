/**
 * Unit tests for the scope-aware unused imports detection.
 * 
 * These tests verify the findUnusedImports function works correctly
 * for various TypeScript scenarios without requiring a full editor instance.
 */

import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { findUnusedImports } from "./unused-imports";

function createState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [javascript({ typescript: true })]
  });
}

function getUnusedRanges(code: string): { from: number; to: number }[] {
  const state = createState(code);
  return findUnusedImports(state);
}

function getUnusedNames(code: string): string[] {
  const ranges = getUnusedRanges(code);
  return ranges.map(({ from, to }) => code.slice(from, to));
}

describe("unused imports detection", () => {
  test("plain import - only foo used, bar unused", () => {
    const code = `import { foo, bar } from "./x";\nfoo();`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["bar"]);
  });

  test("import shadowed by const in nested function", () => {
    const code = `import { foo } from "./x";\nfunction outer() {\n  const foo = 1;\n  console.log(foo);\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["foo"]);
  });

  test("import shadowed by for-of loop variable", () => {
    const code = `import { foo } from "./x";\nfor (const foo of [1,2,3]) {\n  console.log(foo);\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["foo"]);
  });

  test("import shadowed by catch parameter", () => {
    const code = `import { foo } from "./x";\ntry {}\ncatch (foo) {\n  console.log(foo);\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["foo"]);
  });

  test("destructured + renamed + rest params", () => {
    const code = `import { a: renamed, ...rest } from "./x";\nconsole.log(renamed);`;
    const unused = getUnusedNames(code);
    // 'rest' is unused, 'a' (the original import name) is renamed to 'renamed' which is used
    expect(unused).toEqual(["rest"]);
  });

  test("shorthand destructured param shadowing an import", () => {
    const code = `import { foo } from "./x";\nfunction test({ foo }) {\n  console.log(foo);\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["foo"]);
  });

  test("import used only inside a class method body", () => {
    const code = `import { foo } from "./x";\nclass C {\n  method() { foo(); }\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("import type used only in type position", () => {
    const code = `import type { Baz } from "./x";\nconst x: Baz = 1;`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("import type used in 'as' type position", () => {
    const code = `import type { Baz } from "./x";\nconst x = {} as Baz;`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("import type used in generic type position", () => {
    const code = `import type { Baz } from "./x";\nconst x: Array<Baz> = [];`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("function called before its textual definition (hoisting)", () => {
    const code = `import { foo } from "./x";\nfoo();\nfunction foo() {}`;
    const unused = getUnusedNames(code);
    // The function declaration 'foo' shadows the import, so import is unused
    expect(unused).toEqual(["foo"]);
  });

  test("multiple imports - some used, some not", () => {
    const code = `import { a, b, c } from "./x";\nconsole.log(a, c);`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["b"]);
  });

  test("default import unused", () => {
    const code = `import Foo from "./x";\n// Foo not used`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual(["Foo"]);
  });

  test("namespace import partially used", () => {
    const code = `import * as NS from "./x";\nconsole.log(NS.foo);`;
    // NS is used, but we don't track individual namespace members
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("import used in nested block", () => {
    const code = `import { foo } from "./x";\nif (true) {\n  foo();\n}`;
    const unused = getUnusedNames(code);
    expect(unused).toEqual([]);
  });

  test("import shadowed in nested block but used in outer", () => {
    const code = `import { foo } from "./x";\nif (true) {\n  const foo = 1;\n}\nfoo();`;
    const unused = getUnusedNames(code);
    // The block-scoped const doesn't affect the outer scope
    expect(unused).toEqual([]);
  });
});