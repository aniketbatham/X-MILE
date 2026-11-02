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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const openLanguageModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-language-modal"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmitting) return;

    setErrorMessage(null);
    setErrorCode(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (role === "ADMIN" && !adminInvitationToken.trim()) {
      setErrorMessage("An authorized administrator invitation token is required for ADMIN registration.");
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);

    try {
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

      if (res.success) {
        if (res.emailConfirmationRequired) {
          setRegisteredEmail(res.email || email);
        } else {
          router.push(res.targetPortal);
        }
      } else {
        setErrorMessage(res.error || "Registration failed.");
        setErrorCode(res.code || null);
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
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

          {registeredEmail ? (
            /* Email Verification Sent View */
            <div className="text-center py-4">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl mb-4 shadow-sm border border-emerald-200">
                ✉️
              </div>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                Verify Your Email
              </h2>
              <p className="text-xs text-stone-600 mt-2 max-w-md mx-auto leading-relaxed">
                We have sent an activation link to:
              </p>
              <div className="my-3 inline-block px-4 py-2 rounded-xl bg-stone-100 font-mono text-xs font-bold text-stone-900 border border-stone-200">
                {registeredEmail}
              </div>
              <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                Please click the link inside the email to verify your address. Once verified, you can immediately sign in to your role dashboard.
              </p>

              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left max-w-md mx-auto">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">💡</span>
                  <div className="text-[11px] text-amber-900 leading-normal">
                    <p className="font-bold mb-0.5">Check Your Spam or Updates Folder</p>
                    <p>
                      Verification emails can occasionally land in your Spam or Junk folder. If you don&apos;t see it within 2 minutes, check there.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#172019] text-white text-xs font-bold hover:bg-black transition shadow-md"
                >
                  Proceed to Sign In →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setRegisteredEmail(null);
                    setErrorMessage(null);
                    setErrorCode(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition"
                >
                  Register Another Account
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black tracking-tight text-[#172019]">Join X-MILE Platform</h1>
                <p className="text-xs text-[#6a7c70] mt-1 font-semibold">
                  Every MILE Matters, Every FARMER Matters.
                </p>
              </div>

              {errorMessage && (
                <div
                  className={`mb-5 rounded-2xl p-4 text-xs font-medium border ${
                    errorCode === "EMAIL_RATE_LIMIT_EXCEEDED"
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : errorCode === "USER_ALREADY_EXISTS"
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base">
                      {errorCode === "EMAIL_RATE_LIMIT_EXCEEDED"
                        ? "⏳"
                        : errorCode === "USER_ALREADY_EXISTS"
                        ? "ℹ️"
                        : "⚠️"}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold mb-0.5">
                        {errorCode === "EMAIL_RATE_LIMIT_EXCEEDED"
                          ? "Email Service Rate Limit"
                          : errorCode === "USER_ALREADY_EXISTS"
                          ? "Account Already Exists"
                          : "Registration Notice"}
                      </div>
                      <div className="leading-relaxed">{errorMessage}</div>
                      {errorCode === "USER_ALREADY_EXISTS" && (
                        <div className="mt-2.5">
                          <Link href="/login" className="font-bold underline text-blue-950 inline-flex items-center gap-1">
                            Click here to Sign In →
                          </Link>
                        </div>
                      )}
                      {errorCode === "EMAIL_RATE_LIMIT_EXCEEDED" && (
                        <div className="mt-2.5 text-[11px] text-amber-800">
                          If you already submitted this registration, please check your inbox (including spam) for your verification link. You can also{" "}
                          <Link href="/login" className="font-bold underline">
                            proceed directly to Sign In
                          </Link>.
                        </div>
                      )}
                    </div>
                  </div>
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
              disabled={isLoading || isSubmitting}
              className="w-full rounded-xl bg-[#172019] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-black transition disabled:opacity-50 mt-2"
            >
              {isLoading || isSubmitting ? "Creating Account..." : "Complete Registration →"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center text-xs text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-emerald-700 hover:underline">
              Sign in
            </Link>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
