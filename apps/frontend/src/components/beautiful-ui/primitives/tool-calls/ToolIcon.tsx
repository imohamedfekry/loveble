import {
  BrainIcon,
  DatabaseIcon,
  EyeIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  GlobeIcon,
  InfoIcon,
  PencilIcon,
  PowerIcon,
  ScrollTextIcon,
  SearchIcon,
  SquareTerminalIcon,
  Trash2Icon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import {
  MEMORY_TOOLS,
  WEB_CRAWL_TOOL,
  WEB_SEARCH_TOOL,
} from "./constants";

/** One icon per tool id (the bare id, without the workspace prefix). */
const TOOL_ICONS: Record<string, LucideIcon> = {
  // read
  read_file: FileTextIcon,
  list_files: FolderOpenIcon,
  file_stat: InfoIcon,
  get_process_output: ScrollTextIcon,
  "preview-read": EyeIcon,
  "preview-logs": ScrollTextIcon,
  // write
  write_file: FilePlusIcon,
  edit_file: PencilIcon,
  ast_edit: PencilIcon,
  delete: Trash2Icon,
  mkdir: FolderPlusIcon,
  index: DatabaseIcon,
  // search / web
  grep: SearchIcon,
  search: SearchIcon,
  [WEB_SEARCH_TOOL]: GlobeIcon,
  [WEB_CRAWL_TOOL]: GlobeIcon,
  "web-search": GlobeIcon,
  "web-crawl": GlobeIcon,
  // command
  execute_command: SquareTerminalIcon,
  terminal: SquareTerminalIcon,
  kill_process: PowerIcon,
  // memory
  ...Object.fromEntries([...MEMORY_TOOLS].map((id) => [id, BrainIcon])),
};

/** The glyph that identifies a tool in its row (replaces the old check mark). */
export function ToolIcon({
  base,
  className,
}: {
  base?: string;
  className?: string;
}) {
  const Icon = (base && TOOL_ICONS[base]) || WrenchIcon;
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
