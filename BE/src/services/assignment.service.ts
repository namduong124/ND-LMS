import { Types } from 'mongoose';
import { AssignmentDocument, AssignmentModel } from '../models/assignment.model';
import { ClassModel } from '../models/class.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { SubmissionModel } from '../models/submission.model';
import { badRequest, forbidden, notFound } from '../utils/app-error';
import { CreateAssignmentInput, UpdateAssignmentInput } from '../validators/assignment.validator';
import { createNotification } from './notification.service';
import { emitToAll } from './socket.service';

interface AuthUserContext {
  _id: string;
  role: string;
}

export const assignmentService = {
  /**
   * LMS-29 (E4-S1): Giảng viên giao bài tập kèm deadline
   */
  createAssignment: async (
    input: CreateAssignmentInput,
    currentUser: AuthUserContext
  ): Promise<AssignmentDocument> => {
    const targetClass = await ClassModel.findById(input.classId);
    if (!targetClass) {
      throw notFound('Lớp học không tồn tại');
    }

    // Permission check: Admin or Teacher of this class
    const isTeacherOfClass =
      targetClass.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role !== 'admin' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được tạo bài tập trong lớp này (Jira LMS-29)');
    }

    // Deadline validation: deadlineAt > now
    const deadlineDate = new Date(input.deadlineAt);
    if (deadlineDate.getTime() <= Date.now()) {
      throw badRequest('Hạn nộp bài phải lớn hơn thời gian hiện tại (deadlineAt > now)');
    }

    const assignment = await AssignmentModel.create({
      title: input.title,
      description: input.description,
      classId: new Types.ObjectId(input.classId),
      teacherId: targetClass.teacherId || new Types.ObjectId(currentUser._id),
      deadlineAt: deadlineDate,
      maxScore: input.maxScore ?? 10,
      category: input.category || 'REGULAR',
      attachments: input.attachments || [],
      status: input.status || 'PUBLISHED'
    });

    if (assignment.status === 'PUBLISHED') {
      emitToAll('assignment:created', {
        assignmentId: assignment._id.toString(),
        classId: targetClass._id.toString(),
        title: assignment.title,
      });

      void (async () => {
        try {
          const enrollments = await EnrollmentModel.find({ classId: targetClass._id }).select('studentId');
          const promises = enrollments.map((enr) =>
            createNotification({
              recipientId: enr.studentId,
              senderId: currentUser._id,
              title: `Bài tập mới: ${assignment.title}`,
              message: `Lớp ${targetClass.name} vừa có bài tập mới. Hạn nộp: ${deadlineDate.toLocaleDateString('vi-VN')}`,
              type: 'ASSIGNMENT',
              link: `/classes/${targetClass._id}?tab=assignments`,
            })
          );
          await Promise.all(promises);
        } catch {
          // Ignore background notification errors
        }
      })();
    }

    return assignment;
  },

  /**
   * List assignments of a specific class
   */
  listByClass: async (classId: string, currentUser?: AuthUserContext) => {
    const targetClass = await ClassModel.findById(classId);
    if (!targetClass) {
      throw notFound('Lớp học không tồn tại');
    }

    const assignments = await AssignmentModel.find({ classId })
      .sort({ createdAt: -1 })
      .populate<{ teacherId: { _id: Types.ObjectId; displayName?: string; email: string } }>({
        path: 'teacherId',
        select: 'displayName email avatarUrl'
      });

    // If current user is a student, attach their submission status for each assignment
    if (currentUser && currentUser.role === 'student') {
      const studentSubmissions = await SubmissionModel.find({
        classId,
        studentId: currentUser._id
      });

      const submissionMap = new Map<string, unknown>();
      for (const sub of studentSubmissions) {
        submissionMap.set(String(sub.assignmentId), sub);
      }

      return assignments.map((a) => {
        const doc = a.toJSON();
        const mySub = submissionMap.get(String(a._id));
        return {
          ...doc,
          mySubmission: mySub || null
        };
      });
    }

    // If teacher/admin, attach submission counts and total enrolled students
    const assignmentIds = assignments.map((a) => a._id);
    const [submissionStats, enrolledCount] = await Promise.all([
      SubmissionModel.aggregate<{ _id: Types.ObjectId; count: number; gradedCount: number }>([
        { $match: { assignmentId: { $in: assignmentIds } } },
        {
          $group: {
            _id: '$assignmentId',
            count: { $sum: 1 },
            gradedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'GRADED'] }, 1, 0] }
            }
          }
        }
      ]),
      EnrollmentModel.countDocuments({
        classId,
        status: 'ENROLLED'
      })
    ]);

    const statsMap = new Map<string, { count: number; gradedCount: number }>();
    for (const st of submissionStats) {
      statsMap.set(String(st._id), { count: st.count, gradedCount: st.gradedCount });
    }

    return assignments.map((a) => {
      const doc = a.toJSON();
      const st = statsMap.get(String(a._id)) || { count: 0, gradedCount: 0 };
      return {
        ...doc,
        submissionsCount: st.count,
        enrolledCount,
        stats: {
          totalStudents: enrolledCount,
          submittedCount: st.count,
          gradedCount: st.gradedCount
        }
      };
    });
  },

  /**
   * Get single assignment detail
   */
  getById: async (assignmentId: string, currentUser?: AuthUserContext) => {
    const assignment = await AssignmentModel.findById(assignmentId)
      .populate<{ classId: { _id: Types.ObjectId; code: string; name: string; teacherId: Types.ObjectId } }>({
        path: 'classId',
        select: 'code name teacherId'
      })
      .populate<{ teacherId: { _id: Types.ObjectId; displayName?: string; email: string } }>({
        path: 'teacherId',
        select: 'displayName email avatarUrl'
      });

    if (!assignment) {
      throw notFound('Bài tập không tồn tại');
    }

    const doc = assignment.toJSON();

    if (currentUser && currentUser.role === 'student') {
      const mySubmission = await SubmissionModel.findOne({
        assignmentId,
        studentId: currentUser._id
      });
      return {
        ...doc,
        mySubmission: mySubmission || null
      };
    }

    const submissionsCount = await SubmissionModel.countDocuments({ assignmentId });
    return {
      ...doc,
      submissionsCount
    };
  },

  /**
   * Update assignment
   */
  updateAssignment: async (
    assignmentId: string,
    input: UpdateAssignmentInput,
    currentUser: AuthUserContext
  ) => {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw notFound('Bài tập không tồn tại');
    }

    const targetClass = await ClassModel.findById(assignment.classId);
    const isTeacherOfClass =
      targetClass?.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role !== 'admin' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được chỉnh sửa bài tập');
    }

    if (input.deadlineAt) {
      const deadlineDate = new Date(input.deadlineAt);
      if (deadlineDate.getTime() <= Date.now()) {
        throw badRequest('Hạn nộp mới phải lớn hơn thời gian hiện tại');
      }
      assignment.deadlineAt = deadlineDate;
    }

    if (input.title !== undefined) assignment.title = input.title;
    if (input.description !== undefined) assignment.description = input.description;
    if (input.maxScore !== undefined) assignment.maxScore = input.maxScore;
    if (input.category !== undefined) assignment.category = input.category;
    if (input.attachments !== undefined) assignment.attachments = input.attachments;
    if (input.status !== undefined) assignment.status = input.status;

    await assignment.save();

    emitToAll('assignment:updated', {
      assignmentId: assignment._id.toString(),
      classId: assignment.classId.toString(),
      title: assignment.title,
      deadlineAt: assignment.deadlineAt,
      status: assignment.status,
    });

    if (input.deadlineAt) {
      void (async () => {
        try {
          const enrollments = await EnrollmentModel.find({ classId: assignment.classId }).select('studentId');
          await Promise.all(
            enrollments.map((enr) =>
              createNotification({
                recipientId: enr.studentId,
                senderId: currentUser._id,
                title: `Gia hạn bài tập: ${assignment.title}`,
                message: `Hạn nộp bài tập "${assignment.title}" đã được điều chỉnh đến ${assignment.deadlineAt.toLocaleString('vi-VN')}.`,
                type: 'ASSIGNMENT',
                link: `/classes/${assignment.classId}?tab=assignments`,
              })
            )
          );
        } catch {
          // Ignore
        }
      })();
    }

    return assignment;
  },

  /**
   * Delete assignment
   */
  deleteAssignment: async (assignmentId: string, currentUser: AuthUserContext) => {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw notFound('Bài tập không tồn tại');
    }

    const targetClass = await ClassModel.findById(assignment.classId);
    const isTeacherOfClass =
      targetClass?.teacherId && String(targetClass.teacherId) === String(currentUser._id);

    if (currentUser.role !== 'admin' && !isTeacherOfClass) {
      throw forbidden('Chỉ giảng viên phụ trách lớp mới được xóa bài tập');
    }

    await AssignmentModel.findByIdAndDelete(assignmentId);
    await SubmissionModel.deleteMany({ assignmentId });

    emitToAll('assignment:deleted', {
      assignmentId,
      classId: assignment.classId.toString(),
    });

    return { message: 'Đã xóa bài tập thành công' };
  }
};
