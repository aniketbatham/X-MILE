-- ====================================================================
-- X-MILE PLATFORM COMPLETE DATABASE SCHEMA & RLS SECURITY POLICIES
-- Master Blueprint: Parts A, B, and C
-- Tagline: "Every MILE Matters, Every FARMER Matters."
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER ROLES ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
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
  WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE, -- References auth.users(id) when Supabase Auth is active
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role user_role NOT NULL DEFAULT 'FARMER',
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

-- Trigger to prevent non-admins from promoting themselves to ADMIN
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is changing to ADMIN, require that executing user is already verified admin
  IF NEW.role = 'ADMIN' AND OLD.role != 'ADMIN' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Only an existing administrator can grant the ADMIN role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 4. FARMS & PLOTS
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_area_acres NUMERIC(8,2) NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'Karnataka',
  district TEXT NOT NULL DEFAULT 'Tumakuru',
  village TEXT,
  survey_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.plots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  plot_code TEXT NOT NULL,
  area_acres NUMERIC(8,2) NOT NULL,
  soil_type TEXT NOT NULL,
  irrigation_source TEXT NOT NULL,
  current_crop TEXT,
  crop_stage TEXT,
  sowing_date DATE,
  expected_harvest_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CROP PLANS & ECONOMICS
CREATE TABLE IF NOT EXISTS public.crop_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  variety TEXT,
  season TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  expected_yield_kg NUMERIC(10,2) NOT NULL,
  target_selling_price_per_kg NUMERIC(10,2) NOT NULL,
  estimated_cost NUMERIC(12,2) NOT NULL,
  estimated_revenue NUMERIC(12,2) NOT NULL,
  break_even_price_per_kg NUMERIC(10,2) NOT NULL,
  break_even_yield_kg NUMERIC(10,2) NOT NULL,
  assumptions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRODUCE MARKETPLACE LISTINGS & OFFERS
CREATE TABLE IF NOT EXISTS public.produce_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  category TEXT NOT NULL DEFAULT 'standard', -- 'standard' or 'surplus'
  quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg >= 0),
  quality_grade TEXT NOT NULL DEFAULT 'A',
  asking_price_per_kg NUMERIC(10,2) NOT NULL CHECK (asking_price_per_kg > 0),
  harvest_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, UNDER_OFFER, FULFILLED, EXPIRED
  is_verified_lot BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buyer_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.produce_listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_price_per_kg NUMERIC(10,2) NOT NULL CHECK (offered_price_per_kg > 0),
  offered_quantity_kg NUMERIC(10,2) NOT NULL CHECK (offered_quantity_kg > 0),
  destination_city TEXT NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT 'Escrow on Delivery',
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, COUNTERED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRANSPORT REQUESTS & QUOTATIONS
CREATE TABLE IF NOT EXISTS public.transport_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID,
  requester_id UUID REFERENCES public.profiles(id),
  pickup_location TEXT NOT NULL,
  destination_location TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  quantity_kg NUMERIC(10,2) NOT NULL,
  required_vehicle_type TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  quoted_amount NUMERIC(10,2),
  transporter_name TEXT,
  transporter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'LOOKING_FOR_TRANSPORTER', -- QUOTED, ASSIGNED, IN_TRANSIT, DELIVERED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AGRICIRCLE: AGRICULTURAL RESIDUE EXCHANGE
CREATE TABLE IF NOT EXISTS public.agricycle_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  residue_type TEXT NOT NULL, -- Paddy Straw, Cotton Stalk, Sugarcane Bagasse, Maize Stover
  crop_source TEXT NOT NULL,
  quantity_quintals NUMERIC(10,2) NOT NULL CHECK (quantity_quintals > 0),
  moisture_percentage NUMERIC(4,1),
  condition TEXT NOT NULL, -- Baled, Loose, Chopped
  intended_use TEXT NOT NULL, -- Biofuel, Paper, Composting, Mushroom cultivation
  pickup_location TEXT NOT NULL,
  asking_price_per_quintal NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, RESERVED, COLLECTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agricycle_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.agricycle_listings(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES public.profiles(id),
  buyer_name TEXT NOT NULL,
  actual_quantity_collected_quintals NUMERIC(10,2) NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settlement_amount NUMERIC(10,2) NOT NULL,
  co2_avoided_kg NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
);

-- 9. FPO & GROUP SELLING
CREATE TABLE IF NOT EXISTS public.fpos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  total_members INTEGER NOT NULL DEFAULT 1,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  crops_supported TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fpo_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpo_id UUID REFERENCES public.fpos(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_code TEXT NOT NULL,
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(fpo_id, farmer_id)
);

