-- ====================================================================
-- MIGRATION 001: PLATFORM FOUNDATION & AUTHENTICATION
-- X-MILE Platform — Production Architecture
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER ROLES ENUM
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'FARMER',
    'BUYER',
    'FPO_ADMIN',
    'MACHINERY_PROVIDER',
    'TRANSPORT_PROVIDER',
    'STORAGE_PROVIDER',
    'EXPERT',
    'ADMIN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. PROFILES TABLE (Authoritative link to auth.users)
-- Unified 1:1 Identity: id is the sole authoritative key matching auth.users(id).
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role public.user_role NOT NULL DEFAULT 'FARMER',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  state TEXT NOT NULL DEFAULT 'Karnataka',
  district TEXT NOT NULL DEFAULT 'Tumakuru',
  village TEXT,
  location_coordinates JSONB,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  notification_preferences JSONB DEFAULT '{"sms": true, "push": true, "email": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HARDENED HELPER FUNCTIONS (Strict search_path = '')
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'::public.user_role
  );
$$;

-- 5. ROLE ESCALATION PROTECTION TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_bootstrap TEXT;
BEGIN
  -- If role is changing to ADMIN, require that executing caller is already verified ADMIN
  IF NEW.role = 'ADMIN'::public.user_role AND (OLD.role IS NULL OR OLD.role != 'ADMIN'::public.user_role) THEN
    -- Narrow operator exception: ONLY permitted during one-time initial bootstrap under advisory lock,
    -- ONLY by an explicitly privileged database session identity (e.g. 'postgres' or 'supabase_admin'),
    -- and ONLY when ZERO administrator profiles currently exist in the platform.
    v_is_bootstrap := pg_catalog.current_setting('app.initial_admin_bootstrap_active', true);
    IF v_is_bootstrap = 'true' AND session_user IN ('postgres', 'supabase_admin') THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE role = 'ADMIN'::public.user_role
      ) THEN
        RETURN NEW;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'ADMIN'::public.user_role
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only an existing administrator can grant the ADMIN role.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 6. AUTHENTICATION REGISTRATION TRIGGER (auth.users -> public.profiles)
-- Automatically creates profile upon Supabase Auth signup.
-- Enforces server-side role assignment and blocks unauthorized ADMIN self-promotion.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_role public.user_role;
BEGIN
  -- Strict server-side role assignment: Never allow self-promotion to ADMIN via metadata
  assigned_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' = 'ADMIN' THEN 'FARMER'::public.user_role
    WHEN NEW.raw_user_meta_data->>'role' IN (
      'FARMER', 'BUYER', 'FPO_ADMIN', 'MACHINERY_PROVIDER', 'TRANSPORT_PROVIDER', 'STORAGE_PROVIDER', 'EXPERT'
    ) THEN (NEW.raw_user_meta_data->>'role')::public.user_role
    ELSE 'FARMER'::public.user_role
  END;

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    preferred_language,
    state,
    district,
    is_verified
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', pg_catalog.split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE(NEW.raw_user_meta_data->>'state', 'Karnataka'),
    COALESCE(NEW.raw_user_meta_data->>'district', 'Tumakuru'),
    false -- Regulated accounts start unverified
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. DOCUMENTED OPERATOR BOOTSTRAP SPECIFICATION
-- In accordance with security audit finding P0.2, bootstrap_initial_admin() has been
-- completely removed from the public schema / RPC surface to eliminate HTTP attack vectors.
-- Initial platform administrator bootstrap is executed exclusively by a designated human
-- operator via Supabase Dashboard SQL Editor using the procedure documented in
-- scripts/staging-bootstrap-admin.sql with exclusive advisory lock and audit logging.

-- 8. SECURE PUBLIC PROFILES VIEW (Exposes ONLY non-sensitive discovery fields)
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  role,
  state,
  district,
  is_verified,
  created_at
FROM public.profiles;

-- 9. ADMIN INVITATIONS TABLE (Invitation-only administrator onboarding)
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invitation_token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index referencing correct column name (invitation_token_hash)
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token_hash ON public.admin_invitations(invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);

-- 10. ADMIN AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_logs(admin_id);

-- 11. ROW LEVEL SECURITY POLICIES FOR FOUNDATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users view own full profile" ON public.profiles;
CREATE POLICY "Users view own full profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create own profile" ON public.profiles;
CREATE POLICY "Authenticated users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Admin Invitations Policies
DROP POLICY IF EXISTS "Only admins manage admin invitations" ON public.admin_invitations;
CREATE POLICY "Only admins manage admin invitations"
  ON public.admin_invitations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin Audit Logs Policies
DROP POLICY IF EXISTS "Only admins view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only admins view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- 12. IMMUTABILITY ENFORCEMENT FOR ADMIN AUDIT LOGS
-- Physically prevents any UPDATE or DELETE at the database engine level (Append-Only)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_LOG_ENTRY: Modifications and deletions of admin_audit_logs records are strictly prohibited.'
    USING ERRCODE = '28000';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.admin_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_truncate
  BEFORE TRUNCATE ON public.admin_audit_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Revoke mutation permissions from all application and service roles
REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_audit_logs FROM PUBLIC, anon, authenticated, service_role;


