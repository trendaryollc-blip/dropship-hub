import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import AdminClientLayout from "./AdminLayout";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminClientLayout>{children}</AdminClientLayout>
      </ToastProvider>
    </AuthProvider>
  );
}
