"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Plan = { id: string; name: string; displayName: string };
type UserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  planId: string;
  createdAt: string;
  plan: Plan | null;
};

export function AdminUsersClient() {
  const [pending, setPending] = useState<UserRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveModalUser, setApproveModalUser] = useState<UserRow | null>(null);
  const [approvePlanId, setApprovePlanId] = useState<string>("");
  const [approving, setApproving] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [planUpdatingId, setPlanUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        if (res.status === 403) setError("Forbidden");
        else setError("Failed to load users");
        return;
      }
      const data = await res.json();
      setPending(data.pending ?? []);
      setUsers(data.users ?? []);
      setPlans((data.plans ?? []).filter((p: Plan) => p.name !== "admin"));
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async () => {
    if (!approveModalUser || !approvePlanId) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/users/${approveModalUser.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: approvePlanId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Approve failed");
        return;
      }
      setApproveModalUser(null);
      setApprovePlanId(plans[0]?.id ?? "");
      await fetchUsers();
    } catch {
      setError("Approve failed");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (user: UserRow) => {
    setRejectingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Reject failed");
        return;
      }
      await fetchUsers();
    } catch {
      setError("Reject failed");
    } finally {
      setRejectingId(null);
    }
  };

  const handlePlanChange = async (userId: string, planId: string) => {
    setPlanUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Update failed");
        return;
      }
      await fetchUsers();
    } catch {
      setError("Update failed");
    } finally {
      setPlanUpdatingId(null);
    }
  };

  const name = (u: UserRow) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  const date = (s: string) => new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });

  if (loading) {
    return <p className="text-muted-foreground">Loading users…</p>;
  }
  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Pending approvals */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Pending approvals</h2>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending signups.</p>
        ) : (
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Signup date</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{name(u)}</td>
                    <td className="p-3">{date(u.createdAt)}</td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="mr-2"
                        onClick={() => {
                          setApproveModalUser(u);
                          setApprovePlanId(plans[0]?.id ?? "");
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rejectingId === u.id}
                        onClick={() => handleReject(u)}
                      >
                        {rejectingId === u.id ? "Sending…" : "Reject"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* All users */}
      <section>
        <h2 className="text-lg font-semibold mb-3">All users</h2>
        <div className="rounded-md border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Plan</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-right p-3 font-medium">Change plan</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{name(u)}</td>
                  <td className="p-3">{u.plan?.displayName ?? u.planId}</td>
                  <td className="p-3">
                    <span
                      className={
                        u.isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      }
                    >
                      {u.isActive ? "Active" : "Pending"}
                    </span>
                  </td>
                  <td className="p-3">{date(u.createdAt)}</td>
                  <td className="p-3 text-right">
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                      value={u.planId}
                      disabled={planUpdatingId === u.id}
                      onChange={(e) =>
                        handlePlanChange(u.id, e.target.value)
                      }
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Approve modal */}
      <Dialog
        open={!!approveModalUser}
        onOpenChange={(open) => !open && setApproveModalUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve user</DialogTitle>
          </DialogHeader>
          {approveModalUser && (
            <>
              <p className="text-sm text-muted-foreground">
                Assign a plan and send an approval email to{" "}
                <strong>{approveModalUser.email}</strong>.
              </p>
              <label className="text-sm font-medium">
                Plan
                <select
                  className="ml-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={approvePlanId}
                  onChange={(e) => setApprovePlanId(e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveModalUser(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || !approvePlanId}
            >
              {approving ? "Sending…" : "Approve & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
