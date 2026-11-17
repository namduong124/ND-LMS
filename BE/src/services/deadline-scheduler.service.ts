import cron, { ScheduledTask } from 'node-cron';
import { AssignmentModel } from '../models/assignment.model';
import { ClassModel } from '../models/class.model';
import { EnrollmentModel } from '../models/enrollment.model';
import { createNotification } from './notification.service';
import { emitToAll } from './socket.service';

let scheduledTask: ScheduledTask | null = null;

/**
 * LMS-37 (E4-S3): Scheduler Tự động quét và khóa bài tập khi hết hạn
 * Scans all assignments where status is 'PUBLISHED' and deadlineAt <= now,
 * then transitions them to 'CLOSED' and emits Realtime Socket.io events.
 */
export const closeOverdueAssignments = async (): Promise<number> => {
  try {
    const now = new Date();
    const overdueAssignments = await AssignmentModel.find({
      status: 'PUBLISHED',
      deadlineAt: { $lte: now }
    });

    if (overdueAssignments.length === 0) return 0;

    const ids = overdueAssignments.map((a) => a._id);
    const result = await AssignmentModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'CLOSED' } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Deadline Scheduler] Tự động khóa ${result.modifiedCount} bài tập quá hạn nộp lúc ${now.toISOString()} (Jira LMS-37)`
      );

      // Realtime Socket.io emission & In-app notifications
      for (const a of overdueAssignments) {
        emitToAll('assignment:closed', {
          assignmentId: a._id.toString(),
          classId: a.classId.toString(),
          title: a.title
        });

        void (async () => {
          try {
            const enrollments = await EnrollmentModel.find({ classId: a.classId }).select('studentId');
            await Promise.all(
              enrollments.map((enr) =>
                createNotification({
                  recipientId: enr.studentId,
                  title: 'Hết hạn nộp bài tập',
                  message: `Bài tập "${a.title}" đã chính thức hết hạn nộp và tự động khóa nhận bài.`,
                  type: 'ASSIGNMENT',
                  link: `/classes/${a.classId}?tab=assignments`
                })
              )
            );
          } catch {
            // Ignore background notification errors
          }
        })();
      }
    }

    return result.modifiedCount;
  } catch (error) {
    console.error('[Deadline Scheduler] Lỗi khi quét bài tập quá hạn:', error);
    return 0;
  }
};

/**
 * Tự động chuyển trạng thái lớp học từ OPEN sang CLOSED khi lớp kết thúc (endDate <= now)
 * và phát sự kiện Realtime Socket.io.
 */
export const closeEndedClasses = async (): Promise<number> => {
  try {
    const now = new Date();
    const endedClasses = await ClassModel.find({
      status: 'OPEN',
      endDate: { $lte: now }
    });

    if (endedClasses.length === 0) return 0;

    const ids = endedClasses.map((c) => c._id);
    const result = await ClassModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'CLOSED' } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Class Scheduler] Tự động đóng ${result.modifiedCount} lớp học đã kết thúc lúc ${now.toISOString()}`
      );

      for (const c of endedClasses) {
        emitToAll('class:closed', {
          classId: c._id.toString(),
          name: c.name
        });

        void (async () => {
          try {
            const enrollments = await EnrollmentModel.find({ classId: c._id }).select('studentId');
            const recipients = enrollments.map((e) => e.studentId);
            if (c.teacherId) recipients.push(c.teacherId);

            await Promise.all(
              recipients.map((recipientId) =>
                createNotification({
                  recipientId,
                  title: 'Lớp học kết thúc',
                  message: `Lớp học "${c.name}" đã hoàn thành thời gian đào tạo theo kế hoạch.`,
                  type: 'SYSTEM',
                  link: `/classes/${c._id}`
                })
              )
            );
          } catch {
            // Ignore background errors
          }
        })();
      }
    }

    return result.modifiedCount;
  } catch (error) {
    console.error('[Class Scheduler] Lỗi khi quét lớp học kết thúc:', error);
    return 0;
  }
};

/**
 * Starts the cron job running every 1 minute ('* * * * *')
 */
export const startDeadlineScheduler = (): ScheduledTask => {
  if (scheduledTask) {
    return scheduledTask;
  }

  // Run once immediately on start
  void closeOverdueAssignments();
  void closeEndedClasses();

  // Run every 1 minute
  scheduledTask = cron.schedule('* * * * *', async () => {
    await closeOverdueAssignments();
    await closeEndedClasses();
  });

  console.log('[Scheduler] Scheduler tự động khóa bài tập & đóng lớp kết thúc đã khởi chạy (chu kỳ: mỗi 1 phút)');
  return scheduledTask;
};

/**
 * Stop the cron job (for testing or graceful shutdown)
 */
export const stopDeadlineScheduler = (): void => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Đã dừng scheduler tự động');
  }
};
