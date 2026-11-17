export interface AssignmentAttachment {
  title: string;
  url: string;
}

export interface SubmissionAttachment {
  name: string;
  url: string;
  publicId?: string;
  size?: number;
  mimeType?: string;
}

export interface SubmissionUser {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export interface Submission {
  _id: string;
  assignmentId: string;
  studentId: string | SubmissionUser;
  classId: string;
  link?: string;
  attachments?: SubmissionAttachment[];
  note?: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
  score?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentStats {
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
}

export interface AssignmentTeacher {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export type AssignmentCategory = 'REGULAR' | 'MIDTERM' | 'FINAL' | 'OTHER';

export interface Assignment {
  _id: string;
  classId: string;
  teacherId: string | AssignmentTeacher;
  title: string;
  description: string;
  deadlineAt: string;
  maxScore: number;
  category?: AssignmentCategory;
  attachments?: AssignmentAttachment[];
  status: 'PUBLISHED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  mySubmission?: Submission | null;
  stats?: AssignmentStats;
  enrolledCount?: number;
  submissionsCount?: number;
}

export interface CreateAssignmentInput {
  classId: string;
  title: string;
  description: string;
  deadlineAt: string;
  maxScore: number;
  category?: AssignmentCategory;
  attachments?: AssignmentAttachment[];
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  deadlineAt?: string;
  maxScore?: number;
  category?: AssignmentCategory;
  attachments?: AssignmentAttachment[];
  status?: 'PUBLISHED' | 'CLOSED';
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  link?: string;
  attachments?: SubmissionAttachment[];
  note?: string;
}

export interface GradeSubmissionInput {
  score: number;
  feedback?: string;
}

export interface StudentGradeItem {
  assignmentId: string;
  submissionId: string | null;
  status: 'SUBMITTED' | 'GRADED' | 'NOT_SUBMITTED';
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
}

export interface GradebookStudent {
  studentId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  grades: StudentGradeItem[];
  gradedCount: number;
  submittedCount: number;
  gpa: number | null;
  finalGpa: number | null;
  letterGrade: string;
}

export interface GradebookAssignment {
  assignmentId: string;
  title: string;
  category: AssignmentCategory;
  maxScore: number;
  deadlineAt: string;
  status: 'PUBLISHED' | 'CLOSED';
  submittedCount: number;
  gradedCount: number;
  averageScore: number | null;
}

export interface ClassGradebookData {
  class: {
    _id: string;
    code: string;
    name: string;
    room?: string;
    totalEnrolled: number;
  };
  assignments: GradebookAssignment[];
  students: GradebookStudent[];
  classStats: {
    totalStudents: number;
    totalAssignments: number;
    classOverallGpa: number | null;
  };
}
