import { Types } from 'mongoose';
import { ClassModel } from '../models/class.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { ScheduleDocument, ScheduleModel } from '../models/schedule.model';
import { UserModel } from '../models/user.model';
import { badRequest, conflict, notFound } from '../utils/app-error';
import { CreateScheduleInput, timeToMinutes, UpdateScheduleInput } from '../validators/schedule.validator';
import { createNotification } from './notification.service';
import { emitToAll } from './socket.service';

interface ConflictCheckParams {
  classId: string | Types.ObjectId;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  excludeScheduleId?: string | Types.ObjectId;
}

/**
 * Validates whether the assigned teacher has overlapping teaching slots
 * across any classes on the specified day of week (Jira LMS-20 & LMS-22 AC).
 */
export const detectTeacherConflict = async ({
  classId,
  dayOfWeek,
  startTime,
  endTime,
  excludeScheduleId
}: ConflictCheckParams) => {
  const targetClass = await ClassModel.findById(classId);
  if (!targetClass) throw notFound('Lớp học không tồn tại');

  // If no teacher is assigned to this class yet, skip teacher conflict check
  if (!targetClass.teacherId) return;

  // 1. Find all classes taught by this teacher that are not cancelled
  const teacherClasses = await ClassModel.find({
    teacherId: targetClass.teacherId,
    status: { $ne: 'CANCELLED' }
  });

  const teacherClassIds = teacherClasses.map((c) => c._id);

  // 2. Find all existing schedules for this teacher on the same dayOfWeek
  const query: Record<string, unknown> = {
    classId: { $in: teacherClassIds },
    dayOfWeek
  };

  if (excludeScheduleId) {
    query._id = { $ne: excludeScheduleId };
  }

  const existingSchedules = await ScheduleModel.find(query).populate<{ classId: { _id: Types.ObjectId; code: string; name: string } }>({
    path: 'classId',
    select: 'code name'
  });

  const newStartMin = timeToMinutes(startTime);
  const newEndMin = timeToMinutes(endTime);

  for (const s of existingSchedules) {
    const existingStartMin = timeToMinutes(s.startTime);
    const existingEndMin = timeToMinutes(s.endTime);

    // Overlap condition: startA < endB && endA > startB
    if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
      const dayLabel = s.dayOfWeek === 8 ? 'Chủ Nhật' : `Thứ ${s.dayOfWeek}`;
      const conflictClassName = s.classId?.name || 'Lớp khác';
      const conflictClassCode = s.classId?.code || '';

      throw conflict(
        `Giảng viên bị trùng lịch dạy vào ${dayLabel} (${s.startTime} - ${s.endTime}) tại lớp ${conflictClassCode} - ${conflictClassName}. Vui lòng chọn khung giờ khác.`
      );
    }
  }
};

export const createSchedule = async (input: CreateScheduleInput) => {
  // Validate teacher conflict (Jira LMS-20 AC)
  await detectTeacherConflict({
    classId: input.classId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime
  });

  const doc = await ScheduleModel.create(input);

  emitToAll('schedule:updated', { classId: input.classId });

  void (async () => {
    try {
      const enrollments = await EnrollmentModel.find({ classId: input.classId }).select('studentId');
      const targetClass = await ClassModel.findById(input.classId);
      const dayLabels: Record<number, string> = {
        0: 'Chủ Nhật',
        1: 'Thứ Hai',
        2: 'Thứ Ba',
        3: 'Thứ Tư',
        4: 'Thứ Năm',
        5: 'Thứ Sáu',
        6: 'Thứ Bảy',
      };
      const dayText = dayLabels[input.dayOfWeek] ?? `Thứ ${input.dayOfWeek}`;
      const promises = enrollments.map((enr) =>
        createNotification({
          recipientId: enr.studentId,
          title: `Lịch học mới: ${targetClass?.name || 'Lớp học'}`,
          message: `Lớp ${targetClass?.name || ''} có lịch học vào ${dayText} (${input.startTime} - ${input.endTime})${input.roomOrLink ? ` tại ${input.roomOrLink}` : ''}.`,
          type: 'SCHEDULE',
          link: '/timetable',
        })
      );
      await Promise.all(promises);
    } catch {
      // Ignore background notification errors
    }
  })();

  return doc.populate([
    {
      path: 'classId',
      select: 'code name room startDate endDate status',
      populate: [
        { path: 'courseId', select: 'code name credits' },
        { path: 'teacherId', select: 'displayName email avatarUrl' }
      ]
    }
  ]);
};