CREATE TABLE IF NOT EXISTS public.aggregated_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpo_id UUID REFERENCES public.fpos(id) ON DELETE CASCADE,
  lot_code TEXT UNIQUE NOT NULL,
  crop_name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  total_quantity_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  pool_status TEXT NOT NULL DEFAULT 'COLLECTING', -- COLLECTING, POOLED, SOLD, DISPATCHED
  target_price_per_kg NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lot_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID REFERENCES public.aggregated_lots(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quantity_contributed_kg NUMERIC(10,2) NOT NULL,
  grade_verified TEXT NOT NULL DEFAULT 'A',
  payout_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institutional_demands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES public.profiles(id),
  buyer_name TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  required_quantity_mt NUMERIC(10,2) NOT NULL,
  offered_price_per_kg NUMERIC(10,2) NOT NULL,
  delivery_location TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, ALLOCATED, FULFILLED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. MACHINERY & EQUIPMENT RENTAL
CREATE TABLE IF NOT EXISTS public.machinery_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL, -- Tractor, Harvester, Laser Land Leveler, Rotavator, Drone Sprayer
  brand_model TEXT NOT NULL,
  service_location TEXT NOT NULL,
  district TEXT NOT NULL,
  rate_basis TEXT NOT NULL DEFAULT 'HOURLY', -- HOURLY, PER_ACRE, DAILY
  rate_amount NUMERIC(10,2) NOT NULL,
  includes_operator BOOLEAN NOT NULL DEFAULT true,
  includes_fuel BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.machinery_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID REFERENCES public.machinery_listings(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  duration_hours_or_acres NUMERIC(8,2) NOT NULL,
  total_estimate NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, CONFIRMED, COMPLETED, CANCELLED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SOIL HEALTH & CROP ROTATION
CREATE TABLE IF NOT EXISTS public.soil_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  test_date DATE NOT NULL,
  testing_lab TEXT NOT NULL,
  ph NUMERIC(3,1) NOT NULL,
  electrical_conductivity NUMERIC(4,2),
  organic_carbon_percent NUMERIC(4,2) NOT NULL,
  nitrogen_kg_per_ha NUMERIC(6,2) NOT NULL,
  phosphorus_kg_per_ha NUMERIC(6,2) NOT NULL,
  potassium_kg_per_ha NUMERIC(6,2) NOT NULL,
  micronutrient_notes TEXT,
  recommended_crop_rotation TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. HARVEST & BUYER DEMAND CALENDAR
CREATE TABLE IF NOT EXISTS public.crop_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- SOWING, IRRIGATION, FERTILIZER, HARVEST, BUYER_DEMAND
  title TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. KVK & EXPERT DIRECTORY
CREATE TABLE IF NOT EXISTS public.kvk_institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  institution_type TEXT NOT NULL, -- KVK, ICAR Institute, State Agri University
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  specialization TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  website TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.expert_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  kvk_id UUID REFERENCES public.kvk_institutions(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, IN_REVIEW, ADVICE_RECEIVED
  expert_advice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. FARM RECORDS & DIGITAL LOCKER
CREATE TABLE IF NOT EXISTS public.farm_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL, -- EXPENSE, REVENUE, HARVEST, CERTIFICATE
  category TEXT NOT NULL, -- Seeds, Fertilizers, Labor, Machinery, Produce Sale
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. STORAGE & WAREHOUSING
CREATE TABLE IF NOT EXISTS public.storage_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL, -- Cold Storage, Dry Warehouse, Silo
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  total_capacity_mt NUMERIC(10,2) NOT NULL,
  available_capacity_mt NUMERIC(10,2) NOT NULL,
  accepted_commodities TEXT[] NOT NULL,
  rate_per_month_per_quintal NUMERIC(8,2) NOT NULL,
  temperature_range TEXT,
  phone TEXT NOT NULL,
  is_wdra_registered BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.storage_enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES public.storage_facilities(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  commodity TEXT NOT NULL,
  quantity_mt NUMERIC(8,2) NOT NULL,
  intended_start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, CONFIRMED, REJECTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. WATER & IRRIGATION LOGS
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  irrigation_date DATE NOT NULL,
  duration_hours NUMERIC(4,1) NOT NULL,
  source TEXT NOT NULL, -- Borewell, Canal, Drip, Sprinkler
  water_volume_est_liters NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. DIGITAL WEIGHMENT & QUALITY
CREATE TABLE IF NOT EXISTS public.weighment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID,
  farmer_id UUID REFERENCES public.profiles(id),
  buyer_id UUID REFERENCES public.profiles(id),
  produce_name TEXT NOT NULL,
  gross_weight_kg NUMERIC(10,2) NOT NULL,
  tare_weight_kg NUMERIC(10,2) NOT NULL,
  net_weight_kg NUMERIC(10,2) NOT NULL,
  moisture_percent NUMERIC(4,1),
  agreed_grade TEXT NOT NULL,
  weighment_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collector_name TEXT NOT NULL,
  farmer_confirmed BOOLEAN NOT NULL DEFAULT true,
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'PENDING_BUYER'
);

-- 18. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL, -- MARKET, ORDER, WEATHER, SCHEME, EXPERT
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. CROP TRIAGE CASES
CREATE TABLE IF NOT EXISTS public.crop_triage_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  symptom_description TEXT NOT NULL,
  photo_url TEXT,
  suggested_hygiene_measures TEXT[] DEFAULT ARRAY[]::TEXT[],
  kvk_referral_sent BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. ADMIN & INTEGRITY: AUDIT LOGS & DISCREPANCIES
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID,
  weighment_id UUID REFERENCES public.weighment_records(id),
  farmer_id UUID REFERENCES public.profiles(id),
  buyer_id UUID REFERENCES public.profiles(id),
  expected_kg NUMERIC(10,2) NOT NULL,
  actual_net_kg NUMERIC(10,2) NOT NULL,
  variance_kg NUMERIC(10,2) NOT NULL,
  variance_percent NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'INVESTIGATING', -- INVESTIGATING, SETTLED, FLAGGED
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricycle_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricycle_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fpo_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregated_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutional_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kvk_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weighment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_triage_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public can view basic profiles" ON public.profiles;
CREATE POLICY "Public can view basic profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can create own profile" ON public.profiles;
CREATE POLICY "Authenticated users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 2. Farms and Plots
DROP POLICY IF EXISTS "Farmers own farms" ON public.farms;
CREATE POLICY "Farmers own farms"
  ON public.farms FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Plots through farm ownership" ON public.plots;
CREATE POLICY "Plots through farm ownership"
  ON public.plots FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = plots.farm_id AND farms.farmer_id = public.current_profile_id())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.farms WHERE farms.id = plots.farm_id AND farms.farmer_id = public.current_profile_id())
    OR public.is_admin()
  );

