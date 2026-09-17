export type ScaffoldFile = {
  path: string;
  content: string;
};

export type Scaffold = {
  name?: string;
  files: ScaffoldFile[];
};

export type RawScaffold = {
  name?: unknown;
  files?: Array<{ path?: unknown; content?: unknown }>;
};
