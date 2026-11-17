import { describe, expect, it } from 'vitest';
import { ClassModel } from '../../src/models/class.model';
import { CourseModel } from '../../src/models/course.model';
import { EnrollmentModel } from '../../src/models/enrollment.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Epic 2: Course & Class Management (LMS-10, LMS-14)', () => {
  describe('Course Management (LMS-10)', () => {
    it('allows admin to create, read, update, and delete courses', async () => {
      const admin = await createUser({ role: 'admin' });
      const adminAuth = bearerFor(admin);

      // Create Course
      const createRes = await api()
        .post('/api/courses')
        .set('Authorization', adminAuth)
        .send({
          code: 'cs102',
          name: 'Cấu trúc dữ liệu & Giải thuật',
          description: 'Môn học cốt lõi',
          credits: 3
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body).toMatchObject({
        code: 'CS102',
        name: 'Cấu trúc dữ liệu & Giải thuật',
        credits: 3,
        status: 'ACTIVE'
      });
      const courseId = createRes.body._id;

      // Duplicate code rejected (Jira LMS-10 AC)
      const duplicateRes = await api()
        .post('/api/courses')
        .set('Authorization', adminAuth)
        .send({
          code: 'CS102',
          name: 'Khóa học trùng'
        });
      expect(duplicateRes.status).toBe(409);

      // Get Course
      const getRes = await api().get(`/api/courses/${courseId}`).set('Authorization', adminAuth);
      expect(getRes.status).toBe(200);
      expect(getRes.body.code).toBe('CS102');

      // Update Course
      const updateRes = await api()
        .patch(`/api/courses/${courseId}`)
        .set('Authorization', adminAuth)
        .send({ credits: 4 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.credits).toBe(4);

      // List Courses
      const listRes = await api().get('/api/courses').set('Authorization', adminAuth);
      expect(listRes.status).toBe(200);
      expect(listRes.body.items.length).toBeGreaterThanOrEqual(1);

      // Delete Course
      const deleteRes = await api().delete(`/api/courses/${courseId}`).set('Authorization', adminAuth);
      expect(deleteRes.status).toBe(204);
      expect(await CourseModel.findById(courseId)).toBeNull();
    });

    it('forbids students and teachers from creating or mutating courses', async () => {
      const student = await createUser({ role: 'student' });
      const studentAuth = bearerFor(student);

      const res = await api()
        .post('/api/courses')
        .set('Authorization', studentAuth)
        .send({ code: 'WEB101', name: 'Web Dev' });
      expect(res.status).toBe(403);
    });
  });

  describe('Class Management & Date Validation (LMS-10)', () => {
    it('creates a class with teacher assignment and validates endDate > startDate', async () => {
      const admin = await createUser({ email: 'admin-class@example.com', role: 'admin' });
      const teacher = await createUser({
        email: 'teacher-class@example.com',
        role: 'teacher',
        displayName: 'ThS. Nguyễn Văn A'
      });
      const adminAuth = bearerFor(admin);

      const course = await CourseModel.create({
        code: 'CS102',
        name: 'Cấu trúc dữ liệu'
      });

      // Validation failure: endDate <= startDate (Jira LMS-10 AC)
      const invalidDatesRes = await api()
        .post('/api/classes')
        .set('Authorization', adminAuth)
        .send({
          code: 'CS102-K24',
          name: 'Lớp K24 Cấu trúc dữ liệu',
          courseId: String(course._id),
          teacherId: String(teacher._id),
          startDate: '2026-10-15',
          endDate: '2026-10-10' // earlier than startDate
        });
      expect(invalidDatesRes.status).toBe(400);
      expect(invalidDatesRes.body.errors[0].message).toContain('Ngày kết thúc phải sau ngày bắt đầu');

      // Happy path
      const validRes = await api()
        .post('/api/classes')
        .set('Authorization', adminAuth)
        .send({
          code: 'CS102-K24',
          name: 'Lớp K24 Cấu trúc dữ liệu',
          courseId: String(course._id),
          teacherId: String(teacher._id),
          room: 'Phòng Lab 402',
          startDate: '2026-10-01',
          endDate: '2026-12-30',
          maxStudents: 30
        });

      expect(validRes.status).toBe(201);
      expect(validRes.body).toMatchObject({
        code: 'CS102-K24',
        name: 'Lớp K24 Cấu trúc dữ liệu',
        status: 'OPEN',
        maxStudents: 30
      });
      expect(validRes.body.teacherId).toMatchObject({
        displayName: 'ThS. Nguyễn Văn A'
      });
    });

    it('automatically transitions ended classes from OPEN to CLOSED when endDate has passed and supports manual toggle', async () => {
      const admin = await createUser({ email: 'admin-autoclose@example.com', role: 'admin' });
      const teacher = await createUser({
        email: 'teacher-autoclose@example.com',
        role: 'teacher',
        displayName: 'ThS. Nguyễn Văn B'
      });
      const adminAuth = bearerFor(admin);

      const course = await CourseModel.create({
        code: 'CS201',
        name: 'Hệ điều hành'
      });

      // Create an already ended class (endDate in the past)
      const pastClass = await ClassModel.create({
        code: 'CS201-ENDED',
        name: 'Lớp Hệ điều hành 2024',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 201',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // When querying via GET /api/classes/:id or GET /api/classes, auto-close triggers
      const getRes = await api().get(`/api/classes/${pastClass._id}`).set('Authorization', adminAuth);
      expect(getRes.status).toBe(200);
      expect(getRes.body.status).toBe('CLOSED');

      // Manual open/close toggle
      const reopenRes = await api()
        .patch(`/api/classes/${pastClass._id}`)
        .set('Authorization', adminAuth)
        .send({ status: 'OPEN', endDate: new Date('2027-12-31') });
      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.status).toBe('OPEN');

      const manualCloseRes = await api()
        .patch(`/api/classes/${pastClass._id}`)
        .set('Authorization', adminAuth)
        .send({ status: 'CLOSED' });
      expect(manualCloseRes.status).toBe(200);
      expect(manualCloseRes.body.status).toBe('CLOSED');
    });
  });

  describe('Enrollment & Member Profile Popup (LMS-14)', () => {
    it('handles student enrollment, prevents duplicate enrollments, checks capacity, and reveals members with profile details', async () => {
      const admin = await createUser({ email: 'admin-enroll@example.com', role: 'admin' });
      const teacher = await createUser({
        email: 'teacher-enroll@example.com',
        role: 'teacher',
        displayName: 'Giảng viên Nam'
      });
      const student1 = await createUser({
        email: 'student04@example.com',
        role: 'student',
        displayName: 'Trần Thị Mai'
      });
      const student2 = await createUser({
        email: 'student02@example.com',
        role: 'student',
        displayName: 'Đặng Minh Khôi'
      });
      const outsiderStudent = await createUser({
        email: 'outsider@example.com',
        role: 'student',
        displayName: 'Người ngoài lớp'
      });

      const course = await CourseModel.create({ code: 'REACT101', name: 'React Pro' });
      const classDoc = await ClassModel.create({
        code: 'K46-REACT',
        name: 'Lớp React K46',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 101',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-12-31'),
        maxStudents: 2, // capacity of 2 for testing
        status: 'OPEN'
      });

      const student1Auth = bearerFor(student1);
      const student2Auth = bearerFor(student2);
      const outsiderAuth = bearerFor(outsiderStudent);
      const teacherAuth = bearerFor(teacher);

      // Student 1 enrolls self (Happy Path)
      const enroll1 = await api()
        .post(`/api/classes/${classDoc._id}/enroll`)
        .set('Authorization', student1Auth)
        .send({});
      expect(enroll1.status).toBe(201);
      expect(enroll1.body.status).toBe('ENROLLED');

      // Duplicate enrollment rejection (Jira LMS-14 AC: compound unique index)
      const duplicateEnroll = await api()
        .post(`/api/classes/${classDoc._id}/enroll`)
        .set('Authorization', student1Auth)
        .send({});
      expect(duplicateEnroll.status).toBe(409);
      expect(duplicateEnroll.body.message).toContain('đã được ghi danh');

      // Student 2 enrolls self
      const enroll2 = await api()
        .post(`/api/classes/${classDoc._id}/enroll`)
        .set('Authorization', student2Auth)
        .send({});
      expect(enroll2.status).toBe(201);

      // Capacity reached guard (maxStudents = 2)
      const overCapacityEnroll = await api()
        .post(`/api/classes/${classDoc._id}/enroll`)
        .set('Authorization', outsiderAuth)
        .send({});
      expect(overCapacityEnroll.status).toBe(400);
      expect(overCapacityEnroll.body.message).toContain('đạt sĩ số tối đa');

      // Class Members view: Enrolled student can view members list (Jira LMS-14 AC)
      const membersRes = await api()
        .get(`/api/classes/${classDoc._id}/members`)
        .set('Authorization', student1Auth);

      expect(membersRes.status).toBe(200);
      expect(membersRes.body.studentsCount).toBe(2);
      expect(membersRes.body.students[0]).toMatchObject({
        displayName: 'Trần Thị Mai',
        email: 'student04@example.com',
        role: 'student'
      });
      expect(membersRes.body.teacher).toMatchObject({
        displayName: 'Giảng viên Nam'
      });

      // Teacher of class can also view members
      const teacherView = await api()
        .get(`/api/classes/${classDoc._id}/members`)
        .set('Authorization', teacherAuth);
      expect(teacherView.status).toBe(200);

      // Outsider student cannot view class members (403 Forbidden)
      const outsiderView = await api()
        .get(`/api/classes/${classDoc._id}/members`)
        .set('Authorization', outsiderAuth);
      expect(outsiderView.status).toBe(403);

      // Student 1 checks their enrolled classes
      const myClasses = await api()
        .get('/api/classes/my/enrolled')
        .set('Authorization', student1Auth);
      expect(myClasses.status).toBe(200);
      expect(myClasses.body.length).toBe(1);
      expect(myClasses.body[0].class.code).toBe('K46-REACT');

      // Teacher checks their teaching classes
      const teachingClasses = await api()
        .get('/api/classes/my/teaching')
        .set('Authorization', teacherAuth);
      expect(teachingClasses.status).toBe(200);
      expect(teachingClasses.body.length).toBe(1);
      expect(teachingClasses.body[0].enrolledCount).toBe(2);

      // Student 1 drops class
      const dropRes = await api()
        .delete(`/api/classes/${classDoc._id}/enroll`)
        .set('Authorization', student1Auth);
      expect(dropRes.status).toBe(200);
      expect(dropRes.body.status).toBe('DROPPED');

      // Now active enrolled count is 1
      const countAfterDrop = await EnrollmentModel.countDocuments({
        classId: classDoc._id,
        status: 'ENROLLED'
      });
      expect(countAfterDrop).toBe(1);
    });
  });
});
