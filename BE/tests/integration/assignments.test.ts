import { describe, expect, it } from 'vitest';
import { AssignmentModel } from '../../src/models/assignment.model';
import { ClassModel } from '../../src/models/class.model';
import { CourseModel } from '../../src/models/course.model';
import { EnrollmentModel } from '../../src/models/enrollment.model';
import { SubmissionModel } from '../../src/models/submission.model';
import { closeOverdueAssignments } from '../../src/services/deadline-scheduler.service';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Epic 4: Assignment & Deadline Automation (LMS-28, LMS-29, LMS-33, LMS-37)', () => {
  describe('E4-S1: Giảng viên Giao bài tập kèm Deadline (LMS-29)', () => {
    it('creates assignment, enforces future deadline, and checks teacher ownership', async () => {
      const teacher = await createUser({ email: 'teacher-e4@test.com', role: 'teacher' });
      const otherTeacher = await createUser({ email: 'other-teacher-e4@test.com', role: 'teacher' });
      const student = await createUser({ email: 'student-e4@test.com', role: 'student' });

      const teacherAuth = bearerFor(teacher);
      const otherTeacherAuth = bearerFor(otherTeacher);
      const studentAuth = bearerFor(student);

      const course = await CourseModel.create({
        code: 'CS101',
        name: 'Lập trình Web Cơ bản',
        credits: 3
      });

      const cls = await ClassModel.create({
        code: 'CS101-01',
        name: 'Lớp Lập trình Web 01',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 402',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // 1. Validation error: deadlineAt <= now
      const pastDeadline = new Date(Date.now() - 3600 * 1000).toISOString();
      const invalidDeadlineRes = await api()
        .post('/api/assignments')
        .set('Authorization', teacherAuth)
        .send({
          title: 'Bài tập 01: Test Quá Hạn',
          classId: cls._id.toString(),
          deadlineAt: pastDeadline,
          maxScore: 10
        });
      expect(invalidDeadlineRes.status).toBe(400);

      // 2. Permission error: other teacher cannot create assignment in this class
      const futureDeadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      const forbiddenRes = await api()
        .post('/api/assignments')
        .set('Authorization', otherTeacherAuth)
        .send({
          title: 'Bài tập 01: React Components',
          classId: cls._id.toString(),
          deadlineAt: futureDeadline,
          maxScore: 10
        });
      expect(forbiddenRes.status).toBe(403);

      // 3. Permission error: student cannot create assignment
      const studentForbiddenRes = await api()
        .post('/api/assignments')
        .set('Authorization', studentAuth)
        .send({
          title: 'Bài tập 01: React Components',
          classId: cls._id.toString(),
          deadlineAt: futureDeadline,
          maxScore: 10
        });
      expect(studentForbiddenRes.status).toBe(403);

      // 4. Happy Path: Teacher creates assignment
      const createRes = await api()
        .post('/api/assignments')
        .set('Authorization', teacherAuth)
        .send({
          title: 'Bài tập 01: Xây dựng Layout React & Tailwind CSS',
          description: 'Mô tả bài tập: Thiết kế giao diện responsive và Dark Theme',
          classId: cls._id.toString(),
          deadlineAt: futureDeadline,
          maxScore: 10
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.title).toBe('Bài tập 01: Xây dựng Layout React & Tailwind CSS');
      expect(createRes.body.data.status).toBe('PUBLISHED');
      expect(createRes.body.data.maxScore).toBe(10);

      const assignmentId = createRes.body.data._id;

      // 5. Read class assignments list
      const listRes = await api()
        .get(`/api/assignments/class/${cls._id}`)
        .set('Authorization', teacherAuth);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0]._id).toBe(assignmentId);
      expect(listRes.body.data[0].submissionsCount).toBe(0);
    });
  });

  describe('E4-S2: Học viên Nộp bài tập & Cập nhật bài nộp (LMS-33)', () => {
    it('allows enrolled student to submit and resubmit before deadline, rejecting unenrolled students', async () => {
      const teacher = await createUser({ email: 'teacher-sub@test.com', role: 'teacher' });
      const student1 = await createUser({ email: 'student1-sub@test.com', role: 'student' });
      const student2 = await createUser({ email: 'student2-sub@test.com', role: 'student' });

      const teacherAuth = bearerFor(teacher);
      const student1Auth = bearerFor(student1);
      const student2Auth = bearerFor(student2);

      const course = await CourseModel.create({
        code: 'CS102',
        name: 'Cấu trúc dữ liệu',
        credits: 3
      });

      const cls = await ClassModel.create({
        code: 'CS102-01',
        name: 'Lớp Cấu trúc dữ liệu 01',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 301',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      // Enroll student1 in class
      await EnrollmentModel.create({
        classId: cls._id,
        studentId: student1._id,
        status: 'ENROLLED'
      });

      // Teacher creates assignment with 3-day deadline
      const deadline = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const assignment = await AssignmentModel.create({
        title: 'Lab 2: Binary Search Tree',
        classId: cls._id,
        teacherId: teacher._id,
        deadlineAt: deadline,
        status: 'PUBLISHED',
        maxScore: 10
      });

      // 1. Unenrolled student2 attempts to submit -> 403 Forbidden
      const unenrolledRes = await api()
        .post('/api/submissions')
        .set('Authorization', student2Auth)
        .send({
          assignmentId: assignment._id.toString(),
          link: 'https://github.com/student2/bst'
        });
      expect(unenrolledRes.status).toBe(403);

      // 2. Validation error: student submits neither link nor file attachments -> 400
      const emptySubmissionRes = await api()
        .post('/api/submissions')
        .set('Authorization', student1Auth)
        .send({
          assignmentId: assignment._id.toString(),
          link: '',
          attachments: []
        });
      expect(emptySubmissionRes.status).toBe(400);
      expect(emptySubmissionRes.body.errors[0].message).toContain('Vui lòng cung cấp link bài làm hoặc đính kèm');

      // 3. Student uploads attachment file (Cloudinary integration)
      const uploadRes = await api()
        .post('/api/submissions/upload')
        .set('Authorization', student1Auth)
        .attach('file', Buffer.from('%PDF-1.4 test assignment content'), 'solution.pdf');
      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.data.url).toBeDefined();
      expect(uploadRes.body.data.name).toBe('solution.pdf');

      // 4. Happy Path: Enrolled student1 submits assignment with attachment file and link
      const submitRes = await api()
        .post('/api/submissions')
        .set('Authorization', student1Auth)
        .send({
          assignmentId: assignment._id.toString(),
          link: 'https://github.com/student1/bst-initial',
          attachments: [
            {
              name: uploadRes.body.data.name,
              url: uploadRes.body.data.url,
              publicId: uploadRes.body.data.publicId,
              size: 1024,
              mimeType: 'application/pdf'
            }
          ],
          note: 'Em nộp bài bản 1 kèm file PDF giải thuật'
        });

      expect(submitRes.status).toBe(201);
      expect(submitRes.body.data.status).toBe('SUBMITTED');
      expect(submitRes.body.data.link).toBe('https://github.com/student1/bst-initial');
      expect(submitRes.body.data.attachments).toHaveLength(1);
      expect(submitRes.body.data.attachments[0].name).toBe('solution.pdf');
      expect(submitRes.body.data.submittedAt).toBeDefined();

      // 5. Student can resubmit (update submission before deadline) with attachment and final link
      const resubmitRes = await api()
        .post('/api/submissions')
        .set('Authorization', student1Auth)
        .send({
          assignmentId: assignment._id.toString(),
          link: 'https://github.com/student1/bst-final-v2',
          attachments: [
            {
              name: 'bst-final-v2.zip',
              url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/lms/submissions/bst-final-v2.zip',
              size: 2048,
              mimeType: 'application/zip'
            }
          ],
          note: 'Em nộp đè bản hoàn chỉnh đã tối ưu cân bằng cây AVL'
        });

      expect(resubmitRes.status).toBe(201);
      expect(resubmitRes.body.data.link).toBe('https://github.com/student1/bst-final-v2');
      expect(resubmitRes.body.data.attachments[0].name).toBe('bst-final-v2.zip');
      expect(resubmitRes.body.data.note).toContain('bản hoàn chỉnh');

      // Ensure only 1 submission record exists for this student on this assignment
      const submissionCount = await SubmissionModel.countDocuments({
        assignmentId: assignment._id,
        studentId: student1._id
      });
      expect(submissionCount).toBe(1);

      // 6. Student views their own submission
      const mySubRes = await api()
        .get(`/api/submissions/assignment/${assignment._id}/my`)
        .set('Authorization', student1Auth);

      expect(mySubRes.status).toBe(200);
      expect(mySubRes.body.data.link).toBe('https://github.com/student1/bst-final-v2');
      expect(mySubRes.body.data.attachments).toHaveLength(1);
      expect(mySubRes.body.data.attachments[0].name).toBe('bst-final-v2.zip');

      // 7. Student can also submit with attachments only (empty link)
      const attachmentOnlyRes = await api()
        .post('/api/submissions')
        .set('Authorization', student1Auth)
        .send({
          assignmentId: assignment._id.toString(),
          link: '',
          attachments: [
            {
              name: 'pure-attachment.pdf',
              url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/lms/submissions/pure-attachment.pdf'
            }
          ]
        });
      expect(attachmentOnlyRes.status).toBe(201);
      expect(attachmentOnlyRes.body.data.link).toBe('');
      expect(attachmentOnlyRes.body.data.attachments[0].name).toBe('pure-attachment.pdf');

      // 5. Teacher views submissions list
      const teacherSubsRes = await api()
        .get(`/api/submissions/assignment/${assignment._id}`)
        .set('Authorization', teacherAuth);

      expect(teacherSubsRes.status).toBe(200);
      expect(teacherSubsRes.body.data).toHaveLength(1);
      expect(teacherSubsRes.body.data[0].studentId.email).toBe('student1-sub@test.com');
    });
  });

  describe('E4-S3: Scheduler Tự động khóa bài tập khi hết hạn (LMS-37)', () => {
    it('automatically transitions overdue assignments from PUBLISHED to CLOSED and rejects late submissions', async () => {
      const teacher = await createUser({ email: 'teacher-cron@test.com', role: 'teacher' });
      const student = await createUser({ email: 'student-cron@test.com', role: 'student' });

      const studentAuth = bearerFor(student);

      const course = await CourseModel.create({
        code: 'CS103',
        name: 'Hệ Quản Trị CSDL',
        credits: 3
      });

      const cls = await ClassModel.create({
        code: 'CS103-01',
        name: 'Lớp CSDL 01',
        courseId: course._id,
        teacherId: teacher._id,
        room: 'Lab 201',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-30'),
        maxStudents: 30,
        status: 'OPEN'
      });

      await EnrollmentModel.create({
        classId: cls._id,
        studentId: student._id,
        status: 'ENROLLED'
      });

      // Create an assignment that expired 10 minutes ago
      const pastDeadline = new Date(Date.now() - 10 * 60 * 1000);
      const expiredAssignment = await AssignmentModel.create({
        title: 'Lab Quá Hạn: MongoDB Aggregation',
        classId: cls._id,
        teacherId: teacher._id,
        deadlineAt: pastDeadline,
        status: 'PUBLISHED',
        maxScore: 10
      });

      // Also create an active assignment with future deadline (must remain PUBLISHED)
      const futureAssignment = await AssignmentModel.create({
        title: 'Lab Còn Hạn: Sharding & Index',
        classId: cls._id,
        teacherId: teacher._id,
        deadlineAt: new Date(Date.now() + 2 * 24 * 3600 * 1000),
        status: 'PUBLISHED',
        maxScore: 10
      });

      // 1. Run scheduler logic
      const closedCount = await closeOverdueAssignments();
      expect(closedCount).toBeGreaterThanOrEqual(1);

      // Check DB
      const refreshedExpired = await AssignmentModel.findById(expiredAssignment._id);
      expect(refreshedExpired?.status).toBe('CLOSED');

      const refreshedFuture = await AssignmentModel.findById(futureAssignment._id);
      expect(refreshedFuture?.status).toBe('PUBLISHED');

      // 2. Student attempts to submit late -> 400 "Đã hết hạn nộp bài"
      const lateRes = await api()
        .post('/api/submissions')
        .set('Authorization', studentAuth)
        .send({
          assignmentId: expiredAssignment._id.toString(),
          link: 'https://github.com/student/late-submission'
        });

      expect(lateRes.status).toBe(400);
      expect(lateRes.body.message).toContain('Đã hết hạn nộp bài');
    });
  });
});
