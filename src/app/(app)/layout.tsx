import { AuthProvider } from "@/components/auth/AuthProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="pl-[240px] transition-all duration-300">
          <Topbar />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
