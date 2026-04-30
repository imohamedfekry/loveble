export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      
      {/* Sidebar */}
      <aside className="w-64 border-r p-4">
        Sidebar
      </aside>

      {/* Content */}
      <main className="flex-1 p-6">
        {children}
      </main>

    </div>
  )
}