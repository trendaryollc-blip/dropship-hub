import { AuthProvider } from "@/components/auth/AuthProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
        {/* Background effects */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-warm/[0.04] rounded-full blur-[80px]" />

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-accent/30 rounded-full animate-float" />
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-accent-warm/30 rounded-full animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 left-1/4 w-1 h-1 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 w-full max-w-md mx-4">
          {children}
        </div>
      </div>
    </AuthProvider>
  );
}
