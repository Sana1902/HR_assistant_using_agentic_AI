export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ChatResponse {
  success: boolean;
  answer: string;
}

