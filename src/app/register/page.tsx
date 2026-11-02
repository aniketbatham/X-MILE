"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PlatformHeader from "@/components/PlatformHeader";
import { useLanguage } from "@/i18n/LanguageContext";
import { UserRole } from "@/lib/platform-db";

const ROLE_OPTIONS = [
  { role: "FARMER" as UserRole, label: "Farmer / Producer", icon: "🌾", desc: "Sell harvests, get AI quality grading & fair farm-gate pricing" },
  { role: "BUYER" as UserRole, label: "Commercial Buyer", icon: "🛒", desc: "Procure verified produce directly from farm gates" },
  { role: "TRANSPORT_PROVIDER" as UserRole, label: "Logistics Transporter", icon: "🚚", desc: "Provide rural transport & freight haulage services" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { currentLanguage } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("FARMER");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [state, setState] = useState("Karnataka");
  const [district, setDistrict] = useState("Tumakuru");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminInvitationToken, setAdminInvitationToken] = useState("");

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

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (role === "ADMIN" && !adminInvitationToken.trim()) {
      setErrorMessage("An authorized administrator invitation token is required for ADMIN registration.");
      return;
    }

    setIsLoading(true);

    const res = await register({
      fullName,
      email,
      password,
      phone: phone || undefined,
      role,
      preferredLanguage,
      state,
      district,
      adminInvitationToken: role === "ADMIN" ? adminInvitationToken.trim() : undefined,
    });

    setIsLoading(false);

    if (res.success) {
      router.push(res.targetPortal);
    } else {
      setErrorMessage(res.error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] flex flex-col">
      <PlatformHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-black/5 shadow-xl p-6 sm:p-8 my-4">
          
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
            <h1 className="text-2xl font-black tracking-tight text-[#172019]">Join X-MILE Platform</h1>
            <p className="text-xs text-[#6a7c70] mt-1 font-semibold">
              Every MILE Matters, Every FARMER Matters.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-medium">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select Your Role / खाता प्रकार चुनें
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => {
                      setRole(opt.role);
                      setShowAdminCode(false);
                    }}
                    className={`flex flex-col items-start gap-1 p-3 rounded-2xl border text-left transition ${
                      role === opt.role
                        ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500"
                        : "border-gray-200 hover:border-gray-300 bg-gray-50/30"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="text-xs font-bold text-gray-900 mt-1">{opt.label}</div>
                    <div className="text-[10px] text-gray-500 line-clamp-2 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Administrative Invitation Option */}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminCode(!showAdminCode);
                    if (!showAdminCode) setRole("ADMIN");
                    else setRole("FARMER");
                  }}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline"
                >
                  {showAdminCode ? "Cancel Admin Invitation Code" : "Have an Administrator Invitation Code?"}
                </button>
              </div>

              {showAdminCode && (
                <div className="mt-2 p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <span>🛡️</span>
                    <span>Admin Invitation Token</span>
                  </div>
                  <input
                    type="text"
                    value={adminInvitationToken}
                    onChange={(e) => setAdminInvitationToken(e.target.value)}
                    placeholder="Enter cryptographic admin invitation token..."
                    className="w-full rounded-lg border border-purple-300 bg-white px-3 py-2 text-xs text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-purple-700">
                    Administrator accounts are restricted to verified operators with cryptographic invitation credentials.
                  </p>
                </div>
              )}
            </div>

            {/* Profile Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-name">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-phone">
                  Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-password">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            {/* Location & Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-state">
                  State
                </label>
                <input
                  id="reg-state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-district">
                  District
                </label>
                <input
                  id="reg-district"
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor="reg-lang">
                  Language
                </label>
                <select
                  id="reg-lang"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs text-gray-900 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#172019] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-black transition disabled:opacity-50 mt-2"
            >
              {isLoading ? "Creating Account..." : "Complete Registration →"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-emerald-700 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
