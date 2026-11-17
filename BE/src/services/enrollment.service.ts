import { ClassModel } from '../models/class.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { UserModel } from '../models/user.model';
import { badRequest, conflict, forbidden, notFound } from '../utils/app-error';

export interface Actor {
  id: string;
  role?: string;
}

export const enrollStudent = async (classId: string, studentId: string) => {
  const classDoc = await ClassModel.findById(classId);
  if (!classDoc) throw notFound('Lớp học không tồn tại');

  if (classDoc.status !== 'OPEN') {
    throw badRequest('Lớp học hiện không ở trạng thái mở đăng ký');
  }

  const student = await UserModel.findById(studentId);
  if (!student) throw notFound('Học viên không tồn tại');

  // Check unique compound constraint: student cannot be enrolled twice in the same class (Jira LMS-14 AC)
  const existing = await EnrollmentModel.findOne({ classId, studentId, status: 'ENROLLED' });
  if (existing) {
    throw conflict('Học viên đã được ghi danh vào lớp này');
  }

  // Check class capacity
  const currentCount = await EnrollmentModel.countDocuments({ classId, status: 'ENROLLED' });
  if (currentCount >= classDoc.maxStudents) {
    throw badRequest(`Lớp học đã đạt sĩ số tối đa (${classDoc.maxStudents} học viên)`);
  }

  // Upsert or create enrollment
  const enrollment = await EnrollmentModel.findOneAndUpdate(
    { classId, studentId },
    { status: 'ENROLLED', enrolledAt: new Date() },
    { upsert: true, returnDocument: 'after' }
  );

  return enrollment;
};

export const unenrollStudent = async (classId: string, studentId: string) => {
  const enrollment = await EnrollmentModel.findOneAndUpdate(
    { classId, studentId, status: 'ENROLLED' },
    { status: 'DROPPED' },
    { returnDocument: 'after' }
  );

  if (!enrollment) {
    throw notFound('Không tìm thấy bản ghi ghi danh của học viên trong lớp này');
  }

  return enrollment;
};

export const getClassMembers = async (classId: string, actor: Actor) => {
  const classDoc = await ClassModel.findById(classId)
    .populate('courseId', 'code name credits')
    .populate('teacherId', 'displayName email avatarUrl role phone bio createdAt');

  if (!classDoc) throw notFound('Lớp học không tồn tại');

  // Permission check: Admin, Teacher of class, or Enrolled Student (Jira LMS-14 AC)
  const isTeacher = String(classDoc.teacherId?._id || classDoc.teacherId) === actor.id;
  const isAdmin = actor.role === 'admin';
  const isEnrolled = await EnrollmentModel.exists({
    classId,
    studentId: actor.id,
    status: 'ENROLLED'
  });

  if (!isAdmin && !isTeacher && !isEnrolled) {
    throw forbidden('Bạn không có quyền xem danh sách thành viên của lớp này');
  }

  const enrollments = await EnrollmentModel.find({ classId, status: 'ENROLLED' })
    .populate('studentId', 'displayName email avatarUrl role phone bio createdAt')
    .sort({ enrolledAt: 1 });

  const members = enrollments.map((enr) => {
    const studentUser = enr.studentId as unknown as {
      _id: string;
      displayName?: string;
      email: string;
      avatarUrl?: string;
      role: string;
      phone?: string;
      bio?: string;
      createdAt?: Date;
    };

    return {
      enrollmentId: String(enr._id),
      studentId: String(studentUser?._id),
      displayName: studentUser?.displayName || 'Học viên',
      email: studentUser?.email || '',
      avatarUrl: studentUser?.avatarUrl || '',
      role: studentUser?.role || 'student',
      phone: studentUser?.phone || '',
      bio: studentUser?.bio || '',
      userCreatedAt: studentUser?.createdAt,
      enrolledAt: enr.enrolledAt,
      status: enr.status
    };
  });

  return {
    class: {
      id: String(classDoc._id),
      code: classDoc.code,
      name: classDoc.name,
      room: classDoc.room,
      startDate: classDoc.startDate,
      endDate: classDoc.endDate,
      maxStudents: classDoc.maxStudents,
      status: classDoc.status,
      course: classDoc.courseId,
      teacher: classDoc.teacherId
    },
    teacher: classDoc.teacherId,
    totalMembers: members.length + (classDoc.teacherId ? 1 : 0),
    studentsCount: members.length,
    students: members
  };
};

export const getMyEnrolledClasses = async (studentId: string) => {
  const enrollments = await EnrollmentModel.find({ studentId, status: 'ENROLLED' })
    .populate({
      path: 'classId',
      populate: [
        { path: 'courseId', select: 'code name credits description status' },
        { path: 'teacherId', select: 'displayName email avatarUrl role' }
      ]
    })
    .sort({ enrolledAt: -1 });

  return enrollments
    .filter((e) => e.classId != null)
    .map((e) => ({
      enrollmentId: String(e._id),
      enrolledAt: e.enrolledAt,
      status: e.status,
      class: e.classId
    }));
};

export const getMyTeachingClasses = async (teacherId: string) => {
  const classes = await ClassModel.find({ teacherId })
    .populate('courseId', 'code name credits description status')
    .sort({ startDate: -1 });

  const classIds = classes.map((c) => c._id);
  const counts = await EnrollmentModel.aggregate<{ _id: string; count: number }>([
    { $match: { classId: { $in: classIds }, status: 'ENROLLED' } },
    { $group: { _id: '$classId', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  return classes.map((c) => ({
    ...c.toJSON(),
    enrolledCount: countMap.get(String(c._id)) || 0
  }));
};
