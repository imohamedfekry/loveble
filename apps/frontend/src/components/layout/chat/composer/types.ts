import type { FileType } from "@/lib/api/apis/files/types";

export type ComposerVariant = "Rounded" | "Pill";

export type ComposerMenuType = "at" | "files" | "slash" | null;

export type ComposerSource = {
  key: string;
  name: string;
  desc: string;
  glyph?: string;
  brand?: string;
  attach?: boolean;
  connect?: boolean;
};

export type ComposerCommand = {
  key: string;
  name: string;
  desc: string;
};

export type ComposerModel = {
  key: string;
  name: string;
  tag: string;
};

export type ComposerRow = {
  key: string;
  name: string;
  desc: string;
  fileType?: FileType;
};

export type ComposerAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
};

export type ComposerSendPayload = {
  text: string;
  files: File[];
};