-- 3. Crop Plans
DROP POLICY IF EXISTS "Farmers own crop plans" ON public.crop_plans;
CREATE POLICY "Farmers own crop plans"
  ON public.crop_plans FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

-- 4. Marketplace Produce Listings & Offers
DROP POLICY IF EXISTS "Public can view active produce listings" ON public.produce_listings;
CREATE POLICY "Public can view active produce listings"
  ON public.produce_listings FOR SELECT
  USING (status = 'ACTIVE' OR farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Farmers manage own listings" ON public.produce_listings;
CREATE POLICY "Farmers manage own listings"
  ON public.produce_listings FOR INSERT
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Farmers update own listings" ON public.produce_listings;
CREATE POLICY "Farmers update own listings"
  ON public.produce_listings FOR UPDATE
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Buyers and sellers view relevant offers" ON public.buyer_offers;
CREATE POLICY "Buyers and sellers view relevant offers"
  ON public.buyer_offers FOR SELECT
  USING (
    buyer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.produce_listings WHERE produce_listings.id = buyer_offers.listing_id AND produce_listings.farmer_id = public.current_profile_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Buyers can create offers" ON public.buyer_offers;
CREATE POLICY "Buyers can create offers"
  ON public.buyer_offers FOR INSERT
  WITH CHECK (buyer_id = public.current_profile_id());

DROP POLICY IF EXISTS "Buyers and sellers can update offers" ON public.buyer_offers;
CREATE POLICY "Buyers and sellers can update offers"
  ON public.buyer_offers FOR UPDATE
  USING (
    buyer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.produce_listings WHERE produce_listings.id = buyer_offers.listing_id AND produce_listings.farmer_id = public.current_profile_id())
    OR public.is_admin()
  );

-- 5. AgriCycle Residue Exchange
DROP POLICY IF EXISTS "Public can view active residue listings" ON public.agricycle_listings;
CREATE POLICY "Public can view active residue listings"
  ON public.agricycle_listings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Farmers manage residue listings" ON public.agricycle_listings;
CREATE POLICY "Farmers manage residue listings"
  ON public.agricycle_listings FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Collections viewable by participants" ON public.agricycle_collections;
CREATE POLICY "Collections viewable by participants"
  ON public.agricycle_collections FOR SELECT
  USING (
    collector_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.agricycle_listings WHERE agricycle_listings.id = agricycle_collections.listing_id AND agricycle_listings.farmer_id = public.current_profile_id())
    OR public.is_admin()
  );

-- 6. FPO & Group Lots
DROP POLICY IF EXISTS "FPO info viewable by all" ON public.fpos;
CREATE POLICY "FPO info viewable by all"
  ON public.fpos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "FPO Admin manages FPO" ON public.fpos;
