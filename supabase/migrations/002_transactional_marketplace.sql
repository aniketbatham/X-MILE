-- ====================================================================
-- MIGRATION 002: TRANSACTIONAL MARKETPLACE
-- X-MILE Platform — Production Architecture
-- Farmers, Inventory, Orders, Order Items, Shipments
-- ====================================================================

-- 1. FARMERS TABLE (Compatibility with existing production queries)
CREATE TABLE IF NOT EXISTS public.farmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmers_profile ON public.farmers(profile_id);
CREATE INDEX IF NOT EXISTS idx_farmers_name ON public.farmers(name);

-- 2. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  produce TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  quality_grade TEXT NOT NULL CHECK (quality_grade IN ('A', 'B', 'C')),
  reserved_quantity_kg NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_quantity_kg >= 0),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD')),
  available BOOLEAN NOT NULL DEFAULT true,
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  quality_confidence INTEGER CHECK (quality_confidence BETWEEN 0 AND 100),
  quality_observations TEXT[] DEFAULT ARRAY[]::TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_inventory_reserved_le_quantity CHECK (reserved_quantity_kg <= quantity_kg),
  CONSTRAINT chk_inventory_availability_sync CHECK (
    (status = 'AVAILABLE' AND available = true) OR
    (status IN ('RESERVED', 'SOLD') AND available = false)
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_status_produce_grade ON public.inventory(status, available, produce, quality_grade);
CREATE INDEX IF NOT EXISTS idx_inventory_farmer ON public.inventory(farmer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON public.inventory(available);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  produce TEXT NOT NULL,
  requested_quantity_kg NUMERIC NOT NULL CHECK (requested_quantity_kg > 0),
  required_grade TEXT NOT NULL CHECK (required_grade IN ('A', 'B', 'C')),
  destination TEXT NOT NULL,
  fulfilled_quantity_kg NUMERIC NOT NULL DEFAULT 0 CHECK (fulfilled_quantity_kg >= 0),
  fulfillment_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (fulfillment_percentage BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'Accepted' CHECK (status IN ('Accepted', 'Dispatched', 'Delivered', 'Disputed', 'Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE RESTRICT,
  quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory ON public.order_items(inventory_id);

-- 5. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Preparing' CHECK (status IN ('Preparing', 'Dispatched', 'In Transit', 'Delivered', 'Delayed', 'Failed')),
  origin TEXT,
  destination TEXT NOT NULL,
  total_quantity_kg NUMERIC NOT NULL DEFAULT 0 CHECK (total_quantity_kg >= 0),
  current_location TEXT,
  estimated_distance_km NUMERIC,
  estimated_time_minutes NUMERIC,
  progress_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);

-- 6. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Farmers Policies
CREATE POLICY "Public can view farmers"
  ON public.farmers FOR SELECT
  USING (true);

CREATE POLICY "Farmers manage own farmer record"
  ON public.farmers FOR ALL
  USING (profile_id = auth.uid() OR public.is_admin())
  WITH CHECK (profile_id = auth.uid() OR public.is_admin());

-- Inventory Policies
CREATE POLICY "Public can view available inventory"
  ON public.inventory FOR SELECT
  USING (
    available = true
    OR EXISTS (SELECT 1 FROM public.farmers WHERE farmers.id = inventory.farmer_id AND farmers.profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "Farmers manage own inventory"
  ON public.inventory FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.farmers WHERE farmers.id = inventory.farmer_id AND farmers.profile_id = auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.farmers WHERE farmers.id = inventory.farmer_id AND farmers.profile_id = auth.uid())
    OR public.is_admin()
  );

-- Orders Policies
CREATE POLICY "Buyers and Admins view relevant orders"
  ON public.orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.inventory inv ON inv.id = oi.inventory_id
      JOIN public.farmers f ON f.id = inv.farmer_id
      WHERE oi.order_id = orders.id AND f.profile_id = auth.uid()
    )
  );

CREATE POLICY "Authorized callers update orders"
  ON public.orders FOR UPDATE
  USING (buyer_id = auth.uid() OR created_by = auth.uid() OR public.is_admin())
  WITH CHECK (buyer_id = auth.uid() OR created_by = auth.uid() OR public.is_admin());

-- Order Items Policies
CREATE POLICY "Participants view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.buyer_id = auth.uid() OR o.created_by = auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.inventory inv
      JOIN public.farmers f ON f.id = inv.farmer_id
      WHERE inv.id = order_items.inventory_id AND f.profile_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Shipments Policies
CREATE POLICY "Participants view shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipments.order_id AND (o.buyer_id = auth.uid() OR o.created_by = auth.uid()))
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('TRANSPORT_PROVIDER', 'ADMIN'))
  );

CREATE POLICY "Transporters and Admins update shipments"
  ON public.shipments FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('TRANSPORT_PROVIDER', 'ADMIN'))
  );
