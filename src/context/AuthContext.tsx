"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { UserRole } from "@/lib/platform-db";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  preferredLanguage: string;
  state: string;
  district: string;
  village?: string | null;
  phone?: string | null;
  notificationPreferences?: { sms?: boolean; push?: boolean; email?: boolean };
}

interface RegisterPayload {
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  preferredLanguage?: string;
  adminInvitationToken?: string;
  state?: string;
  district?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; targetPortal: string; error?: string; code?: string }>;
  register: (payload: RegisterPayload) => Promise<{
    success: boolean;
    targetPortal: string;
    error?: string;
    code?: string;
    emailConfirmationRequired?: boolean;
    message?: string;
    email?: string;
  }>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileForUser = useCallback(async (accessToken: string, authUserId: string, authEmail?: string | null) => {
    try {
      const res = await fetch("/api/auth/session", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isAuthenticated && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || authEmail || null,
            fullName: data.user.fullName,
            role: data.user.role as UserRole,
            isVerified: Boolean(data.user.isVerified),
            preferredLanguage: data.user.preferredLanguage || "en",
            state: data.user.state || "Karnataka",
            district: data.user.district || "Tumakuru",
            village: data.user.village,
            phone: data.user.phone,
            notificationPreferences: data.user.notificationPreferences,
          });
          return;
        }
      }

      // Fallback if session endpoint encounters pending migration
      setUser({
        id: authUserId,
        email: authEmail || null,
        fullName: authEmail?.split("@")[0] || "User",
        role: "FARMER",
        isVerified: false,
        preferredLanguage: "en",
        state: "Karnataka",
        district: "Tumakuru",
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        setToken(session.access_token);
        fetchProfileForUser(session.access_token, session.user.id, session.user.email).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session) {
        setToken(session.access_token);
        await fetchProfileForUser(session.access_token, session.user.id, session.user.email);
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, targetPortal: "/farmer", error: data.error || "Login failed." };
      }

      if (data.session?.accessToken) {
        setToken(data.session.accessToken);
        // Sync with supabase client
        await supabase.auth.setSession({
          access_token: data.session.accessToken,
          refresh_token: data.session.refreshToken || "",
        });
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role as UserRole,
        isVerified: Boolean(data.user.isVerified),
        preferredLanguage: data.user.preferredLanguage || "en",
        state: data.user.state || "Karnataka",
        district: data.user.district || "Tumakuru",
        village: data.user.village,
      });

      return {
        success: true,
        targetPortal: data.targetPortal || "/farmer",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during login.";
      return { success: false, targetPortal: "/farmer", error: message };
    }
  };

  const register = async (payload: RegisterPayload) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          targetPortal: "/farmer",
          error: data.error || "Registration failed.",
          code: data.code,
        };
      }

      // If email confirmation is required, do NOT attempt immediate login or auto-redirect to protected portal
      if (data.emailConfirmationRequired) {
        return {
          success: true,
          emailConfirmationRequired: true,
          email: payload.email,
          message: data.message,
          targetPortal: "/login",
        };
      }

      // If password was provided and confirmation is NOT required, attempt direct login
      if (payload.password) {
        const loginRes = await login(payload.email, payload.password);
        if (loginRes.success) {
          return loginRes;
        }
      }

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

      return {
        success: true,
        targetPortal: rolePortals[payload.role] || "/farmer",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during registration.";
      return { success: false, targetPortal: "/farmer", error: message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      setToken(null);
      router.push("/login");
    }
  };

  const recoverPassword = async (email: string) => {
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to send reset email." };
      }
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error sending password recovery.";
      return { success: false, error: message };
    }
  };

  const resetPassword = async (newPassword: string) => {
    if (!token) {
      return { success: false, error: "Authentication token required." };
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to update password." };
      }
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating password.";
      return { success: false, error: message };
    }
  };

  const refreshProfile = async () => {
    if (!token || !user) return;
    await fetchProfileForUser(token, user.id, user.email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        recoverPassword,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
