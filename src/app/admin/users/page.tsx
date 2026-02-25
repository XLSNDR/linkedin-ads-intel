import { AdminUsersClient } from "./AdminUsersClient";

export default function AdminUsersPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">User management</h1>
      <AdminUsersClient />
    </div>
  );
}
