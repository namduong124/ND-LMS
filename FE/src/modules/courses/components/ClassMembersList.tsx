import { useState } from 'react';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import type { ClassMember, ClassTeacher } from '../types/course.types';
import { MemberProfilePopover } from './MemberProfilePopover';

interface ClassMembersListProps {
  teacher?: ClassTeacher;
  students: ClassMember[];
}

export const ClassMembersList = ({ teacher, students }: ClassMembersListProps) => {
  const [search, setSearch] = useState('');

  const filteredStudents = students.filter(
    (s) =>
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const teacherInitials = (teacher?.displayName || teacher?.email || 'GV')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thành viên theo tên hoặc email..."
            className="pl-9 h-9 bg-background border-input text-foreground placeholder:text-muted-foreground text-xs focus-visible:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span>Tổng số: <strong className="text-foreground">{students.length + (teacher ? 1 : 0)}</strong> thành viên</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <th className="py-3.5 px-4">Họ và tên / Tài khoản</th>
                <th className="py-3.5 px-4">Vai trò</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày tham gia</th>
                <th className="py-3.5 px-4 text-right">Xem sơ lược</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Teacher Row (Highlighted at top) */}
              {teacher && (
                <tr className="hover:bg-muted/30 bg-primary/[0.04] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-lg border border-primary/40">
                        <AvatarImage src={teacher.avatarUrl} alt={teacher.displayName} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {teacherInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{teacher.displayName || 'Giảng viên phụ trách'}</span>
                          <span title="Giảng viên xác minh">
                            <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">Giảng viên phụ trách</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-medium">
                      Giảng viên
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-foreground font-mono">{teacher.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Phụ trách lớp
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground font-mono">—</td>
                  <td className="py-3.5 px-4 text-right">
                    <MemberProfilePopover
                      member={{
                        enrollmentId: 'teacher',
                        studentId: teacher._id,
                        displayName: teacher.displayName || 'Giảng viên phụ trách',
                        email: teacher.email,
                        avatarUrl: teacher.avatarUrl,
                        role: 'teacher',
                        phone: teacher.phone,
                        bio: teacher.bio,
                        enrolledAt: '',
                        status: 'ENROLLED'
                      }}
                    />
                  </td>
                </tr>
              )}

              {/* Student Rows */}
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const initials = (student.displayName || student.email)
                    .split(' ')
                    .filter(Boolean)
                    .slice(-2)
                    .map((p) => p[0]?.toUpperCase())
                    .join('') || 'HV';

                  const enrolledDate = student.enrolledAt
                    ? new Date(student.enrolledAt).toLocaleDateString('vi-VN')
                    : '—';

                  return (
                    <tr key={student.enrollmentId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 rounded-lg border border-border">
                            <AvatarImage src={student.avatarUrl} alt={student.displayName} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">{student.displayName}</div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              ID: {student.studentId.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="border-border bg-muted/60 text-muted-foreground">
                          Học viên
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-mono">{student.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{enrolledDate}</td>
                      <td className="py-3.5 px-4 text-right">
                        <MemberProfilePopover member={student} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {search ? 'Không tìm thấy thành viên nào phù hợp' : 'Chưa có học viên nào ghi danh vào lớp này'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
