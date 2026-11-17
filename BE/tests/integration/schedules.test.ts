import { describe, expect, it } from 'vitest';
import { ClassModel } from '../../src/models/class.model';
import { CourseModel } from '../../src/models/course.model';
import { EnrollmentModel } from '../../src/models/enrollment.model';
import { ScheduleModel } from '../../src/models/schedule.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Epic 3: Timetable & Scheduling (LMS-19, LMS-20, LMS-24)', () => {
  describe('Admin Schedule Management & Conflict Detection (LMS-20)', () => {
    it('creates schedule, validates start and end times, and prevents teacher conflicts', async () => {
      const admin = await createUser({ email: 'admin-sched@test.com', role: 'admin' });
      const teacher = await createUser({ email: 'teacher-sched@test.com', role: 'teacher' });
      const student = await createUser({ email: 'student-sched@test.com', role: 'student' });

      const adminAuth = bearerFor(admin);
      const studentAuth = bearerFor(student);

      const course = await CourseModel.create({
        code: 'CS201',
        name: 'Lập trình Hướng đối tượng',
        credits: 3
      });

      // Class 1 taught by Teacher
      const class1 = await ClassModel.create({
        code: 'CS201-01',
        name: 'Lớp OOP 01',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 401',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // Class 2 also taught by Teacher
      const class2 = await ClassModel.create({
        code: 'CS201-02',
        name: 'Lớp OOP 02',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 402',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // 1. Validation: endTime must be after startTime
      const invalidTimeRes = await api()
        .post('/api/schedules')
        .set('Authorization', adminAuth)
        .send({
          classId: class1._id.toString(),
          dayOfWeek: 2, // Thứ Hai
          startTime: '10:00',
          endTime: '08:00', // Invalid: end < start
          roomOrLink: 'Phòng Lab 401'
        });
      expect(invalidTimeRes.status).toBe(400);

      // 2. Non-admin blocked from creating schedule
      const forbiddenRes = await api()
        .post('/api/schedules')
        .set('Authorization', studentAuth)
        .send({
          classId: class1._id.toString(),
          dayOfWeek: 2,
          startTime: '08:00',
          endTime: '10:00',
          roomOrLink: 'Phòng Lab 401'
        });
      expect(forbiddenRes.status).toBe(403);

      // 3. Happy Path: Admin creates schedule slot for Class 1 (Thứ 2: 08:00 - 10:00)
      const createRes = await api()
        .post('/api/schedules')
        .set('Authorization', adminAuth)
        .send({
          classId: class1._id.toString(),
          dayOfWeek: 2, // Thứ 2
          startTime: '08:00',
          endTime: '10:00',
          roomOrLink: 'https://meet.google.com/oop-class-01',
          description: 'Lý thuyết cơ bản'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data).toMatchObject({
        dayOfWeek: 2,
        startTime: '08:00',
        endTime: '10:00',
        roomOrLink: 'https://meet.google.com/oop-class-01'
      });
      const scheduleId = createRes.body.data._id;

      // 4. Conflict Detection: Admin attempts to schedule Class 2 for the same teacher with overlapping time (09:00 - 11:00) on Thứ 2
      const conflictRes = await api()
        .post('/api/schedules')
        .set('Authorization', adminAuth)
        .send({
          classId: class2._id.toString(),
          dayOfWeek: 2, // Same day: Thứ 2
          startTime: '09:00', // Overlaps with 08:00-10:00!
          endTime: '11:00',
          roomOrLink: 'Phòng Lab 402'
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.message).toContain('trùng lịch');

      // 5. Non-overlapping schedule on the same day succeeds (14:00 - 16:00)
      const nonConflictRes = await api()
        .post('/api/schedules')
        .set('Authorization', adminAuth)
        .send({
          classId: class2._id.toString(),
          dayOfWeek: 2,
          startTime: '14:00',
          endTime: '16:00',
          roomOrLink: 'Phòng Lab 402'
        });
      expect(nonConflictRes.status).toBe(201);

      // 6. Update schedule & Delete schedule
      const updateRes = await api()
        .patch(`/api/schedules/${scheduleId}`)
        .set('Authorization', adminAuth)
        .send({
          roomOrLink: 'Phòng Lab 501 (Đổi phòng)'
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.roomOrLink).toBe('Phòng Lab 501 (Đổi phòng)');

      // Delete
      const deleteRes = await api()
        .delete(`/api/schedules/${scheduleId}`)
        .set('Authorization', adminAuth);
      expect(deleteRes.status).toBe(200);
      expect(await ScheduleModel.findById(scheduleId)).toBeNull();
    });
  });

  describe('Personalized Timetable (LMS-24 & LMS-25)', () => {
    it('aggregates weekly schedules for enrolled students and teachers, with empty state', async () => {
      const teacher = await createUser({ email: 'teacher-timetable@test.com', role: 'teacher' });
      const student1 = await createUser({ email: 'student1-timetable@test.com', role: 'student' });
      const student2 = await createUser({ email: 'student2-timetable@test.com', role: 'student' });

      const teacherAuth = bearerFor(teacher);
      const student1Auth = bearerFor(student1);
      const student2Auth = bearerFor(student2);

      const course = await CourseModel.create({
        code: 'CS301',
        name: 'Kiến trúc máy tính',
        credits: 3
      });

      const classA = await ClassModel.create({
        code: 'CS301-A',
        name: 'Lớp Kiến trúc MT A',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 301',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // Schedule for Class A: Thứ 4 (dayOfWeek: 4), 08:00 - 10:30
      await ScheduleModel.create({
        classId: classA._id,
        dayOfWeek: 4,
        startTime: '08:00',
        endTime: '10:30',
        roomOrLink: 'Lab 301, Tòa B'
      });

      // Student 1 enrolls in Class A
      await EnrollmentModel.create({
        classId: classA._id,
        studentId: student1._id,
        status: 'ENROLLED'
      });

      // 1. Teacher views timetable: includes Class A
      const teacherRes = await api()
        .get('/api/schedules/my-timetable')
        .set('Authorization', teacherAuth);

      expect(teacherRes.status).toBe(200);
      expect(teacherRes.body.data.length).toBe(1);
      expect(teacherRes.body.data[0].classId.code).toBe('CS301-A');
      expect(teacherRes.body.data[0].dayOfWeek).toBe(4);

      // 2. Student 1 views timetable: includes Class A
      const student1Res = await api()
        .get('/api/schedules/my-timetable')
        .set('Authorization', student1Auth);

      expect(student1Res.status).toBe(200);
      expect(student1Res.body.data.length).toBe(1);
      expect(student1Res.body.data[0].classId.code).toBe('CS301-A');

      // 3. Student 2 (no enrollments) views timetable: receives empty array (Exception AC)
      const student2Res = await api()
        .get('/api/schedules/my-timetable')
        .set('Authorization', student2Auth);

      expect(student2Res.status).toBe(200);
      expect(student2Res.body.data).toEqual([]);
    });
  });
});
