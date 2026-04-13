import React from 'react';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-theme bg-background text-foreground min-h-screen">
      {children}
    </div>
  );
}
