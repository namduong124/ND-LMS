import { Calendar, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/page-header';

export const StudentTimetablePlaceholder = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Thời khóa biểu (Học viên)"
        description="Theo dõi lịch học trong tuần và ca học trực tuyến của bạn."
      />
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Calendar className="size-6" />
          </div>
          <CardTitle className="mt-2 text-xl">Chào mừng Học viên</CardTitle>
          <CardDescription>
            Bạn đã đăng nhập thành công với vai trò <strong>Học viên (Student)</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Lưới Thời khóa biểu tuần sẽ được hiển thị ở Giai đoạn 3 (Epic E3).
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
