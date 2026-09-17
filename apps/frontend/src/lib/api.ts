export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL as string | undefined) ??
  "http://localhost:3001/api/v1";