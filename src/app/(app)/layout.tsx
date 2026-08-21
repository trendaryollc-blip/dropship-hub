"use client";

import { useState } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="md:pl-[240px] transition-all duration-300">
          <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
