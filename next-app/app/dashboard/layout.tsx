// next-app/app/dashboard/layout.tsx
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Dashboard Container with white background and rounded borders */}
      <div className="bg-card rounded-lg border border-muted shadow-sm overflow-hidden min-h-[700px]">
        <div className="flex min-h-full">
          {/* Sidebar */}
          <Sidebar />

          {/* Divider */}
          <div className="w-px bg-muted"></div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Page Content - rendered by Next.js */}
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}