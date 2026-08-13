import { apiFetch } from "../../api-fetch";
import { CreateFileRequest, FileResponse, GetFilesResponse, ProjectFileType, UpdateFile } from "./types";
export function getFiles(projectId: string) {
    return apiFetch<GetFilesResponse>(
        `/projects/${projectId}/files`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
}
export function updateFile(
    projectId: string,
    fileID: string,
    body: UpdateFile,
) {
    return apiFetch<FileResponse>(
        `/projects/${projectId}/files/${fileID}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),

        }
    )
}
export function createFile(
    projectId: string,
    body: CreateFileRequest,
) {
    return apiFetch<FileResponse>(
        `/projects/${projectId}/files`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        },
    );
}
export function deleteFile(
    projectId: string,
    fileID: string,
) {
    return apiFetch<ProjectFileType>(
        `/projects/${projectId}/files/${fileID}`,
        {
            method: "Delete",
            headers: {
                // "Content-Type": "application/json",
            },
        }
    )
}
export function getFolderContent(
    projectId: string,
    folderId: string
) {
    return apiFetch<ProjectFileType[]>(
        `/projects/${projectId}/files/${folderId}`,
        {
            method: "Get",
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
}
export function getFileContent(projectId: string, fileId: string) {
    return apiFetch<ProjectFileType[]>(
        `/projects/${projectId}/files/${fileId}/content`,
        {
            method: "Get",
            headers: {
                "Content-Type": "application/json",
            },
        },
    );
}