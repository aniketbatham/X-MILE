-- ====================================================================
-- MIGRATION 003: PLATFORM SERVICES & EXTENDED MODULES
-- X-MILE Platform — Production Architecture
-- Preserving All 32 Modules: Farms, Crops, FPO, Residue, Machinery,
-- Storage, Logistics, Weighment, Soil, Calendar, Triage
-- ====================================================================

-- 1. FARMS & PLOTS
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

-- 2. CROP PLANS & ECONOMICS
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

-- 3. PRODUCE MARKETPLACE LISTINGS & OFFERS
CREATE TABLE IF NOT EXISTS public.produce_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  variety TEXT,
  category TEXT NOT NULL DEFAULT 'standard',
  quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg >= 0),
  quality_grade TEXT NOT NULL DEFAULT 'A',
  asking_price_per_kg NUMERIC(10,2) NOT NULL CHECK (asking_price_per_kg > 0),
  harvest_date DATE NOT NULL,
  pickup_location TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'ACTIVE',
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
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TRANSPORT REQUESTS & QUOTATIONS
CREATE TABLE IF NOT EXISTS public.transport_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  destination_location TEXT NOT NULL,
  produce_type TEXT NOT NULL,
  quantity_kg NUMERIC(10,2) NOT NULL,
  required_vehicle_type TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  quoted_amount NUMERIC(10,2),
  transporter_name TEXT,
  transporter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'LOOKING_FOR_TRANSPORTER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AGRICIRCLE: RESIDUE EXCHANGE
CREATE TABLE IF NOT EXISTS public.agricycle_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  residue_type TEXT NOT NULL,
  crop_source TEXT NOT NULL,
  quantity_quintals NUMERIC(10,2) NOT NULL CHECK (quantity_quintals > 0),
  moisture_percentage NUMERIC(4,1),
  condition TEXT NOT NULL,
  intended_use TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  asking_price_per_quintal NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agricycle_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.agricycle_listings(id) ON DELETE CASCADE,
  collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  actual_quantity_collected_quintals NUMERIC(10,2) NOT NULL,
  collection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settlement_amount NUMERIC(10,2) NOT NULL,
  co2_avoided_kg NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
);

-- 6. FPO & GROUP SELLING
CREATE TABLE IF NOT EXISTS public.fpos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
  pool_status TEXT NOT NULL DEFAULT 'COLLECTING',
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
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'A',
  required_quantity_mt NUMERIC(10,2) NOT NULL,
  offered_price_per_kg NUMERIC(10,2) NOT NULL,
  delivery_location TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MACHINERY & EQUIPMENT RENTAL
CREATE TABLE IF NOT EXISTS public.machinery_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL,
  brand_model TEXT NOT NULL,
  service_location TEXT NOT NULL,
  district TEXT NOT NULL,
  rate_basis TEXT NOT NULL DEFAULT 'HOURLY',
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
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SOIL HEALTH & CROP ROTATION
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