export const updateSchedule = async (id: string, input: UpdateScheduleInput) => {
  const schedule = await ScheduleModel.findById(id);
  if (!schedule) throw notFound('Lịch học không tồn tại');

  const dayOfWeek = input.dayOfWeek ?? schedule.dayOfWeek;
  const startTime = input.startTime ?? schedule.startTime;
  const endTime = input.endTime ?? schedule.endTime;

  // Validate teacher conflict when day or time is updated
  await detectTeacherConflict({
    classId: schedule.classId,
    dayOfWeek,
    startTime,
    endTime,
    excludeScheduleId: schedule._id
  });

  Object.assign(schedule, input);
  await schedule.save();

  emitToAll('schedule:updated', { classId: schedule.classId });

  return schedule.populate([
    {
      path: 'classId',
      select: 'code name room startDate endDate status',
      populate: [
        { path: 'courseId', select: 'code name credits' },
        { path: 'teacherId', select: 'displayName email avatarUrl' }
      ]
    }
  ]);
};

export const deleteSchedule = async (id: string) => {
  const schedule = await ScheduleModel.findByIdAndDelete(id);
  if (!schedule) throw notFound('Lịch học không tồn tại');
  emitToAll('schedule:updated', { classId: schedule.classId });
  return { id };
};

export const getSchedulesByClass = async (classId: string) => {
  const schedules = await ScheduleModel.find({ classId })
    .populate([
      {
        path: 'classId',
        select: 'code name room startDate endDate status',
        populate: [
          { path: 'courseId', select: 'code name credits' },
          { path: 'teacherId', select: 'displayName email avatarUrl' }
        ]
      }
    ])
    .sort({ dayOfWeek: 1, startTime: 1 });

  return schedules;
};

interface UserActor {
  id: string;
  role: string;
}

/**
 * Returns personalized weekly timetable combining all active classes
 * the user is currently teaching or enrolled in (Jira LMS-24 & LMS-25 AC).
 */
export const getMyTimetable = async (actor: UserActor) => {
  let userRole = actor.role;
  if (!userRole) {
    const userDoc = await UserModel.findById(actor.id).select('role');
    userRole = userDoc?.role || 'student';
  }

  let targetClassIds: Types.ObjectId[] = [];

  if (userRole === 'teacher') {
    // 1. For Teachers: classes they are assigned to teach
    const teachingClasses = await ClassModel.find({
      teacherId: actor.id,
      status: { $in: ['OPEN', 'IN_PROGRESS'] }
    }).select('_id');
    targetClassIds = teachingClasses.map((c) => c._id as Types.ObjectId);
  } else if (userRole === 'admin') {
    // 2. For Admins: all active classes across the institution
    const allClasses = await ClassModel.find({
      status: { $in: ['OPEN', 'IN_PROGRESS'] }
    }).select('_id');
    targetClassIds = allClasses.map((c) => c._id as Types.ObjectId);
  } else {
    // 3. For Students / Regular Users: classes they are actively enrolled in
    const enrollments = await EnrollmentModel.find({
      studentId: actor.id,
      status: 'ENROLLED'
    }).select('classId');
    const enrolledClassIds = enrollments.map((e) => e.classId);

    const studentClasses = await ClassModel.find({
      _id: { $in: enrolledClassIds },
      status: { $in: ['OPEN', 'IN_PROGRESS'] }
    }).select('_id');
    targetClassIds = studentClasses.map((c) => c._id as Types.ObjectId);
  }

  if (targetClassIds.length === 0) {
    return [];
  }

  const schedules = await ScheduleModel.find({
    classId: { $in: targetClassIds }
  })
    .populate([
      {
        path: 'classId',
        select: 'code name room startDate endDate status maxStudents',
        populate: [
          { path: 'courseId', select: 'code name credits description' },
          { path: 'teacherId', select: 'displayName email avatarUrl role phone bio' }
        ]
      }
    ])
    .sort({ dayOfWeek: 1, startTime: 1 });

  return schedules;
};
