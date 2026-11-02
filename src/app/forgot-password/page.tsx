"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import PlatformHeader from "@/components/PlatformHeader";

export default function ForgotPasswordPage() {
  const { recoverPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const res = await recoverPassword(email);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage(res.message || "Password recovery instructions sent to your email.");
    } else {
      setErrorMessage(res.error || "Failed to send password recovery instructions.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] flex flex-col">
      <PlatformHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md bg-white rounded-3xl border border-black/5 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#172019] text-white shadow-md text-2xl mb-3">
              🔑
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#172019]">Recover Password</h1>
            <p className="text-xs text-[#6a7c70] mt-1 font-semibold">
              Enter your email to receive recovery instructions.
            </p>
          </div>

          {successMessage && (
            <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 font-medium">
              ✓ {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="recover-email">
                Email Address
              </label>
              <input
                id="recover-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#172019] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-black transition disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send Recovery Email →"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-600">
            Remembered your password?{" "}
            <Link href="/login" className="font-bold text-emerald-700 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