-- 9. HARVEST & BUYER DEMAND CALENDAR (Reconciled with plot & crop_plan references)
CREATE TABLE IF NOT EXISTS public.crop_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL,
  crop_plan_id UUID REFERENCES public.crop_plans(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. KVK & EXPERT DIRECTORY
CREATE TABLE IF NOT EXISTS public.kvk_institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
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
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  expert_advice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. FARM RECORDS & DIGITAL LOCKER
CREATE TABLE IF NOT EXISTS public.farm_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. STORAGE & WAREHOUSING
CREATE TABLE IF NOT EXISTS public.storage_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
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
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. WATER & IRRIGATION LOGS
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plot_id UUID REFERENCES public.plots(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  irrigation_date DATE NOT NULL,
  duration_hours NUMERIC(4,1) NOT NULL,
  source TEXT NOT NULL,
  water_volume_est_liters NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. DIGITAL WEIGHMENT & QUALITY
CREATE TABLE IF NOT EXISTS public.weighment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- 15. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. CROP TRIAGE CASES
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

-- 17. DISCREPANCIES
CREATE TABLE IF NOT EXISTS public.discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT,
  weighment_id UUID REFERENCES public.weighment_records(id) ON DELETE SET NULL,
  farmer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_kg NUMERIC(10,2) NOT NULL,
  actual_net_kg NUMERIC(10,2) NOT NULL,
  variance_kg NUMERIC(10,2) NOT NULL,
  variance_percent NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'INVESTIGATING',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. USER ADDRESSES
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL DEFAULT 'RESIDENTIAL' CHECK (address_type IN ('RESIDENTIAL', 'FARM_GATE', 'WAREHOUSE', 'COLLECTION_POINT', 'COMMERCIAL_OFFICE', 'OTHER')),
  label TEXT NOT NULL DEFAULT 'Home',
  is_default BOOLEAN NOT NULL DEFAULT false,
  recipient_name TEXT,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  village_or_locality TEXT,
  city_or_town TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  coordinates JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. CROPS MASTER
CREATE TABLE IF NOT EXISTS public.crops_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Vegetable',
  scientific_name TEXT,
  standard_varieties TEXT[] DEFAULT ARRAY[]::TEXT[],
  default_grade_standards JSONB DEFAULT '{"A": "Minimal blemishes, firm", "B": "Moderate cosmetic marks", "C": "Processing grade"}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. ROW LEVEL SECURITY POLICIES FOR PLATFORM SERVICES
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
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops_master ENABLE ROW LEVEL SECURITY;

-- Farms and Plots Policies
CREATE POLICY "Farmers manage farms" ON public.farms FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Plots through farm ownership" ON public.plots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.farms WHERE farms.id = plots.farm_id AND (farms.farmer_id = auth.uid() OR public.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.farms WHERE farms.id = plots.farm_id AND (farms.farmer_id = auth.uid() OR public.is_admin())));

-- Crop Plans
CREATE POLICY "Farmers manage crop plans" ON public.crop_plans FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Produce Listings & Offers
CREATE POLICY "Public view active produce listings" ON public.produce_listings FOR SELECT
  USING (status = 'ACTIVE' OR farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Farmers manage own listings" ON public.produce_listings FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Buyers and sellers view relevant offers" ON public.buyer_offers FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.produce_listings WHERE produce_listings.id = buyer_offers.listing_id AND produce_listings.farmer_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Buyers manage offers" ON public.buyer_offers FOR ALL
  USING (buyer_id = auth.uid() OR public.is_admin())
  WITH CHECK (buyer_id = auth.uid() OR public.is_admin());

-- Transport Requests
CREATE POLICY "Participants view transport requests" ON public.transport_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('TRANSPORT_PROVIDER', 'ADMIN'))
  );

CREATE POLICY "Requesters create transport requests" ON public.transport_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants update transport requests" ON public.transport_requests FOR UPDATE
  USING (
    requester_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('TRANSPORT_PROVIDER', 'ADMIN'))
  );

-- AgriCycle
CREATE POLICY "Public view active residue listings" ON public.agricycle_listings FOR SELECT
  USING (true);

CREATE POLICY "Farmers manage residue listings" ON public.agricycle_listings FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants view residue collections" ON public.agricycle_collections FOR SELECT
  USING (
    collector_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.agricycle_listings WHERE agricycle_listings.id = agricycle_collections.listing_id AND agricycle_listings.farmer_id = auth.uid())
    OR public.is_admin()
  );

-- FPOs
CREATE POLICY "Public view FPOs" ON public.fpos FOR SELECT USING (true);
CREATE POLICY "FPO Admins manage FPOs" ON public.fpos FOR ALL
  USING (admin_id = auth.uid() OR public.is_admin())
  WITH CHECK (admin_id = auth.uid() OR public.is_admin());

CREATE POLICY "Members view memberships" ON public.fpo_memberships FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.fpos WHERE fpos.id = fpo_memberships.fpo_id AND fpos.admin_id = auth.uid())
  );

CREATE POLICY "Members join FPO" ON public.fpo_memberships FOR INSERT
  WITH CHECK (
    farmer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.fpos WHERE fpos.id = fpo_memberships.fpo_id AND fpos.admin_id = auth.uid())
  );

CREATE POLICY "FPO Admin manages memberships" ON public.fpo_memberships FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.fpos WHERE fpos.id = fpo_memberships.fpo_id AND fpos.admin_id = auth.uid())
  );

