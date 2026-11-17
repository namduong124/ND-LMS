import { describe, expect, it } from 'vitest';
import { DepartmentModel } from '../../src/models/department.model';
import { CourseModel } from '../../src/models/course.model';
import { ClassModel } from '../../src/models/class.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

describe('Epic 2 - E2-S4: Faculty & Department Management (LMS-65, LMS-66)', () => {
  it('allows admin to create, get, update, and delete departments', async () => {
    const admin = await createUser({ email: 'admin-dept@example.com', role: 'admin' });
    const teacher = await createUser({ email: 'teacher-dept@example.com', role: 'teacher', displayName: 'TS. Nguyễn Văn A' });
    const student = await createUser({ email: 'student-dept@example.com', role: 'student' });

    const adminAuth = bearerFor(admin);
    const studentAuth = bearerFor(student);

    // 1. Admin creates department with headId
    const createRes = await api()
      .post('/api/departments')
      .set('Authorization', adminAuth)
      .send({
        code: 'cntt',
        name: 'Công nghệ Thông tin',
        description: 'Khoa đào tạo CNTT & Kỹ thuật phần mềm',
        headId: teacher._id.toString(),
        status: 'ACTIVE'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      code: 'CNTT',
      name: 'Công nghệ Thông tin',
      status: 'ACTIVE'
    });
    expect(createRes.body.headId._id).toBe(teacher._id.toString());
    const deptId = createRes.body._id;

    // 2. Duplicate code rejected (409 Conflict)
    const duplicateRes = await api()
      .post('/api/departments')
      .set('Authorization', adminAuth)
      .send({
        code: 'CNTT',
        name: 'Khoa CNTT Trùng'
      });
    expect(duplicateRes.status).toBe(409);

    // 3. Student forbidden from creating/updating/deleting
    const studentCreateRes = await api()
      .post('/api/departments')
      .set('Authorization', studentAuth)
      .send({
        code: 'DTVT',
        name: 'Điện tử Viễn thông'
      });
    expect(studentCreateRes.status).toBe(403);

    // 4. Student can read departments
    const listRes = await api().get('/api/departments').set('Authorization', studentAuth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.items).toBeDefined();
    const found = listRes.body.items.find((d: { _id: string }) => d._id === deptId);
    expect(found).toBeDefined();
    expect(found.code).toBe('CNTT');

    // 5. Get Department detail
    const getRes = await api().get(`/api/departments/${deptId}`).set('Authorization', adminAuth);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Công nghệ Thông tin');
    expect(getRes.body.coursesCount).toBe(0);
    expect(getRes.body.classesCount).toBe(0);

    // 6. Update Department
    const updateRes = await api()
      .patch(`/api/departments/${deptId}`)
      .set('Authorization', adminAuth)
      .send({
        name: 'Khoa Công nghệ Thông tin & Truyền thông',
        description: 'Cập nhật mô tả mới'
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Khoa Công nghệ Thông tin & Truyền thông');

    // 7. Delete Department when empty
    const deleteRes = await api().delete(`/api/departments/${deptId}`).set('Authorization', adminAuth);
    expect(deleteRes.status).toBe(204);

    const checkGet = await api().get(`/api/departments/${deptId}`).set('Authorization', adminAuth);
    expect(checkGet.status).toBe(404);
  });

  it('handles course & class linkage and protects department with active courses/classes from deletion', async () => {
    const admin = await createUser({ email: 'admin2-dept@example.com', role: 'admin' });
    const teacher = await createUser({ email: 'teacher2-dept@example.com', role: 'teacher' });
    const adminAuth = bearerFor(admin);

    // Create Department
    const deptRes = await api()
      .post('/api/departments')
      .set('Authorization', adminAuth)
      .send({
        code: 'KTPM',
        name: 'Kỹ thuật Phần mềm'
      });
    const deptId = deptRes.body._id;

    // Create Course linked to Department
    const courseRes = await api()
      .post('/api/courses')
      .set('Authorization', adminAuth)
      .send({
        code: 'PM101',
        name: 'Nhập môn Kỹ thuật Phần mềm',
        departmentId: deptId,
        credits: 3
      });
    expect(courseRes.status).toBe(201);
    expect(courseRes.body.departmentId).toBeDefined();
    expect(courseRes.body.departmentId.code).toBe('KTPM');
    const courseId = courseRes.body._id;

    // Create Class - should auto-inherit course.departmentId if not provided
    const classRes = await api()
      .post('/api/classes')
      .set('Authorization', adminAuth)
      .send({
        code: 'PM101-01',
        name: 'Lớp PM101 Lớp 01',
        courseId,
        teacherId: teacher._id.toString(),
        maxStudents: 40,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-31T00:00:00.000Z'
      });
    expect(classRes.status).toBe(201);
    expect(classRes.body.departmentId).toBeDefined();
    expect(classRes.body.departmentId.code).toBe('KTPM');

    // Attempt to delete Department while courses/classes exist -> 400 Bad Request
    const failedDeleteRes = await api().delete(`/api/departments/${deptId}`).set('Authorization', adminAuth);
    expect(failedDeleteRes.status).toBe(400);
    expect(failedDeleteRes.body.message).toContain('Không thể xóa khoa / ngành vì vẫn còn');

    // Filter courses by departmentId
    const courseListRes = await api()
      .get(`/api/courses?departmentId=${deptId}`)
      .set('Authorization', adminAuth);
    expect(courseListRes.status).toBe(200);
    expect(courseListRes.body.items.length).toBe(1);
    expect(courseListRes.body.items[0]._id).toBe(courseId);

    // Filter classes by departmentId
    const classListRes = await api()
      .get(`/api/classes?departmentId=${deptId}`)
      .set('Authorization', adminAuth);
    expect(classListRes.status).toBe(200);
    expect(classListRes.body.items.length).toBe(1);
    expect(classListRes.body.items[0].departmentId.code).toBe('KTPM');
  });
});
