import type { PropsWithChildren } from 'react';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-black">
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
