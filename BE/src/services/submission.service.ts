import { Types } from 'mongoose';
import { AssignmentModel } from '../models/assignment.model';
import { ClassModel } from '../models/class.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { SubmissionDocument, SubmissionModel } from '../models/submission.model';
import { createNotification } from './notification.service';
import { badRequest, forbidden, notFound } from '../utils/app-error';
import { CreateSubmissionInput, GradeSubmissionInput } from '../validators/submission.validator';

interface AuthUserContext {
  _id: string;
  role: string;
}

export const submissionService = {
  /**
   * LMS-33 (E4-S2): Học viên nộp bài tập & cập nhật bài nộp (nộp đè trước deadline)
   */
  submitAssignment: async (
    input: CreateSubmissionInput,
    studentId: string
  ): Promise<SubmissionDocument> => {
    const assignment = await AssignmentModel.findById(input.assignmentId);
    if (!assignment) {
      throw notFound('Bài tập không tồn tại');
    }

    // 1. Deadline Enforcement (Jira LMS-33 AC)
    const now = Date.now();
    const isOverdue = now > new Date(assignment.deadlineAt).getTime();
    const isClosed = assignment.status === 'CLOSED';

    if (isOverdue || isClosed) {
      // Auto-update assignment status if overdue
      if (assignment.status !== 'CLOSED') {
        assignment.status = 'CLOSED';
        await assignment.save();
      }
      throw badRequest('Đã hết hạn nộp bài (Jira LMS-33)');
    }

    // 2. Enrollment check: student must be actively enrolled in class
    const enrollment = await EnrollmentModel.findOne({
      classId: assignment.classId,
      studentId,
      status: 'ENROLLED'
    });

    if (!enrollment) {
      throw forbidden('Bạn chưa ghi danh vào lớp học này hoặc không có quyền nộp bài');
    }

    // 3. Upsert submission (allow updating submission before deadline)
    let submission = await SubmissionModel.findOne({
      assignmentId: assignment._id,
      studentId
    });

    if (submission) {
      submission.link = input.link || '';
      submission.attachments = (input.attachments || []) as never;
      submission.note = input.note;
      submission.submittedAt = new Date();
      submission.status = 'SUBMITTED';
      await submission.save();
    } else {
      submission = await SubmissionModel.create({
        assignmentId: assignment._id,
        studentId: new Types.ObjectId(studentId),
        classId: assignment.classId,
        link: input.link || '',
        attachments: input.attachments || [],
        note: input.note,
        submittedAt: new Date(),
        status: 'SUBMITTED'
      });
    }

    return submission;
  },

  /**
   * Get student's own submission for an assignment
   */
  getMySubmission: async (assignmentId: string, studentId: string) => {
    const submission = await SubmissionModel.findOne({
      assignmentId,
      studentId
    });
    return submission;
  },

  /**
   * List all submissions for an assignment (Teacher / Admin only)
   */
  listByAssignment: async (assignmentId: string, currentUser: AuthUserContext) => {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw notFound('Bài tập không tồn tại');
    }

    const targetClass = await ClassModel.findById(assignment.classId);
    const isTeacherOfClass =
      targetClass?.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role !== 'admin' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được xem danh sách bài nộp');
    }

    const submissions = await SubmissionModel.find({ assignmentId })
      .sort({ submittedAt: -1 })
      .populate<{ studentId: { _id: Types.ObjectId; displayName?: string; email: string; avatarUrl?: string } }>({
        path: 'studentId',
        select: 'displayName email avatarUrl'
      })
      .populate<{ gradedBy?: { _id: Types.ObjectId; displayName?: string; email: string } }>({
        path: 'gradedBy',
        select: 'displayName email'
      });

    return submissions;
  },

  /**
   * Grade a submission (Teacher / Admin only)
   */
  gradeSubmission: async (
    submissionId: string,
    input: GradeSubmissionInput,
    currentUser: AuthUserContext
  ) => {
    const submission = await SubmissionModel.findById(submissionId);
    if (!submission) {
      throw notFound('Bài nộp không tồn tại');
    }

    const targetClass = await ClassModel.findById(submission.classId);
    const isTeacherOfClass =
      targetClass?.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role !== 'admin' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được chấm điểm bài nộp');
    }

    submission.score = input.score;
    submission.feedback = input.feedback;
    submission.status = 'GRADED';
    submission.gradedBy = new Types.ObjectId(currentUser._id);
    submission.gradedAt = new Date();

    await submission.save();

    void createNotification({
      recipientId: submission.studentId,
      senderId: currentUser._id,
      title: 'Bài tập đã được chấm điểm',
      message: `Bài tập của bạn đã được chấm: ${input.score} điểm.`,
      type: 'GRADE',
      link: `/classes/${submission.classId}?tab=gradebook`,
    }).catch(() => {});

    return submission;
  },

  /**
   * Epic 5: Class Gradebook Matrix
   */
  getGradebook: async (classId: string, currentUser: AuthUserContext) => {
    const targetClass = await ClassModel.findById(classId);
    if (!targetClass) {
      throw notFound('Lớp học không tồn tại');
    }

    const isTeacherOfClass =
      targetClass.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role === 'teacher' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được xem toàn bộ bảng điểm lớp học');
    }

    if (currentUser.role === 'student') {
      const isEnrolled = await EnrollmentModel.exists({
        classId,
        studentId: currentUser._id,
        status: 'ENROLLED'
      });
      if (!isEnrolled) {
        throw forbidden('Bạn chưa ghi danh vào lớp học này');
      }
    }

    const [assignments, enrollments, submissions] = await Promise.all([
      AssignmentModel.find({ classId }).sort({ deadlineAt: 1, createdAt: 1 }).lean(),
      EnrollmentModel.find({ classId, status: 'ENROLLED' })
        .populate<{ studentId: { _id: Types.ObjectId; displayName?: string; email: string; avatarUrl?: string } }>({
          path: 'studentId',
          select: 'displayName email avatarUrl'
        })
        .sort({ createdAt: 1 })
        .lean(),
      SubmissionModel.find({ classId }).lean()
    ]);

    // Map `studentId_assignmentId` -> submission
    const subMap = new Map<string, (typeof submissions)[0]>();
    for (const sub of submissions) {
      subMap.set(`${String(sub.studentId)}_${String(sub.assignmentId)}`, sub);
    }

    const students = enrollments
      .map((enrollment) => {
        const student = enrollment.studentId;
        if (!student) return null;
        const sId = String(student._id);

        let sumScore = 0;
        let gradedCount = 0;
        let submittedCount = 0;

        const grades = assignments.map((a) => {
          const aId = String(a._id);
          const sub = subMap.get(`${sId}_${aId}`);
          if (sub) {
            submittedCount++;
            if (sub.status === 'GRADED' && typeof sub.score === 'number') {
              gradedCount++;
              sumScore += sub.score;
            }
            return {
              assignmentId: aId,
              submissionId: String(sub._id),
              status: sub.status,
              score: sub.score ?? null,
              feedback: sub.feedback || null,
              submittedAt: sub.submittedAt
            };
          }
          return {
            assignmentId: aId,
            submissionId: null,
            status: 'NOT_SUBMITTED',
            score: 0,
            feedback: null,
            submittedAt: null
          };
        });

        // Sum across all assignments in the class, defaulting unsubmitted to 0
        const totalAssignments = assignments.length;
        const gpa =
          totalAssignments > 0 ? Number((sumScore / totalAssignments).toFixed(2)) : null;
        const finalGpa = gpa;

        let letterGrade = 'Chưa xếp loại';
        if (gpa !== null) {
          if (gpa >= 9.0) letterGrade = 'A+ (Xuất sắc)';
          else if (gpa >= 8.0) letterGrade = 'A (Giỏi)';
          else if (gpa >= 6.5) letterGrade = 'B (Khá)';
          else if (gpa >= 5.0) letterGrade = 'C (Trung bình)';
          else letterGrade = 'F (Chưa đạt)';
        }

        return {
          studentId: sId,
          displayName: student.displayName || 'Học viên',
          email: student.email,
          avatarUrl: student.avatarUrl || '',
          grades,
          gradedCount,
          submittedCount,
          gpa,
          finalGpa,
          letterGrade
        };
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    // Calculate class averages for each assignment
    const assignmentStats = assignments.map((a) => {
      const aId = String(a._id);
      let totalScore = 0;
      let countWithScore = 0;
      let subCount = 0;

      for (const s of students) {
        const gr = s.grades.find((g) => g.assignmentId === aId);
        if (gr && gr.status !== 'NOT_SUBMITTED') {
          subCount++;
          if (typeof gr.score === 'number') {
            totalScore += gr.score;
            countWithScore++;
          }
        }
      }

      // If at least one student is graded, average across all enrolled students (unsubmitted = 0)
      const averageScore =
        countWithScore > 0 && students.length > 0
          ? Number((totalScore / students.length).toFixed(2))
          : null;

      return {
        assignmentId: aId,
        title: a.title,
        category: a.category || 'REGULAR',
        maxScore: a.maxScore,
        deadlineAt: a.deadlineAt,
        status: a.status,
        submittedCount: subCount,
        gradedCount: countWithScore,
        averageScore
      };
    });

    // Overall class GPA
    const validGpas = students.map((s) => s.gpa).filter((g): g is number => g !== null);
    const classOverallGpa =
      validGpas.length > 0
        ? Number((validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2))
        : null;

    // Role-based visibility:
    // If student, only return current student's record + class summary statistics (privacy preservation)
    const returnedStudents =
      currentUser.role === 'student'
        ? students.filter((s) => s.studentId === String(currentUser._id))
        : students;

    return {
      class: {
        _id: targetClass._id,
        code: targetClass.code,
        name: targetClass.name,
        room: targetClass.room,
        totalEnrolled: students.length
      },
      assignments: assignmentStats,
      students: returnedStudents,
      classStats: {
        totalStudents: students.length,
        totalAssignments: assignments.length,
        classOverallGpa
      }
    };
  },

  /**
   * Epic 5: Export Gradebook CSV (UTF-8 BOM for Excel)
   */
  exportGradebookCsv: async (classId: string, currentUser: AuthUserContext) => {
    const gradebookData = await submissionService.getGradebook(classId, currentUser);
    const { class: cls, assignments, students, classStats } = gradebookData;

    // Header row
    const headers = [
      'STT',
      'Mã SV / Email',
      'Họ và tên',
      ...assignments.map((a) => `${a.title} (${a.category === 'MIDTERM' ? 'Giữa kỳ' : a.category === 'FINAL' ? 'Cuối kỳ' : 'Bài tập'})`),
      'Điểm TB (GPA)',
      'Xếp loại'
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];
    rows.push(headers.map(escapeCsv).join(','));

    students.forEach((s, idx) => {
      const studentGrades = assignments.map((a) => {
        const gr = s.grades.find((g) => g.assignmentId === a.assignmentId);
        if (gr?.status === 'NOT_SUBMITTED') return '0 (Chưa nộp)';
        if (gr?.status === 'SUBMITTED' && (gr?.score === null || gr?.score === undefined)) return 'Chờ chấm';
        return gr && typeof gr.score === 'number' ? gr.score : 0;
      });

      const row = [
        idx + 1,
        s.email,
        s.displayName,
        ...studentGrades,
        s.gpa !== null ? s.gpa : 'N/A',
        s.letterGrade
      ];
      rows.push(row.map(escapeCsv).join(','));
    });

    // Summary row
    const summaryRow = [
      '',
      'ĐIỂM TRUNG BÌNH CẢ LỚP',
      `Sĩ số: ${students.length}`,
      ...assignments.map((a) => (a.averageScore !== null ? a.averageScore : 'N/A')),
      classStats.classOverallGpa !== null ? classStats.classOverallGpa : 'N/A',
      ''
    ];
    rows.push(summaryRow.map(escapeCsv).join(','));

    // UTF-8 BOM prefix \uFEFF ensures Excel displays Vietnamese correctly
    const csvContent = '\uFEFF' + rows.join('\r\n');
    return {
      filename: `bang-diem-${cls.code || 'lop-hoc'}.csv`,
      content: csvContent
    };
  }
};
