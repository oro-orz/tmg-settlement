"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

interface SimpleShellProps {
  title: string;
  children: ReactNode;
}

export function SimpleShell({ title, children }: SimpleShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <header className="flex-shrink-0 border-b border-border bg-card px-6 py-4 rounded-b-2xl">
            <h1 className="text-heading font-semibold text-foreground">
              {title}
            </h1>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
