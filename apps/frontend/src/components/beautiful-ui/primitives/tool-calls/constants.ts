export const WORKSPACE_PREFIX = "mastra_workspace_";
export const TEAM_TOOL = "run-team-workflow";
export const ASK_TOOL = "ask-user";

export const TOOL_LABELS: Record<string, string> = {
  read_file: "Read",
  write_file: "Write file",
  edit_file: "Update file",
  ast_edit: "Update file",
  list_files: "List files",
  file_stat: "File info",
  delete: "Delete file",
  mkdir: "Create folder",
  grep: "Search files",
  search: "Search",
  index: "Index files",
  execute_command: "Run",
  get_process_output: "Read output",
  kill_process: "Stop process",
  terminal: "Run command",
  "preview-read": "Read preview",
  "preview-logs": "Preview logs",
  "web-search": "Search the web",
  "web-crawl": "Read page",
  updateWorkingMemory: "Update memory",
  "update-working-memory": "Update memory",
  setWorkingMemory: "Set memory",
  "set-working-memory": "Set memory",
};

/** Mastra emits the working-memory tool under either the wire or kebab id. */
export const MEMORY_TOOLS = new Set([
  "updateWorkingMemory",
  "update-working-memory",
  "setWorkingMemory",
  "set-working-memory",
]);

export type Category = "command" | "read" | "write" | "search" | "other";

export const CATEGORY: Record<string, Category> = {
  execute_command: "command",
  terminal: "command",
  read_file: "read",
  list_files: "read",
  file_stat: "read",
  get_process_output: "read",
  write_file: "write",
  edit_file: "write",
  ast_edit: "write",
  delete: "write",
  mkdir: "write",
  index: "write",
  grep: "search",
  search: "search",
  "web-search": "search",
};

export const FILE_TOOLS = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "ast_edit",
  "delete",
  "file_stat",
  "mkdir",
  "list_files",
]);

export const SEARCH_TOOLS = new Set(["grep", "search", "web-search"]);
