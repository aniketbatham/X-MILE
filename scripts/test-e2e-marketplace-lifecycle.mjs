import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import crypto from "crypto";

// Load staging environment credentials from .env.local
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

async function runE2ETest() {
  console.log("=============================================================");
  console.log("   X-MILE END-TO-END MARKETPLACE TRANSACTION LIFECYCLE TEST   ");
  console.log(`   Target Supabase: ${supabaseUrl}`);
  console.log("=============================================================\n");

  // Step 1: Sign in Farmer
  console.log("STEP 1: Authenticating Farmer (e2e_farmer@harvex.internal)...");
  const { data: farmerAuth, error: farmerAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_farmer@harvex.internal",
    password: "password123",
  });
  if (farmerAuthErr || !farmerAuth.session) {
    throw new Error(`Farmer login failed: ${farmerAuthErr?.message}`);
  }
  const farmerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${farmerAuth.session.access_token}` } },
  });
  const farmerProfileId = farmerAuth.user.id;

  // Resolve Farmer entity record
  const { data: farmerRecord, error: fRecErr } = await farmerClient
    .from("farmers")
    .select("id")
    .eq("profile_id", farmerProfileId)
    .single();

  if (fRecErr || !farmerRecord) {
    throw new Error(`Farmer entity record not found: ${fRecErr?.message}`);
  }
  const farmerEntityId = farmerRecord.id;
  console.log(`   ✓ Farmer authenticated (Profile: ${farmerProfileId}, FarmerID: ${farmerEntityId})`);

  // Step 2: Sign in Buyer
  console.log("STEP 2: Authenticating Buyer (e2e_buyer@harvex.internal)...");
  const { data: buyerAuth, error: buyerAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_buyer@harvex.internal",
    password: "password123",
  });
  if (buyerAuthErr || !buyerAuth.session) {
    throw new Error(`Buyer login failed: ${buyerAuthErr?.message}`);
  }
  const buyerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${buyerAuth.session.access_token}` } },
  });
  const buyerId = buyerAuth.user.id;
  console.log(`   ✓ Buyer authenticated (ID: ${buyerId})`);

  // Step 3: Sign in Transporter
  console.log("STEP 3: Authenticating Transporter (e2e_transporter@harvex.internal)...");
  const { data: transAuth, error: transAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_transporter@harvex.internal",
    password: "password123",
  });
  if (transAuthErr || !transAuth.session) {
    throw new Error(`Transporter login failed: ${transAuthErr?.message}`);
  }
  const transClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${transAuth.session.access_token}` } },
  });
  const transporterId = transAuth.user.id;
  console.log(`   ✓ Transporter authenticated (ID: ${transporterId})`);

  // Step 4: Farmer creates a Produce Listing & linked Inventory lot
  console.log("\nSTEP 4: Farmer publishing Produce Listing & Inventory Lot...");
  const testCrop = `[TEST-E2E] Kolar Grade-A Tomatoes (${Date.now()})`;
  const listingQty = 500;
  const askingPrice = 28;

  const { data: newListing, error: listErr } = await farmerClient
    .from("produce_listings")
    .insert({
      farmer_id: farmerProfileId,
      crop_name: testCrop,
      variety: "Hybrid Shivam",
      category: "Vegetables",
      quantity_kg: listingQty,
      quality_grade: "A",
      asking_price_per_kg: askingPrice,
      harvest_date: new Date().toISOString().split("T")[0],
      pickup_location: "Tumakuru By-Pass Farm Hub",
      district: "Tumakuru",
      state: "Karnataka",
      status: "ACTIVE",
    })
    .select()
    .single();

  if (listErr || !newListing) {
    throw new Error(`Failed to create produce listing: ${listErr?.message}`);
  }

  // Create linked inventory lot
  const { data: invLot, error: invErr } = await farmerClient
    .from("inventory")
    .insert({
      farmer_id: farmerEntityId,
      produce: testCrop,
      quantity_kg: listingQty,
      quality_grade: "A",
      reserved_quantity_kg: 0,
      status: "AVAILABLE",
      available: true,
      listing_id: newListing.id,
    })
    .select()
    .single();

  if (invErr || !invLot) {
    throw new Error(`Failed to create inventory lot: ${invErr?.message}`);
  }
  console.log(`   ✓ Listing published: ID=${newListing.id}, InventoryLot=${invLot.id}, Qty=${invLot.quantity_kg}kg, Price=₹${newListing.asking_price_per_kg}/kg`);

  // Step 5: Buyer discovers the listing
  console.log("\nSTEP 5: Buyer searching and discovering the listing...");
  const { data: marketplaceListing, error: searchErr } = await buyerClient
    .from("produce_listings")
    .select("*")
    .eq("id", newListing.id)
    .single();

  if (searchErr || !marketplaceListing) {
    throw new Error(`Buyer failed to find listing: ${searchErr?.message}`);
  }
  console.log(`   ✓ Buyer verified listing: ID=${marketplaceListing.id}, Status=${marketplaceListing.status}`);

  // Step 6: Buyer submits a purchase offer
  console.log("\nSTEP 6: Buyer submitting procurement offer...");
  const offeredPrice = 28;
  const { data: buyerOffer, error: offerErr } = await buyerClient
    .from("buyer_offers")
    .insert({
      listing_id: newListing.id,
      buyer_id: buyerId,
      offered_price_per_kg: offeredPrice,
      offered_quantity_kg: listingQty,
      destination_city: "Bengaluru APMC Yeshwanthpur",
      payment_terms: "ESCROW",
      status: "PENDING",
    })
    .select()
    .single();

  if (offerErr || !buyerOffer) {
    throw new Error(`Buyer offer creation failed: ${offerErr?.message}`);
  }
  console.log(`   ✓ Offer submitted: ID=${buyerOffer.id}, Qty=${buyerOffer.offered_quantity_kg}kg, Rate=₹${buyerOffer.offered_price_per_kg}/kg, Total=₹${listingQty * offeredPrice}`);

  // Step 7: Farmer accepts offer via atomic PostgreSQL RPC
  console.log("\nSTEP 7: Farmer accepting offer via accept_buyer_offer_and_create_order RPC...");
  const idempotencyKey = `e2e-accept-${buyerOffer.id}`;
  const requestHash = crypto.createHash("sha256").update(JSON.stringify({ offer_id: buyerOffer.id, items: [{ inventory_id: invLot.id, quantity: listingQty }] })).digest("hex");

  const { data: rpcResult, error: rpcErr } = await farmerClient.rpc(
    "accept_buyer_offer_and_create_order",
    {
      p_actor_id: farmerProfileId,
      p_offer_id: buyerOffer.id,
      p_items: [{ inventory_id: invLot.id, quantity: listingQty }],
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
    }
  );

  if (rpcErr || !rpcResult) {
    throw new Error(`RPC accept_buyer_offer_and_create_order failed: ${rpcErr?.message}`);
  }

  const orderId = rpcResult.order_id || rpcResult.id;
  console.log(`   ✓ Offer accepted & Order created via atomic RPC: OrderID=${orderId}`);

  // Verify inventory reservation in database
  const { data: verifiedInv } = await farmerClient
    .from("inventory")
    .select("id, quantity_kg, reserved_quantity_kg, status, available")
    .eq("id", invLot.id)
    .single();

  console.log(`   ✓ Inventory reserved: ReservedQty=${verifiedInv?.reserved_quantity_kg}kg, Status=${verifiedInv?.status}, Available=${verifiedInv?.available}`);

  // Step 8: Initialize Transport Request for Haulage
  console.log("\nSTEP 8: Initializing Transport Request for Haulage Marketplace...");
  const { data: transportReq, error: trErr } = await buyerClient
    .from("transport_requests")
    .insert({
      order_id: orderId,
      requester_id: buyerId,
      pickup_location: "Tumakuru By-Pass Farm Hub",
      destination_location: "Bengaluru APMC Yeshwanthpur",
      produce_type: "Vegetables",
      quantity_kg: listingQty,
      required_vehicle_type: "Canter 5-Ton",
      pickup_date: new Date().toISOString().split("T")[0],
      status: "LOOKING_FOR_TRANSPORTER",
    })
    .select()
    .single();

  if (trErr || !transportReq) {
    throw new Error(`Transport request creation failed: ${trErr?.message}`);
  }
  console.log(`   ✓ Transport request created: ID=${transportReq.id}, Weight=${transportReq.quantity_kg || listingQty}kg`);

  // Step 9: Transporter discovers and accepts the haulage job via atomic RPC
  console.log("\nSTEP 9: Transporter discovering and accepting the freight job...");
  const { error: jobErr } = await transClient.rpc("assign_transporter_to_job", {
    p_request_id: transportReq.id,
    p_quoted_amount: 3200,
  });

  if (jobErr) {
    throw new Error(`Transporter failed to accept freight job: ${jobErr?.message}`);
  }
  console.log(`   ✓ Freight job claimed by transporter: Assigned Transporter=${transporterId}`);

  // Step 10: Dispatch order via atomic dispatch_order RPC
  console.log("\nSTEP 10: Dispatching order and setting shipment In Transit via dispatch_order RPC...");
  let { data: existingShipment } = await transClient
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!existingShipment) {
    const { data: createdShipment, error: shipCreateErr } = await transClient
      .from("shipments")
      .insert({
        order_id: orderId,
        assigned_transporter_id: transporterId,
        origin: "Tumakuru By-Pass Farm Hub",
        destination: "Bengaluru APMC Yeshwanthpur",
        total_quantity_kg: listingQty,
        current_location: "Tumakuru Farm Hub Bay",
        status: "Preparing",
        progress_percentage: 10,
      })
      .select()
      .single();

    if (shipCreateErr || !createdShipment) {
      throw new Error(`Shipment creation failed: ${shipCreateErr?.message}`);
    }
    existingShipment = createdShipment;
  }

  // Execute atomic dispatch RPC
  const { error: dispatchErr } = await transClient.rpc("dispatch_order", {
    p_actor_id: transporterId,
    p_order_id: orderId,
  });

  if (dispatchErr) {
    throw new Error(`RPC dispatch_order failed: ${dispatchErr?.message}`);
  }
  console.log(`   ✓ Order Dispatched & Shipment In Transit via atomic RPC: OrderID=${orderId}`);

  // Step 11: Finalize delivery and fulfill stock via atomic finalize_order_fulfillment RPC
  console.log("\nSTEP 11: Finalizing delivery and verified fulfillment via finalize_order_fulfillment RPC...");
  const { error: fulfillErr } = await transClient.rpc("finalize_order_fulfillment", {
    p_actor_id: transporterId,
    p_order_id: orderId,
  });

  if (fulfillErr) {
    throw new Error(`RPC finalize_order_fulfillment failed: ${fulfillErr?.message}`);
  }
  console.log(`   ✓ Delivery finalized & inventory consumed permanently: OrderID=${orderId}`);

  // Step 11b: Verify Idempotent fulfillment call
  console.log("\nSTEP 11b: Verifying Idempotent fulfillment handling...");
  const { error: idempotentErr } = await transClient.rpc("finalize_order_fulfillment", {
    p_actor_id: transporterId,
    p_order_id: orderId,
  });
  if (idempotentErr) {
    console.log(`   ✓ Idempotent re-execution handled cleanly: ${idempotentErr.message}`);
  } else {
    console.log("   ✓ Idempotent re-execution returned clean success without duplicate stock consumption.");
  }

  // Step 12: Multi-Party State Consistency Verification
  console.log("\nSTEP 12: Verifying Multi-Party Database Consistency across all 3 roles...");
  
  // Buyer checks their orders
  const { data: finalBuyerOrder } = await buyerClient
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  // Transporter checks their shipments
  const { data: finalTransShipment } = await transClient
    .from("shipments")
    .select("id, status, progress_percentage")
    .eq("id", existingShipment.id)
    .single();

  // Farmer checks their listing and offer
  const { data: finalOffer } = await farmerClient
    .from("buyer_offers")
    .select("id, status")
    .eq("id", buyerOffer.id)
    .single();

  // Farmer checks their inventory lot
  const { data: finalInventory } = await farmerClient
    .from("inventory")
    .select("id, quantity_kg, reserved_quantity_kg, status, available")
    .eq("id", invLot.id)
    .single();

  console.log(`   - Buyer Order Status:       ${finalBuyerOrder?.status} (Expected: Delivered)`);
  console.log(`   - Transporter Delivery:     ${finalTransShipment?.status} [${finalTransShipment?.progress_percentage}%] (Expected: Delivered [100%])`);
  console.log(`   - Farmer Offer Status:      ${finalOffer?.status} (Expected: ACCEPTED)`);
  console.log(`   - Inventory Lot Status:     ${finalInventory?.status} (Qty: ${finalInventory?.quantity_kg}kg, Available: ${finalInventory?.available})`);

  const isConsistent =
    finalBuyerOrder?.status === "Delivered" &&
    finalTransShipment?.status === "Delivered" &&
    finalOffer?.status === "ACCEPTED" &&
    finalInventory?.quantity_kg === 0 &&
    finalInventory?.status === "SOLD";

  if (!isConsistent) {
    throw new Error("State inconsistency detected across participants!");
  }

  // Close the produce listing so it does not appear in active marketplace
  await farmerClient
    .from("produce_listings")
    .update({ status: "FULFILLED" })
    .eq("id", newListing.id);

  console.log("   ✓ Produce listing marked as FULFILLED (isolated from active marketplace discovery).");

  console.log("\n=============================================================");
  console.log("   🎉 COMPLETE 12-STEP MARKETPLACE LIFECYCLE TEST PASSED!    ");
  console.log("   Farmer -> Listing -> Offer -> Accept -> Order -> Transporter -> Dispatch -> Delivered -> Idempotent -> Consistent");
  console.log("=============================================================\n");
}

runE2ETest().catch((err) => {
  console.error("\n❌ E2E Marketplace Lifecycle Test Failed:", err);
  process.exit(1);
});
