import { Toaster as SonnerToaster } from 'sonner';

function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'hsl(224 40% 14%)',
          color: 'hsl(210 40% 98%)',
          border: '1px solid hsl(223 21% 26%)',
        },
      }}
    />
  );
}

export { Toaster };