CREATE POLICY "FPO Admin manages FPO"
  ON public.fpos FOR ALL
  USING (admin_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (admin_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Aggregated lots viewable by all" ON public.aggregated_lots;
CREATE POLICY "Aggregated lots viewable by all"
  ON public.aggregated_lots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Farmer views own lot contributions" ON public.lot_contributions;
CREATE POLICY "Farmer views own lot contributions"
  ON public.lot_contributions FOR SELECT
  USING (farmer_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Farmer adds own lot contribution" ON public.lot_contributions;
CREATE POLICY "Farmer adds own lot contribution"
  ON public.lot_contributions FOR INSERT
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

-- 7. Machinery
DROP POLICY IF EXISTS "Public can view machinery listings" ON public.machinery_listings;
CREATE POLICY "Public can view machinery listings"
  ON public.machinery_listings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners manage machinery listings" ON public.machinery_listings;
CREATE POLICY "Owners manage machinery listings"
  ON public.machinery_listings FOR ALL
  USING (owner_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (owner_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Bookings viewable by farmer and provider" ON public.machinery_bookings;
CREATE POLICY "Bookings viewable by farmer and provider"
  ON public.machinery_bookings FOR SELECT
  USING (
    farmer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.machinery_listings WHERE machinery_listings.id = machinery_bookings.equipment_id AND machinery_listings.owner_id = public.current_profile_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Farmers create machinery bookings" ON public.machinery_bookings;
CREATE POLICY "Farmers create machinery bookings"
  ON public.machinery_bookings FOR INSERT
  WITH CHECK (farmer_id = public.current_profile_id());

-- 8. Soil Reports
DROP POLICY IF EXISTS "Farmers view own soil reports" ON public.soil_reports;
CREATE POLICY "Farmers view own soil reports"
  ON public.soil_reports FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

-- 9. Farm Ledger & Records
DROP POLICY IF EXISTS "Farmers own farm financial records" ON public.farm_records;
CREATE POLICY "Farmers own farm financial records"
  ON public.farm_records FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

-- 10. Digital Weighment Records
DROP POLICY IF EXISTS "Participants view weighment records" ON public.weighment_records;
CREATE POLICY "Participants view weighment records"
  ON public.weighment_records FOR SELECT
  USING (
    farmer_id = public.current_profile_id()
    OR buyer_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authorized parties create weighment records" ON public.weighment_records;
CREATE POLICY "Authorized parties create weighment records"
  ON public.weighment_records FOR INSERT
  WITH CHECK (
    farmer_id = public.current_profile_id()
    OR buyer_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 11. Storage & Enquiries
DROP POLICY IF EXISTS "Public can view storage facilities" ON public.storage_facilities;
CREATE POLICY "Public can view storage facilities"
  ON public.storage_facilities FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Farmers and facility owners view enquiries" ON public.storage_enquiries;
CREATE POLICY "Farmers and facility owners view enquiries"
  ON public.storage_enquiries FOR ALL
  USING (
    farmer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.storage_facilities WHERE storage_facilities.id = storage_enquiries.facility_id AND storage_facilities.owner_id = public.current_profile_id())
    OR public.is_admin()
  )
  WITH CHECK (
    farmer_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 12. Water & Irrigation Logs
DROP POLICY IF EXISTS "Farmers manage water logs" ON public.water_logs;
CREATE POLICY "Farmers manage water logs"
  ON public.water_logs FOR ALL
  USING (farmer_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (farmer_id = public.current_profile_id() OR public.is_admin());

-- 13. Notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR ALL
  USING (user_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (user_id = public.current_profile_id() OR public.is_admin());

-- 14. Admin Audit Logs & Discrepancies
DROP POLICY IF EXISTS "Only admins view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Only admins view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins view and manage discrepancies" ON public.discrepancies;
CREATE POLICY "Admins view and manage discrepancies"
  ON public.discrepancies FOR ALL
  USING (public.is_admin() OR farmer_id = public.current_profile_id() OR buyer_id = public.current_profile_id())
  WITH CHECK (public.is_admin());

-- 15. Public reference directories
DROP POLICY IF EXISTS "Public view KVK institutions" ON public.kvk_institutions;
CREATE POLICY "Public view KVK institutions"
  ON public.kvk_institutions FOR SELECT
  USING (true);

-- 16. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_produce_listings_status ON public.produce_listings(status);
CREATE INDEX IF NOT EXISTS idx_produce_listings_crop ON public.produce_listings(crop_name);
CREATE INDEX IF NOT EXISTS idx_produce_listings_farmer ON public.produce_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crop_plans_farmer ON public.crop_plans(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_records_farmer ON public.farm_records(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_soil_reports_farmer ON public.soil_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_weighment_order ON public.weighment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON public.discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
