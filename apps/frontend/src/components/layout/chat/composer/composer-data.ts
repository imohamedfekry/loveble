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
    key: "release-notes",
    name: "/release-notes",
    desc: "Draft release notes from merged changes.",
  },
  {
    key: "weekly-report",
    name: "/weekly-report",
    desc: "Summarize the week's tasks and decisions.",
  },
  {
    key: "brand-voice",
    name: "/brand-voice",
    desc: "Rewrite text in your product's voice.",
  },
  {
    key: "meeting-summary",
    name: "/meeting-summary",
    desc: "Turn notes into decisions and next steps.",
  },
  {
    key: "calendar-digest",
    name: "/calendar-digest",
    desc: "List tomorrow's meetings and agendas.",
    group: "Calendar",
  },
  {
    key: "free-slots",
    name: "/free-slots",
    desc: "Find open times that work for everyone.",
    group: "Calendar",
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

export const EFFORT_LEVELS = [
  "Low",
  "Medium",
  "High",
  "Extra",
  "Max",
  "Ultra",
];

export const DEFAULT_EFFORT = 2;

export const FILES = [
  "flavor-chart.png",
  "summer-menu.pdf",
  "pos-export.csv",
];