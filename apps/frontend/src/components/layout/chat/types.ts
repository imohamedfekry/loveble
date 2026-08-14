export type ChatAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
  type: "image" | "file";
};

export type MentionFile = {
  path: string;
  label: string;
};
