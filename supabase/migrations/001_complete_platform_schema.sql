-- ====================================================================
-- X-MILE PLATFORM COMPLETE DATABASE SCHEMA (PARTS A, B, AND C)
-- "Every MILE Matters, Every FARMER Matters."
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
  user_id UUID UNIQUE,
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

-- 4. FARMS & PLOTS
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_area_acres NUMERIC(8,2) NOT NULL DEFAULT 0,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
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
  quantity_kg NUMERIC(10,2) NOT NULL,
  quality_grade TEXT NOT NULL DEFAULT 'A',
  asking_price_per_kg NUMERIC(10,2) NOT NULL,
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
  offered_price_per_kg NUMERIC(10,2) NOT NULL,
  offered_quantity_kg NUMERIC(10,2) NOT NULL,
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
  status TEXT NOT NULL DEFAULT 'LOOKING_FOR_TRANSPORTER', -- QUOTED, ASSIGNED, IN_TRANSIT, DELIVERED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. AGRICIRCLE: AGRICULTURAL RESIDUE EXCHANGE
CREATE TABLE IF NOT EXISTS public.agricycle_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  residue_type TEXT NOT NULL, -- Paddy Straw, Cotton Stalk, Sugarcane Bagasse, Maize Stover
  crop_source TEXT NOT NULL,
  quantity_quintals NUMERIC(10,2) NOT NULL,
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
  buyer_name TEXT NOT NULL,
  actual_quantity_collected_quintals NUMERIC(10,2) NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settlement_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
);

-- 9. FPO & GROUP SELLING
CREATE TABLE IF NOT EXISTS public.fpos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS public.aggregated_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fpo_id UUID REFERENCES public.fpos(id) ON DELETE CASCADE,
  lot_code TEXT UNIQUE NOT NULL,
  crop_name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  total_quantity_kg NUMERIC(12,2) NOT NULL,
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

-- 16. WATER & IRRIGATION LOGS
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
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

-- 19. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agricycle_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machinery_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read of verified public marketplace entities
CREATE POLICY "Public produce listings read" ON public.produce_listings FOR SELECT USING (true);
CREATE POLICY "Public machinery listings read" ON public.machinery_listings FOR SELECT USING (true);
CREATE POLICY "Public agricycle listings read" ON public.agricycle_listings FOR SELECT USING (true);
CREATE POLICY "Public KVK institutions read" ON public.kvk_institutions FOR SELECT USING (true);
CREATE POLICY "Public storage read" ON public.storage_facilities FOR SELECT USING (true);
