import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load staging configuration
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gufyukekzkomxfhvtruf.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function runFarmerPortalTests() {
  console.log("=============================================================");
  console.log("   X-MILE FARMER PORTAL FUNCTIONAL & INTEGRATION TEST SUITE  ");
  console.log(`   Target Supabase: ${supabaseUrl}`);
  console.log("=============================================================\n");

  // Step 1: Authenticate Farmer
  console.log("STEP 1: Authenticating Farmer (e2e_farmer@harvex.internal)...");
  const { data: farmerAuth, error: fAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_farmer@harvex.internal",
    password: "password123",
  });
  if (fAuthErr || !farmerAuth.session) {
    throw new Error(`Farmer login failed: ${fAuthErr?.message}`);
  }
  const farmerToken = farmerAuth.session.access_token;
  const farmerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${farmerToken}` } },
  });
  const farmerProfileId = farmerAuth.user.id;
  console.log(`   ✓ Farmer session authenticated (ID: ${farmerProfileId})`);

  // Step 2: Authenticate Buyer
  console.log("\nSTEP 2: Authenticating Buyer (e2e_buyer@harvex.internal)...");
  const { data: buyerAuth, error: bAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_buyer@harvex.internal",
    password: "password123",
  });
  if (bAuthErr || !buyerAuth.session) {
    throw new Error(`Buyer login failed: ${bAuthErr?.message}`);
  }
  const buyerToken = buyerAuth.session.access_token;
  const buyerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${buyerToken}` } },
  });
  console.log(`   ✓ Buyer authenticated (ID: ${buyerAuth.user.id})`);

  // Step 3: Register and update Farm Profile
  console.log("\nSTEP 3: Registering and updating Farm Profile...");
  const farmName = `Siddaramaiah Bio-Farm (${Date.now()})`;
  const { data: newFarm, error: farmErr } = await farmerClient
    .from("farms")
    .insert({
      farmer_id: farmerProfileId,
      name: farmName,
      total_area_acres: 6.5,
      district: "Tumakuru",
      state: "Karnataka",
      village: "Kunigal Rural",
      survey_number: "Sy. 118/3A",
    })
    .select()
    .single();

  if (farmErr || !newFarm) {
    throw new Error(`Farm profile creation failed: ${farmErr?.message}`);
  }
  console.log(`   ✓ Farm profile created: ID=${newFarm.id}, Name=${newFarm.name}, Area=${newFarm.total_area_acres} Acres`);

  // Update farm details
  const { data: updatedFarm, error: farmUpdateErr } = await farmerClient
    .from("farms")
    .update({ total_area_acres: 7.2 })
    .eq("id", newFarm.id)
    .select()
    .single();

  if (farmUpdateErr || !updatedFarm) {
    throw new Error(`Farm profile update failed: ${farmUpdateErr?.message}`);
  }
  console.log(`   ✓ Farm profile updated: New Area=${updatedFarm.total_area_acres} Acres`);

  // Create a plot in this farm
  const { data: newPlot, error: plotErr } = await farmerClient
    .from("plots")
    .insert({
      farm_id: newFarm.id,
      plot_code: "PLOT-NORTH-01",
      area_acres: 3.5,
      soil_type: "Red Loamy",
      irrigation_source: "Borewell Drip",
      current_crop: "Tomato",
      crop_stage: "Flowering & Fruiting",
    })
    .select()
    .single();

  if (plotErr || !newPlot) {
    throw new Error(`Plot registration failed: ${plotErr?.message}`);
  }
  console.log(`   ✓ Farm plot registered: Code=${newPlot.plot_code}, Crop=${newPlot.current_crop}`);

  // Step 4: Record Harvested Stock in Farmer Inventory
  console.log("\nSTEP 4: Recording Harvest Stock in Farmer Inventory...");
  const { data: farmerRec } = await farmerClient
    .from("farmers")
    .select("id")
    .eq("profile_id", farmerProfileId)
    .single();

  const farmerEntityId = farmerRec.id;

  const testProduce = `Organic Robusta Banana (${Date.now()})`;
  const inventoryQty = 1200;

  const { data: invItem, error: invErr } = await farmerClient
    .from("inventory")
    .insert({
      farmer_id: farmerEntityId,
      produce: testProduce,
      quantity_kg: inventoryQty,
      quality_grade: "A",
      reserved_quantity_kg: 0,
      status: "AVAILABLE",
      available: true,
      quality_score: 94,
      quality_confidence: 96,
      quality_observations: ["Uniform curvature", "No peel bruising", "Grade A commercial export"],
    })
    .select()
    .single();

  if (invErr || !invItem) {
    throw new Error(`Inventory lot creation failed: ${invErr?.message}`);
  }
  console.log(`   ✓ Inventory lot recorded: ID=${invItem.id}, Produce=${invItem.produce}, Qty=${invItem.quantity_kg}kg, Grade=${invItem.quality_grade}`);

  // Step 5: Publish Produce Listing to Live Marketplace
  console.log("\nSTEP 5: Publishing Produce Listing to Live Marketplace...");
  const listingQty = 800; // Must be <= available inventory (1200kg)
  const askingPrice = 32;

  const { data: listing, error: listErr } = await farmerClient
    .from("produce_listings")
    .insert({
      farmer_id: farmerProfileId,
      crop_name: testProduce,
      variety: "Robusta G9",
      category: "standard",
      quantity_kg: listingQty,
      quality_grade: "A",
      asking_price_per_kg: askingPrice,
      harvest_date: new Date().toISOString().split("T")[0],
      pickup_location: "Kunigal Farm Gate Bay 2",
      district: "Tumakuru",
      state: "Karnataka",
      status: "ACTIVE",
      is_verified_lot: true,
    })
    .select()
    .single();

  if (listErr || !listing) {
    throw new Error(`Produce listing publication failed: ${listErr?.message}`);
  }
  console.log(`   ✓ Produce listing published: ID=${listing.id}, Crop=${listing.crop_name}, Qty=${listing.quantity_kg}kg, Rate=₹${listing.asking_price_per_kg}/kg`);

  // Link inventory to listing
  await farmerClient
    .from("inventory")
    .update({ listing_id: listing.id })
    .eq("id", invItem.id);

  // Step 6: Buyer submits purchase offer
  console.log("\nSTEP 6: Buyer submitting purchase offer on farmer's listing...");
  const offeredPrice = 30;
  const { data: offer, error: offerErr } = await buyerClient
    .from("buyer_offers")
    .insert({
      listing_id: listing.id,
      buyer_id: buyerAuth.user.id,
      offered_price_per_kg: offeredPrice,
      offered_quantity_kg: listingQty,
      destination_city: "Bengaluru KR Market Hub",
      payment_terms: "ESCROW",
      status: "PENDING",
    })
    .select()
    .single();

  if (offerErr || !offer) {
    throw new Error(`Buyer offer submission failed: ${offerErr?.message}`);
  }
  console.log(`   ✓ Buyer offer submitted: ID=${offer.id}, Rate=₹${offer.offered_price_per_kg}/kg, Qty=${offer.offered_quantity_kg}kg`);

  // Step 7: Farmer accepts offer via atomic accept_buyer_offer_and_create_order RPC
  console.log("\nSTEP 7: Farmer accepting offer via accept_buyer_offer_and_create_order RPC...");
  const crypto = await import("crypto");
  const idempotencyKey = `farmer-test-accept-${offer.id}`;
  const requestHash = crypto.createHash("sha256").update(JSON.stringify({ offer_id: offer.id, items: [{ inventory_id: invItem.id, quantity: listingQty }] })).digest("hex");

  const { data: rpcResult, error: rpcErr } = await farmerClient.rpc(
    "accept_buyer_offer_and_create_order",
    {
      p_actor_id: farmerProfileId,
      p_offer_id: offer.id,
      p_items: [{ inventory_id: invItem.id, quantity: listingQty }],
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
    }
  );

  if (rpcErr || !rpcResult) {
    throw new Error(`RPC accept_buyer_offer_and_create_order failed: ${rpcErr?.message}`);
  }

  const orderId = rpcResult.order_id || rpcResult.id;
  console.log(`   ✓ Offer accepted & confirmed Order created: OrderID=${orderId}`);

  // Step 8: Verify Inventory Reservation
  console.log("\nSTEP 8: Verifying inventory reservation consistency...");
  const { data: verifiedInv } = await farmerClient
    .from("inventory")
    .select("quantity_kg, reserved_quantity_kg, status")
    .eq("id", invItem.id)
    .single();

  console.log(`   ✓ Inventory state: Total=${verifiedInv?.quantity_kg}kg, Reserved=${verifiedInv?.reserved_quantity_kg}kg, Status=${verifiedInv?.status}`);
  if (Number(verifiedInv?.reserved_quantity_kg) !== listingQty) {
    throw new Error(`Reserved quantity mismatch: expected ${listingQty}, got ${verifiedInv?.reserved_quantity_kg}`);
  }

  // Step 9: Verify Cross-Farmer Data Protection & RLS Authorization
  console.log("\nSTEP 9: Verifying Cross-Farmer Data Protection under RLS...");
  
  // 9a. Unauthorized user attempting to read another farmer's private farms
  const { data: unauthorizedFarms } = await buyerClient
    .from("farms")
    .select("*")
    .eq("id", newFarm.id);
  const isFarmReadBlocked = !unauthorizedFarms || unauthorizedFarms.length === 0;
  console.log(`   - Cross-farmer farm profile read blocked under RLS: ${isFarmReadBlocked}`);

  // 9b. Unauthorized user attempting to update another farmer's farm
  const { data: unauthorizedFarmUpdate, error: farmMutateErr } = await buyerClient
    .from("farms")
    .update({ name: "Hacked Farm Name" })
    .eq("id", newFarm.id)
    .select();
  const isFarmUpdateBlocked = Boolean(farmMutateErr) || !unauthorizedFarmUpdate || unauthorizedFarmUpdate.length === 0;
  console.log(`   - Cross-farmer farm profile mutation blocked under RLS: ${isFarmUpdateBlocked}`);

  // 9c. Unauthorized user attempting to modify another farmer's plots
  const { data: unauthorizedPlotUpdate, error: plotMutateErr } = await buyerClient
    .from("plots")
    .update({ current_crop: "Stolen Crop" })
    .eq("id", newPlot.id)
    .select();
  const isPlotUpdateBlocked = Boolean(plotMutateErr) || !unauthorizedPlotUpdate || unauthorizedPlotUpdate.length === 0;
  console.log(`   - Cross-farmer plot mutation blocked under RLS: ${isPlotUpdateBlocked}`);

  // 9d. Unauthorized user attempting to update another farmer's inventory
  const { data: unauthorizedInvUpdate, error: invMutateErr } = await buyerClient
    .from("inventory")
    .update({ quantity_kg: 0 })
    .eq("id", invItem.id)
    .select();
  const isInvUpdateBlocked = Boolean(invMutateErr) || !unauthorizedInvUpdate || unauthorizedInvUpdate.length === 0;
  console.log(`   - Cross-farmer inventory mutation blocked under RLS: ${isInvUpdateBlocked}`);

  const allIsolationChecksPassed = isFarmReadBlocked && isFarmUpdateBlocked && isPlotUpdateBlocked && isInvUpdateBlocked;
  if (!allIsolationChecksPassed) {
    throw new Error("Cross-farmer isolation violation: unauthorized persona accessed or mutated private farm records!");
  }
  console.log("   ✓ All 4 cross-farmer data isolation checks PASSED.");

  // Step 10: Safe Test Cleanup
  console.log("\nSTEP 10: Safe Test Cleanup (closing listing & plots)...");
  await farmerClient
    .from("produce_listings")
    .update({ status: "FULFILLED" })
    .eq("id", listing.id);

  await farmerClient.from("plots").delete().eq("id", newPlot.id);
  await farmerClient.from("farms").delete().eq("id", newFarm.id);
  console.log("   ✓ Temporary test farm profile & plot cleaned up; listing marked fulfilled.");

  console.log("\n=============================================================");
  console.log("   🎉 ALL FARMER PORTAL INTEGRATION TESTS PASSED (10/10)!     ");
  console.log("=============================================================\n");
}

runFarmerPortalTests().catch((err) => {
  console.error("\n❌ Farmer Portal Test Suite Failed:", err);
  process.exit(1);
});
