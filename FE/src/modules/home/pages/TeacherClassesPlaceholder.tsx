import { BookOpen, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/page-header';

export const TeacherClassesPlaceholder = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lớp học phụ trách (Giảng viên)"
        description="Quản lý danh sách lớp học, phân công giảng dạy và bài tập học phần."
      />
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="size-6" />
          </div>
          <CardTitle className="mt-2 text-xl">Chào mừng Giảng viên</CardTitle>
          <CardDescription>
            Bạn đã đăng nhập thành công với vai trò <strong>Giảng viên (Teacher)</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Tính năng Quản lý Lớp học & Sinh viên sẽ được kết nối ở Giai đoạn 2 (Epic E2).
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
