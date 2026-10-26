export type FileType = "file" | "folder";

export interface ProjectFileType {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    type: FileType;
    storageKey: string | null;
    contentType: string;
    size: number;
    checksum: string | null;
    isBinary: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFileRequest {
    parentId?: string | null;
    name: string;
    type: "file" | "folder";
}

export interface UpdateFile {
    parentId?: string | null;
    name?: string;
}

export interface MoveFileRequest {
    parentId: string | null;
}


// Response InterFace
export interface GetFilesResponse {
  files: ProjectFileType[];
}

export interface FileResponse {
  file: ProjectFileType;
}

export interface FileContent {
  content: string;
  contentType: string;
  size: number;
  isBinary: boolean;
  downloadUrl: string | null;
}

export interface FileContentResponse {
  file: FileContent;
}

export interface FileDownloadResponse {
  url: string;
  contentType: string;
  size: number;
  isBinary: boolean;
}