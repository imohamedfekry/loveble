export type FileType = "file" | "folder";

export interface ProjectFileType {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    type: FileType;
    storageKey: string | null;
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
}

export interface FileContentResponse {
  file: FileContent;
}