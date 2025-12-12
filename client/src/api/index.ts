import http from './http';
import { Assignment, AuthResponse, FilePair, UploadSummary, User, AdminStats, RecordComment } from '../types';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
}

export const signup = (data: { name: string; email: string; password: string; confirmPassword: string }) =>
  http.post<AuthResponse>('/api/auth/signup', data);

export const login = (data: { email: string; password: string }) =>
  http.post<AuthResponse>('/api/auth/login', data);

export const fetchCurrentUser = () => http.get<{ success: boolean; user: User }>('/api/auth/me');

export const uploadFolder = (
  formData: FormData,
  onUploadProgress?: (progressEvent: { loaded: number; total: number }) => void
) =>
  http.post<{ success: boolean; summary: UploadSummary; duplicatesSkipped: string[] }>('/api/uploads/folder', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        onUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
        });
      }
    },
  });

export const fetchMyUploads = (params: { page?: number; status?: string; search?: string; soldStatus?: string }) =>
  http.get<PaginatedResponse<FilePair>>('/api/uploads/mine', { params });

export const fetchRecords = (params: { page?: number; status?: string; search?: string; soldStatus?: string }) =>
  http.get<PaginatedResponse<FilePair>>('/api/uploads/records', { params });

export const fetchFilePairDetails = (filePairId: string) =>
  http.get<{ success: boolean; data: FilePair }>(`/api/uploads/${filePairId}`);

export const updateSoldStatus = (filePairId: string, soldStatus: 'Sold' | 'Unsold') =>
  http.put<{ success: boolean; data: FilePair }>(`/api/uploads/${filePairId}/sold`, { soldStatus });

export const addComment = (filePairId: string, message: string) =>
  http.post<{ success: boolean; comments: RecordComment[] }>(`/api/uploads/${filePairId}/comments`, { message });

export const deleteComment = (filePairId: string, commentId: string) =>
  http.delete<{ success: boolean; comments: RecordComment[] }>(`/api/uploads/${filePairId}/comments/${commentId}`);

export const fetchTextContent = (filePairId: string) =>
  http.get<{
    success: boolean;
    textContent: string;
    reviewContent: string;
    originalPath: string;
    editorPath: string;
  }>(`/api/uploads/text/${filePairId}`);

export const saveReviewText = (filePairId: string, content: string) =>
  http.put<{ success: boolean; editorPath: string }>(`/api/uploads/text/${filePairId}`, { content });

export const fetchAssignments = () => http.get<{ success: boolean; data: Assignment[] }>('/api/reviews/assigned');

export const submitReview = (payload: {
  assignmentId: string;
  soldStatus: 'Sold' | 'Unsold';
  reviewStatus: 'Pending' | 'OK' | 'Issue';
  comment: string;
}) => http.post<{ success: boolean }>('/api/reviews/submit', payload);

export const fetchManagerFilePairs = (params: { status?: string; search?: string; page?: number }) =>
  http.get<PaginatedResponse<FilePair>>('/api/manager/file-pairs', { params });

export const fetchQAUsers = () => http.get<{ success: boolean; data: User[] }>('/api/manager/qa-users');

export const assignFilePair = (payload: { filePairId: string; qaUserId: string }) =>
  http.post<{ success: boolean }>('/api/manager/assign', payload);

export const fetchAssignmentsForManager = (params: { teamTag?: string; qaUserId?: string; page?: number }) =>
  http.get<PaginatedResponse<Assignment>>('/api/manager/assignments', { params });

export const fetchAdminStats = () => http.get<{ success: boolean } & AdminStats>('/api/admin/stats');

export const fetchUsers = () => http.get<{ success: boolean; data: User[] }>('/api/admin/users');

export const updateUserRole = (userId: string, role: string) =>
  http.patch<{ success: boolean; user: User }>(`/api/admin/users/${userId}/role`, { role });

export const deleteUser = (userId: string) => http.delete<{ success: boolean }>(`/api/admin/users/${userId}`);

export const fetchAdminFilePairs = (params: { page?: number; status?: string; search?: string; soldStatus?: string }) =>
  http.get<PaginatedResponse<FilePair>>('/api/admin/file-pairs', { params });

export const deleteFilePairAdmin = (filePairId: string) => http.delete<{ success: boolean }>(`/api/admin/file-pairs/${filePairId}`);

/**
 * Get presigned URL for a file (audio, text, or review)
 * @param filePairId - The FilePair MongoDB ID
 * @param type - 'audio' | 'text' | 'review' (default: 'text')
 * @returns Presigned URL that expires in 1 hour
 */
export const getFilePresignedUrl = (filePairId: string, type: 'audio' | 'text' | 'review' = 'text') =>
  http.get<{ success: boolean; url: string; filename: string; type: string; expiresIn: number }>(`/file/${filePairId}`, {
    params: { type },
  });


