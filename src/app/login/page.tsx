"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PlatformHeader from "@/components/PlatformHeader";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await login(email, password);
    setIsLoading(false);

    if (res.success) {
      router.push(res.targetPortal);
    } else {
      setErrorMessage(res.error || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] flex flex-col">
      <PlatformHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl border border-black/5 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#172019] text-white shadow-md text-2xl mb-3">
              🌱
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#172019]">Sign in to X-MILE</h1>
            <p className="text-xs text-[#6a7c70] mt-1 font-semibold">
              Every MILE Matters, Every FARMER Matters.
            </p>
          </div>

          {isAuthenticated && user && (
            <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900">
              <div className="font-bold mb-1">Already signed in as:</div>
              <div className="font-semibold">{user.fullName} ({user.email})</div>
              <div className="mt-1 text-[11px] text-emerald-700">Role: <span className="font-bold">{user.role}</span></div>
              <button
                type="button"
                onClick={() => {
                  const rolePortals: Record<string, string> = {
                    FARMER: "/farmer",
                    BUYER: "/buyer",
                    ADMIN: "/admin",
                    FPO_ADMIN: "/fpo",
                    MACHINERY_PROVIDER: "/machinery",
                    TRANSPORT_PROVIDER: "/logistics",
                    STORAGE_PROVIDER: "/storage",
                    EXPERT: "/experts",
                  };
                  router.push(rolePortals[user.role] || "/farmer");
                }}
                className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Go to My Portal →
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700" htmlFor="login-password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#172019] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-black transition disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-600">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-emerald-700 hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
