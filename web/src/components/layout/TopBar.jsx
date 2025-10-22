import React from "react";
import { useAuth } from "../../features/common/AuthProvider";

export default function TopBar() {
  const { user, loading, logout } = useAuth();

  return (
    <div className="flex items-center justify-between h-14">
      <div className="font-semibold">Pramara PMS</div>
      <div className="text-sm">
        {!loading && user ? (
          <div className="flex items-center gap-3">
            <span className="opacity-80">{user.email}</span>
            <button
              onClick={() => logout()}
              className="px-3 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-neutral-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <span className="opacity-60">Not signed in</span>
        )}
      </div>
    </div>
  );
}
