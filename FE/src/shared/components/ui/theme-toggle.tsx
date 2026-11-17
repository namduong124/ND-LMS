import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTheme, setTheme, type Theme, cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';

interface ThemeToggleProps {
  variant?: 'button' | 'segmented';
  className?: string;
}

export function ThemeToggle({ variant = 'segmented', className }: ThemeToggleProps) {
  const [current, setCurrent] = useState<Theme>(() => {
    const t = getTheme();
    return t === 'light' ? 'light' : 'dark';
  });

  const select = (theme: Theme) => {
    setTheme(theme);
    setCurrent(theme);
  };

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label="Theme mode switcher"
        className={cn('inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/70 p-0.5 text-xs backdrop-blur-xs', className)}
      >
        <button
          type="button"
          onClick={() => select('light')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            current === 'light'
              ? 'bg-card text-primary font-semibold shadow-xs ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Chế độ Sáng"
          aria-label="Light mode"
        >
          <Sun className="size-3.5" />
          <span>Sáng</span>
        </button>
        <button
          type="button"
          onClick={() => select('dark')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            current === 'dark'
              ? 'bg-card text-primary font-semibold shadow-xs ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Chế độ Tối"
          aria-label="Dark mode"
        >
          <Moon className="size-3.5" />
          <span>Tối</span>
        </button>
      </div>
    );
  }

  const cycle = () => {
    const next: Theme = current === 'light' ? 'dark' : 'light';
    select(next);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycle}
      className={cn('gap-1.5 text-muted-foreground hover:text-foreground', className)}
      aria-label={`Switch theme (current: ${current})`}
    >
      {current === 'light' ? <Sun className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}
      <span className="capitalize">{current === 'light' ? 'Sáng' : 'Tối'}</span>
    </Button>
  );
}
