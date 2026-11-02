"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/lib/platform-db";

const ROLE_PORTALS: Record<string, string> = {
  FARMER: "/farmer",
  BUYER: "/buyer",
  ADMIN: "/admin",
  TRANSPORT_PROVIDER: "/logistics",
  LOGISTICS: "/logistics",
  FPO_ADMIN: "/fpo",
  MACHINERY_PROVIDER: "/machinery",
  STORAGE_PROVIDER: "/storage",
  EXPERT: "/experts",
};

interface RoleGuardProps {
  allowedRoles: UserRole[];
  portalName: string;
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, portalName, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-semibold text-stone-500">Verifying role credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  const isRoleAllowed = allowedRoles.includes(user.role);

  if (!isRoleAllowed) {
    const userHomePortal = ROLE_PORTALS[user.role] || "/";
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-200 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 text-3xl">
            🔒
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 uppercase tracking-wider">
              Role Access Restricted
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-2">
              Unauthorized Role Access
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-2">
              The <strong>{portalName}</strong> is reserved exclusively for{" "}
              <strong>{allowedRoles.join(" / ")}</strong> accounts.
            </p>
            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-left space-y-1">
              <div className="text-stone-500">Signed In Account:</div>
              <div className="font-bold text-stone-900">{user.fullName || user.email}</div>
              <div className="text-stone-600">
                Assigned Role: <span className="font-extrabold text-emerald-700">{user.role}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href={userHomePortal}
              className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition"
            >
              Go to My {user.role} Dashboard →
            </Link>
            <button
              onClick={() => logout()}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold transition"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
