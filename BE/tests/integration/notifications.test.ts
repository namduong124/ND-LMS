import { describe, expect, it } from 'vitest';
import { NotificationModel } from '../../src/models/notification.model';
import { createNotification } from '../../src/services/notification.service';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Notification & Socket API (Epic 6)', () => {
  it('rejects unauthenticated requests to /api/notifications', async () => {
    const res = await api().get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('lists notifications for the authenticated user and calculates unreadCount', async () => {
    const student1 = await createUser({ role: 'student', email: 'stu1@example.com' });
    const student2 = await createUser({ role: 'student', email: 'stu2@example.com' });

    // Create notifications for student1
    await createNotification({
      recipientId: student1._id,
      title: 'Thông báo 1',
      message: 'Nội dung thông báo 1',
      type: 'GENERAL',
    });
    await createNotification({
      recipientId: student1._id,
      title: 'Thông báo 2',
      message: 'Nội dung thông báo 2',
      type: 'ASSIGNMENT',
    });

    // Create notification for student2
    await createNotification({
      recipientId: student2._id,
      title: 'Thông báo của student 2',
      message: 'Chỉ riêng student 2',
      type: 'SYSTEM',
    });

    const res = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(student1));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.unreadCount).toBe(2);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.notifications[0].title).toBe('Thông báo 2'); // Sorted descending
  });

  it('marks a single notification as read', async () => {
    const user = await createUser({ role: 'student', email: 'markread@example.com' });
    const notif = await createNotification({
      recipientId: user._id,
      title: 'Bài tập mới',
      message: 'Vui lòng nộp trước hạn',
      type: 'ASSIGNMENT',
    });

    const res = await api()
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', bearerFor(user));

    expect(res.status).toBe(200);
    expect(res.body.isRead).toBe(true);

    const check = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(user));
    expect(check.body.unreadCount).toBe(0);
  });

  it('prevents a user from marking another users notification as read', async () => {
    const user1 = await createUser({ email: 'u1@example.com' });
    const user2 = await createUser({ email: 'u2@example.com' });

    const notif = await createNotification({
      recipientId: user1._id,
      title: 'Bí mật của user 1',
      message: 'Nội dung',
    });

    const res = await api()
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', bearerFor(user2));

    expect(res.status).toBe(404);
  });

  it('marks all notifications as read for current user', async () => {
    const user = await createUser({ email: 'readall@example.com' });
    await createNotification({ recipientId: user._id, title: 'T1', message: 'M1' });
    await createNotification({ recipientId: user._id, title: 'T2', message: 'M2' });
    await createNotification({ recipientId: user._id, title: 'T3', message: 'M3' });

    const res = await api()
      .patch('/api/notifications/read-all')
      .set('Authorization', bearerFor(user));

    expect(res.status).toBe(200);
    expect(res.body.modifiedCount).toBe(3);

    const check = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(user));
    expect(check.body.unreadCount).toBe(0);
  });

  it('deletes a notification belonging to the current user', async () => {
    const user = await createUser({ email: 'delnotif@example.com' });
    const notif = await createNotification({ recipientId: user._id, title: 'T1', message: 'M1' });

    const res = await api()
      .delete(`/api/notifications/${notif._id}`)
      .set('Authorization', bearerFor(user));

    expect(res.status).toBe(200);
    const inDb = await NotificationModel.findById(notif._id);
    expect(inDb).toBeNull();
  });

  it('allows Admin to broadcast notifications to all users', async () => {
    const admin = await createUser({ role: 'admin', email: 'admin_broadcast@example.com' });
    const student = await createUser({ role: 'student', email: 'student_bc@example.com' });
    const teacher = await createUser({ role: 'teacher', email: 'teacher_bc@example.com' });

    // Non-admin attempt -> 403
    const forbiddenRes = await api()
      .post('/api/notifications/broadcast')
      .set('Authorization', bearerFor(student))
      .send({
        title: 'Spam',
        message: 'Tôi là học sinh',
        targetRole: 'all',
      });
    expect(forbiddenRes.status).toBe(403);

    // Admin broadcast
    const res = await api()
      .post('/api/notifications/broadcast')
      .set('Authorization', bearerFor(admin))
      .send({
        title: 'Bảo trì hệ thống',
        message: 'Hệ thống sẽ bảo trì lúc 0h ngày mai.',
        targetRole: 'all',
        type: 'SYSTEM',
      });

    expect(res.status).toBe(201);
    expect(res.body.count).toBeGreaterThanOrEqual(3);

    // Verify student received the broadcast
    const studentNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(student));
    expect(studentNotifs.body.notifications.some((n: any) => n.title === 'Bảo trì hệ thống')).toBe(true);

    // Verify teacher received the broadcast
    const teacherNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(teacher));
    expect(teacherNotifs.body.notifications.some((n: any) => n.title === 'Bảo trì hệ thống')).toBe(true);
  });

  it('allows Admin to broadcast targeted notification to students only', async () => {
    const admin = await createUser({ role: 'admin', email: 'admin_stu_bc@example.com' });
    const student = await createUser({ role: 'student', email: 'stu_target@example.com' });
    const teacher = await createUser({ role: 'teacher', email: 'teacher_not_target@example.com' });

    const res = await api()
      .post('/api/notifications/broadcast')
      .set('Authorization', bearerFor(admin))
      .send({
        title: 'Thông báo học phí',
        message: 'Hạn nộp học phí kỳ này là 30/11',
        targetRole: 'student',
        type: 'GENERAL',
      });

    expect(res.status).toBe(201);

    const studentNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(student));
    expect(studentNotifs.body.notifications.some((n: any) => n.title === 'Thông báo học phí')).toBe(true);

    const teacherNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(teacher));
    expect(teacherNotifs.body.notifications.some((n: any) => n.title === 'Thông báo học phí')).toBe(false);
  });

  it('allows Admin to send a notification to a specific user by email or userId', async () => {
    const admin = await createUser({ role: 'admin', email: 'admin_specific@example.com' });
    const targetStudent = await createUser({ role: 'student', email: 'specific_student@example.com', displayName: 'Học viên A' });
    const otherStudent = await createUser({ role: 'student', email: 'other_student@example.com' });

    // 1. Send by email
    const res = await api()
      .post('/api/notifications/broadcast')
      .set('Authorization', bearerFor(admin))
      .send({
        title: 'Cảnh báo vắng học',
        message: 'Bạn đã vắng 2 buổi liên tiếp môn Lập trình Web.',
        targetRole: 'specific',
        targetEmail: 'specific_student@example.com',
        type: 'SYSTEM',
      });

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(1);
    expect(res.body.message).toContain('Học viên A');

    // Target student receives it
    const targetNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(targetStudent));
    expect(targetNotifs.body.total).toBe(1);
    expect(targetNotifs.body.notifications[0].title).toBe('Cảnh báo vắng học');

    // Other student receives nothing
    const otherNotifs = await api()
      .get('/api/notifications')
      .set('Authorization', bearerFor(otherStudent));
    expect(otherNotifs.body.total).toBe(0);

    // 2. Reject non-existent user email
    const notFoundRes = await api()
      .post('/api/notifications/broadcast')
      .set('Authorization', bearerFor(admin))
      .send({
        title: 'Test',
        message: 'Test',
        targetRole: 'specific',
        targetEmail: 'nonexistent@example.com',
      });
    expect(notFoundRes.status).toBe(404);
  });
});
