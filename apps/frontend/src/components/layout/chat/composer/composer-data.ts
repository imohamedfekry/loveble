import type {
  ComposerCommand,
  ComposerModel,
  ComposerSource,
} from "./types";

export const SOURCES: ComposerSource[] = [
  {
    key: "attach",
    name: "Add photos & files",
    desc: "Upload from your computer",
    glyph: "clip",
    attach: true,
  },
  {
    key: "scoop",
    name: "Scoop Data",
    desc: "Sales & churn metrics",
    glyph: "chart",
  },
  {
    key: "flavors",
    name: "Flavor records",
    desc: "26 makers, tags, links",
    glyph: "layers",
  },
  {
    key: "web",
    name: "Web search",
    desc: "Real-time news and info",
    glyph: "globe",
  },
  {
    key: "figma",
    name: "Figma",
    desc: "Design-to-code workflows",
    brand: "figma",
  },
  {
    key: "slack",
    name: "Slack",
    desc: "Read and manage Slack",
    brand: "slack",
  },
  {
    key: "gmail",
    name: "Gmail",
    desc: "Read and manage Gmail",
    brand: "gmail",
    connect: true,
  },
];

export const COMMANDS: ComposerCommand[] = [
  {
    key: "compare",
    name: "/compare",
    desc: "Flavor vs. last summer",
  },
  {
    key: "churn-plan",
    name: "/churn-plan",
    desc: "Draft a churn schedule",
  },
  {
    key: "restock",
    name: "/restock",
    desc: "Build a reorder list",
  },
  {
    key: "draft-email",
    name: "/draft-email",
    desc: "Write a supplier email",
  },
  {
    key: "summarize",
    name: "/summarize",
    desc: "Digest the thread so far",
  },
];

export const MODELS: ComposerModel[] = [
  {
    key: "sprinkles-5",
    name: "Sprinkles 5",
    tag: "Flagship",
  },
  {
    key: "vanilla-1",
    name: "Vanilla 1",
    tag: "Basic",
  },
  {
    key: "freezer-burn",
    name: "Freezer Burn 0.4",
    tag: "Stale",
  },
];

export const FILES = [
  "flavor-chart.png",
  "summer-menu.pdf",
  "pos-export.csv",
];