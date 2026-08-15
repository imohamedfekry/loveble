// Base padding for root level items (after project header)
export const BASE_PADDING = 12;
// Additional padding per nesting level
export const LEVEL_PADDING = 12;

// Tree row layout (see tree-layout.tsx): [indent x level] [twistie 16px] [icon 16px] [gap] [label]
export const TREE_INDENT_SIZE = 16;
export const TREE_TWISTIE_SIZE = 16;
export const TREE_ICON_SIZE = 16;
export const TREE_LABEL_GAP = 6;

export const getItemPadding = (level: number, isFile: boolean) => {
  // Files need extra padding since they don't have the chevron
  const fileOffset = isFile ? 16 : 0;
  return BASE_PADDING + level * LEVEL_PADDING + fileOffset;
};