CREATE POLICY "Public view aggregated lots" ON public.aggregated_lots FOR SELECT USING (true);
CREATE POLICY "FPO Admin manages aggregated lots" ON public.aggregated_lots FOR ALL
  USING (EXISTS (SELECT 1 FROM public.fpos WHERE fpos.id = aggregated_lots.fpo_id AND fpos.admin_id = auth.uid()) OR public.is_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.fpos WHERE fpos.id = aggregated_lots.fpo_id AND fpos.admin_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Farmers view own contributions" ON public.lot_contributions FOR SELECT
  USING (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Farmers contribute to lots" ON public.lot_contributions FOR INSERT
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Public view institutional demands" ON public.institutional_demands FOR SELECT
  USING (status = 'OPEN' OR buyer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Buyers manage institutional demands" ON public.institutional_demands FOR ALL
  USING (buyer_id = auth.uid() OR public.is_admin())
  WITH CHECK (buyer_id = auth.uid() OR public.is_admin());

-- Machinery
CREATE POLICY "Public view machinery" ON public.machinery_listings FOR SELECT USING (true);
CREATE POLICY "Owners manage machinery" ON public.machinery_listings FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants view bookings" ON public.machinery_bookings FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.machinery_listings WHERE machinery_listings.id = machinery_bookings.equipment_id AND machinery_listings.owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Farmers create bookings" ON public.machinery_bookings FOR INSERT
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Soil Reports
CREATE POLICY "Farmers manage soil reports" ON public.soil_reports FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Crop Calendar Events (Fixed Policy: references user_id directly)
CREATE POLICY "Users manage own calendar events" ON public.crop_calendar_events FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- KVK Institutions & Referrals
CREATE POLICY "Public view KVKs" ON public.kvk_institutions FOR SELECT USING (true);
CREATE POLICY "Participants view referrals" ON public.expert_referrals FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('EXPERT', 'ADMIN'))
  );

CREATE POLICY "Farmers create referrals" ON public.expert_referrals FOR INSERT
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Experts update referrals" ON public.expert_referrals FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('EXPERT', 'ADMIN'))
  );

-- Farm Records
CREATE POLICY "Farmers manage farm records" ON public.farm_records FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Storage
CREATE POLICY "Public view storage" ON public.storage_facilities FOR SELECT USING (true);
CREATE POLICY "Owners manage storage" ON public.storage_facilities FOR ALL
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants view storage enquiries" ON public.storage_enquiries FOR ALL
  USING (
    farmer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.storage_facilities WHERE storage_facilities.id = storage_enquiries.facility_id AND storage_facilities.owner_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Water Logs
CREATE POLICY "Farmers manage water logs" ON public.water_logs FOR ALL
  USING (farmer_id = auth.uid() OR public.is_admin())
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

-- Weighment Records
CREATE POLICY "Participants view weighment" ON public.weighment_records FOR SELECT
  USING (farmer_id = auth.uid() OR buyer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants insert weighment" ON public.weighment_records FOR INSERT
  WITH CHECK (farmer_id = auth.uid() OR buyer_id = auth.uid() OR public.is_admin());

-- Notifications
CREATE POLICY "Users manage notifications" ON public.notifications FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Crop Triage
CREATE POLICY "Participants view triage" ON public.crop_triage_cases FOR SELECT
  USING (
    farmer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('EXPERT', 'ADMIN'))
  );

CREATE POLICY "Farmers submit triage" ON public.crop_triage_cases FOR INSERT
  WITH CHECK (farmer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Experts update triage" ON public.crop_triage_cases FOR UPDATE
  USING (
    farmer_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('EXPERT', 'ADMIN'))
  );

-- Discrepancies
CREATE POLICY "Admins and participants view discrepancies" ON public.discrepancies FOR ALL
  USING (public.is_admin() OR farmer_id = auth.uid() OR buyer_id = auth.uid())
  WITH CHECK (public.is_admin());

-- User Addresses
CREATE POLICY "Users manage addresses" ON public.user_addresses FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Crops Master
CREATE POLICY "Public view active crops" ON public.crops_master FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage crops master" ON public.crops_master FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 21. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_produce_listings_status ON public.produce_listings(status);
CREATE INDEX IF NOT EXISTS idx_produce_listings_crop ON public.produce_listings(crop_name);
CREATE INDEX IF NOT EXISTS idx_produce_listings_farmer ON public.produce_listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_crop_plans_farmer ON public.crop_plans(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_records_farmer ON public.farm_records(farmer_id, date);
CREATE INDEX IF NOT EXISTS idx_soil_reports_farmer ON public.soil_reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_weighment_order ON public.weighment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON public.discrepancies(status);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_master_name ON public.crops_master(crop_name);
CREATE INDEX IF NOT EXISTS idx_calendar_user ON public.crop_calendar_events(user_id, scheduled_date);
