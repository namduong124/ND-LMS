import { http } from '@/shared/api/http';
import type {
  Assignment,
  ClassGradebookData,
  CreateAssignmentInput,
  GradeSubmissionInput,
  Submission,
  SubmissionAttachment,
  SubmitAssignmentInput,
  UpdateAssignmentInput
} from '../types/assignment.types';

interface ApiResponse<T> {
  message?: string;
  data: T;
}

export const assignmentsApi = {
  // Assignments
  listClassAssignments: async (classId: string): Promise<Assignment[]> => {
    const res = await http.get<ApiResponse<Assignment[]> | Assignment[]>('/assignments', {
      params: { classId }
    });
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
      return body.data;
    }
    return Array.isArray(body) ? body : [];
  },

  getAssignment: async (id: string): Promise<Assignment> => {
    const res = await http.get<ApiResponse<Assignment> | Assignment>(`/assignments/${id}`);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Assignment>).data;
    }
    return body as Assignment;
  },

  createAssignment: async (data: CreateAssignmentInput): Promise<Assignment> => {
    const res = await http.post<ApiResponse<Assignment> | Assignment>('/assignments', data);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Assignment>).data;
    }
    return body as Assignment;
  },

  updateAssignment: async (id: string, data: UpdateAssignmentInput): Promise<Assignment> => {
    const res = await http.patch<ApiResponse<Assignment> | Assignment>(`/assignments/${id}`, data);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Assignment>).data;
    }
    return body as Assignment;
  },

  deleteAssignment: async (id: string): Promise<void> => {
    await http.delete(`/assignments/${id}`);
  },

  // Submissions
  uploadSubmissionAttachment: async (file: File): Promise<SubmissionAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await http.post<ApiResponse<SubmissionAttachment> | SubmissionAttachment>(
      '/submissions/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<SubmissionAttachment>).data;
    }
    return body as SubmissionAttachment;
  },

  submitAssignment: async (data: SubmitAssignmentInput): Promise<Submission> => {
    const res = await http.post<ApiResponse<Submission> | Submission>('/submissions', data);
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Submission>).data;
    }
    return body as Submission;
  },

  getMySubmission: async (assignmentId: string): Promise<Submission | null> => {
    const res = await http.get<ApiResponse<Submission | null> | Submission | null>('/submissions/my', {
      params: { assignmentId }
    });
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Submission | null>).data;
    }
    return (body as Submission) || null;
  },

  listSubmissions: async (assignmentId: string): Promise<Submission[]> => {
    const res = await http.get<ApiResponse<Submission[]> | Submission[]>('/submissions', {
      params: { assignmentId }
    });
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body && Array.isArray(body.data)) {
      return body.data;
    }
    return Array.isArray(body) ? body : [];
  },

  gradeSubmission: async (submissionId: string, data: GradeSubmissionInput): Promise<Submission> => {
    const res = await http.patch<ApiResponse<Submission> | Submission>(
      `/submissions/${submissionId}/grade`,
      data
    );
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<Submission>).data;
    }
    return body as Submission;
  },

  // Epic 5: Class Gradebook Matrix & CSV Export
  getClassGradebook: async (classId: string): Promise<ClassGradebookData> => {
    const res = await http.get<ApiResponse<ClassGradebookData> | ClassGradebookData>(
      `/classes/${classId}/gradebook`
    );
    const body = res.data;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as ApiResponse<ClassGradebookData>).data;
    }
    return body as ClassGradebookData;
  },

  exportClassGradebookCsv: async (classId: string): Promise<Blob> => {
    const res = await http.get(`/classes/${classId}/gradebook/export`, {
      responseType: 'blob'
    });
    return res.data;
  }
};
