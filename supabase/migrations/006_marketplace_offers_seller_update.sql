-- ====================================================================
-- MIGRATION 006: MARKETPLACE OFFERS SELLER UPDATE POLICY
-- Allows sellers (farmers) to accept, reject, or update offers on their own listings
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'buyer_offers' AND policyname = 'Sellers can update offers for own listings'
  ) THEN
    CREATE POLICY "Sellers can update offers for own listings" ON public.buyer_offers
      FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.produce_listings pl WHERE pl.id = buyer_offers.listing_id AND (pl.farmer_id = auth.uid() OR is_admin())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.produce_listings pl WHERE pl.id = buyer_offers.listing_id AND (pl.farmer_id = auth.uid() OR is_admin())));
  END IF;
END $$;
