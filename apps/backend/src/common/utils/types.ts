export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  code: string; // e.g., 'USER_CREATED', 'LOGIN_SUCCESS'
  message: string;
  data?: T;
  timestamp?: string;
}
