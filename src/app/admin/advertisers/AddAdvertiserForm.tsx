"use client";

import { useState } from "react";

export function AddAdvertiserForm({
  onAdded,
}: {
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [linkedinCompanyId, setLinkedinCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/advertisers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, linkedinCompanyId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to add advertiser");
        return;
      }

      setSuccess(true);
      setName("");
      setLinkedinCompanyId("");
      onAdded();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold mb-3">Add Advertiser</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <input
          type="text"
          placeholder="LinkedIn company ID (e.g. 2027242)"
          value={linkedinCompanyId}
          onChange={(e) => setLinkedinCompanyId(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Advertiser added.
        </p>
      )}
    </form>
  );
}
