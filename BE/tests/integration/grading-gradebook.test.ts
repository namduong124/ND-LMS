import { describe, expect, it } from 'vitest';
import { AssignmentModel } from '../../src/models/assignment.model';
import { ClassModel } from '../../src/models/class.model';
import { CourseModel } from '../../src/models/course.model';
import { EnrollmentModel } from '../../src/models/enrollment.model';
import { SubmissionModel } from '../../src/models/submission.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Epic 5: Grading, Feedback & Class Gradebook Matrix', () => {
  it('supports assignment categories, quick grading, gradebook matrix and CSV export with role permissions', async () => {
    // Setup users: Teacher, Student 1, Student 2, Admin, Other Teacher
    const teacher = await createUser({ email: 'teacher-e5@test.com', role: 'teacher', displayName: 'ThS Nguyễn Văn A' });
    const student1 = await createUser({ email: 'student1-e5@test.com', role: 'student', displayName: 'Học viên Một' });
    const student2 = await createUser({ email: 'student2-e5@test.com', role: 'student', displayName: 'Học viên Hai' });
    const otherTeacher = await createUser({ email: 'other-teacher-e5@test.com', role: 'teacher' });
    const admin = await createUser({ email: 'admin-e5@test.com', role: 'admin' });

    const teacherAuth = bearerFor(teacher);
    const student1Auth = bearerFor(student1);
    const student2Auth = bearerFor(student2);
    const otherTeacherAuth = bearerFor(otherTeacher);
    const adminAuth = bearerFor(admin);

    // Setup Course & Class
    const course = await CourseModel.create({
      code: 'CS202',
      name: 'Lập trình Web Nâng Cao',
      credits: 3
    });

    const cls = await ClassModel.create({
      code: 'CS202-01',
      name: 'Lớp CS202 Sáng Thứ 2',
      courseId: course._id,
      teacherId: teacher._id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-30'),
      maxStudents: 30,
      status: 'OPEN'
    });

    // Enroll students
    await EnrollmentModel.create({ classId: cls._id, studentId: student1._id, status: 'ENROLLED' });
    await EnrollmentModel.create({ classId: cls._id, studentId: student2._id, status: 'ENROLLED' });

    // 1. Teacher creates assignments with categories (REGULAR, MIDTERM, FINAL)
    const futureDeadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const a1Res = await api()
      .post('/api/assignments')
      .set('Authorization', teacherAuth)
      .send({
        title: 'Bài tập 1: REST API',
        classId: cls._id.toString(),
        deadlineAt: futureDeadline,
        maxScore: 10,
        category: 'REGULAR'
      });
    expect(a1Res.status).toBe(201);
    expect(a1Res.body.data.category).toBe('REGULAR');
    const a1Id = a1Res.body.data._id;

    const a2Res = await api()
      .post('/api/assignments')
      .set('Authorization', teacherAuth)
      .send({
        title: 'Kiểm tra Giữa kỳ',
        classId: cls._id.toString(),
        deadlineAt: futureDeadline,
        maxScore: 10,
        category: 'MIDTERM'
      });
    expect(a2Res.status).toBe(201);
    expect(a2Res.body.data.category).toBe('MIDTERM');
    const a2Id = a2Res.body.data._id;

    // 2. Students submit assignments
    const sub1Res = await api()
      .post('/api/submissions')
      .set('Authorization', student1Auth)
      .send({
        assignmentId: a1Id,
        link: 'https://github.com/student1/rest-api',
        note: 'Em nộp bài 1 ạ'
      });
    expect(sub1Res.status).toBe(201);
    const sub1Id = sub1Res.body.data._id;

    const sub2Res = await api()
      .post('/api/submissions')
      .set('Authorization', student1Auth)
      .send({
        assignmentId: a2Id,
        link: 'https://github.com/student1/midterm',
        note: 'Em nộp bài giữa kỳ ạ'
      });
    expect(sub2Res.status).toBe(201);
    const sub2Id = sub2Res.body.data._id;

    // Student 2 only submits assignment 1
    const sub3Res = await api()
      .post('/api/submissions')
      .set('Authorization', student2Auth)
      .send({
        assignmentId: a1Id,
        link: 'https://github.com/student2/rest-api'
      });
    expect(sub3Res.status).toBe(201);
    const sub3Id = sub3Res.body.data._id;

    // 3. Grading: Permissions & Validation
    // A. Student cannot grade
    const studentGradeRes = await api()
      .patch(`/api/submissions/${sub1Id}/grade`)
      .set('Authorization', student1Auth)
      .send({ score: 10, feedback: 'Tự cho 10' });
    expect(studentGradeRes.status).toBe(403);

    // B. Other teacher cannot grade
    const otherTeacherGradeRes = await api()
      .patch(`/api/submissions/${sub1Id}/grade`)
      .set('Authorization', otherTeacherAuth)
      .send({ score: 8, feedback: 'Chấm nhầm' });
    expect(otherTeacherGradeRes.status).toBe(403);

    // C. Validation: score must be between 0 and 100
    const invalidScoreRes = await api()
      .patch(`/api/submissions/${sub1Id}/grade`)
      .set('Authorization', teacherAuth)
      .send({ score: -5 });
    expect(invalidScoreRes.status).toBe(400);

    // D. Teacher grades student 1's assignment 1 with 9.0 and assignment 2 with 8.0
    const grade1Res = await api()
      .patch(`/api/submissions/${sub1Id}/grade`)
      .set('Authorization', teacherAuth)
      .send({ score: 9.0, feedback: 'Bài làm rất tốt, code sạch sẽ' });
    expect(grade1Res.status).toBe(200);
    expect(grade1Res.body.data.status).toBe('GRADED');
    expect(grade1Res.body.data.score).toBe(9);
    expect(grade1Res.body.data.feedback).toBe('Bài làm rất tốt, code sạch sẽ');

    const grade2Res = await api()
      .patch(`/api/submissions/${sub2Id}/grade`)
      .set('Authorization', teacherAuth)
      .send({ score: 8.0, feedback: 'Giữa kỳ làm tốt' });
    expect(grade2Res.status).toBe(200);

    // E. Admin can also grade or update student 2's grade
    const adminGradeRes = await api()
      .patch(`/api/submissions/${sub3Id}/grade`)
      .set('Authorization', adminAuth)
      .send({ score: 7.0, feedback: 'Admin review' });
    expect(adminGradeRes.status).toBe(200);
    expect(adminGradeRes.body.data.score).toBe(7);

    // 4. Gradebook Matrix Query (GET /api/classes/:id/gradebook)
    // A. Teacher sees full matrix of 2 students
    const teacherGbRes = await api()
      .get(`/api/classes/${cls._id}/gradebook`)
      .set('Authorization', teacherAuth);
    expect(teacherGbRes.status).toBe(200);
    expect(teacherGbRes.body.data.students).toHaveLength(2);
    expect(teacherGbRes.body.data.assignments).toHaveLength(2);

    const st1Data = teacherGbRes.body.data.students.find((s: any) => s.studentId === student1._id.toString());
    expect(st1Data.gpa).toBe(8.5); // (9 + 8) / 2 = 8.5
    expect(st1Data.letterGrade).toContain('Giỏi');

    const st2Data = teacherGbRes.body.data.students.find((s: any) => s.studentId === student2._id.toString());
    expect(st2Data.gpa).toBe(3.5); // (7 + 0 for unsubmitted) / 2 = 3.5
    expect(st2Data.letterGrade).toContain('Chưa đạt');

    // Overall class GPA: (8.5 + 3.5) / 2 = 6.0
    expect(teacherGbRes.body.data.classStats.classOverallGpa).toBe(6.0);

    // B. Student views gradebook: only sees their own row for privacy, but sees class averages
    const studentGbRes = await api()
      .get(`/api/classes/${cls._id}/gradebook`)
      .set('Authorization', student1Auth);
    expect(studentGbRes.status).toBe(200);
    expect(studentGbRes.body.data.students).toHaveLength(1);
    expect(studentGbRes.body.data.students[0].studentId).toBe(student1._id.toString());
    expect(studentGbRes.body.data.classStats.classOverallGpa).toBe(6.0);

    // C. Non-enrolled student is blocked
    const outsiderStudent = await createUser({ email: 'outsider@test.com', role: 'student' });
    const outsiderGbRes = await api()
      .get(`/api/classes/${cls._id}/gradebook`)
      .set('Authorization', bearerFor(outsiderStudent));
    expect(outsiderGbRes.status).toBe(403);

    // 5. Export Gradebook CSV (GET /api/classes/:id/gradebook/export)
    // A. Student blocked from exporting full CSV
    const studentExportRes = await api()
      .get(`/api/classes/${cls._id}/gradebook/export`)
      .set('Authorization', student1Auth);
    expect(studentExportRes.status).toBe(403);

    // B. Teacher can export CSV
    const teacherExportRes = await api()
      .get(`/api/classes/${cls._id}/gradebook/export`)
      .set('Authorization', teacherAuth);
    expect(teacherExportRes.status).toBe(200);
    expect(teacherExportRes.headers['content-type']).toContain('text/csv');
    expect(teacherExportRes.text).toContain('Họ và tên');
    expect(teacherExportRes.text).toContain('Học viên Một');
    expect(teacherExportRes.text).toContain('ĐIỂM TRUNG BÌNH CẢ LỚP');
  });
});
