export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Console</h1>
        <div className="text-sm text-gray-600">Logged in as Administrator</div>
      </nav>
      <main className="container mx-auto p-6">{children}</main>
    </div>
  );
}