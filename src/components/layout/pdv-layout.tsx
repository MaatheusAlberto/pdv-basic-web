import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface PDVLayoutProps {
  children: ReactNode;
}

export function PDVLayout({ children }: PDVLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
