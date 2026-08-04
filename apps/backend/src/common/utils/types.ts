export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  timestamp?: string;
}

export type StorageObject =
  | {
      type: "text";
      content: string;
      contentType: string;
    }
  | {
      type: "binary";
      content: Uint8Array;
      contentType: string;
    };