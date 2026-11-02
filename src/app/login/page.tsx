"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PlatformHeader from "@/components/PlatformHeader";
import { useLanguage } from "@/i18n/LanguageContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, logout } = useAuth();
  const { currentLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openLanguageModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-language-modal"));
    }
  };

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
          
          {/* Header & Language Selection */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[#172019] text-white flex items-center justify-center text-lg">
                🌱
              </div>
              <span className="font-black text-stone-900 tracking-tight text-lg">X-MILE</span>
            </Link>

            <button
              type="button"
              onClick={openLanguageModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 hover:border-emerald-500 bg-stone-50 text-[11px] font-bold text-stone-700 hover:text-emerald-900 transition"
              aria-label="Change Language"
            >
              <span>🌐</span>
              <span>{currentLanguage.nativeName}</span>
              <span className="text-stone-400 font-normal">▼</span>
            </button>
          </div>

          <div className="text-center mb-6">
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
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rolePortals: Record<string, string> = {
                      FARMER: "/farmer",
                      BUYER: "/buyer",
                      ADMIN: "/admin",
                      TRANSPORT_PROVIDER: "/logistics",
                    };
                    router.push(rolePortals[user.role] || "/farmer");
                  }}
                  className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  Go to {user.role} Dashboard →
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Switch User
                </button>
              </div>
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
                  className="text-[11px] font-semibold text-emerald-700 hover:underline"
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
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#172019] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-black transition disabled:opacity-50 mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-600">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-emerald-700 hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
