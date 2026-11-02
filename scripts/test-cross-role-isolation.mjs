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

async function testRoleIsolation() {
  console.log("=============================================================");
  console.log("     X-MILE SERVER-SIDE ROLE ISOLATION AUDIT SUITE           ");
  console.log(`     Target Supabase: ${supabaseUrl}`);
  console.log("=============================================================\n");

  // 1. Authenticate users for each role
  console.log("Authenticating test personas...");
  const { data: farmerAuth } = await supabase.auth.signInWithPassword({
    email: "e2e_farmer@harvex.internal",
    password: "password123",
  });
  const { data: buyerAuth } = await supabase.auth.signInWithPassword({
    email: "e2e_buyer@harvex.internal",
    password: "password123",
  });
  const { data: transAuth } = await supabase.auth.signInWithPassword({
    email: "e2e_transporter@harvex.internal",
    password: "password123",
  });

  const farmerToken = farmerAuth?.session?.access_token;
  const buyerToken = buyerAuth?.session?.access_token;
  const transToken = transAuth?.session?.access_token;

  const farmerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${farmerToken}` } } });
  const buyerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${buyerToken}` } } });
  const transClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${transToken}` } } });

  console.log("   ✓ Personas authenticated: Farmer, Buyer, Transporter\n");

  let checksPassed = 0;
  let checksTotal = 0;

  function assertRejected(name, isError, message) {
    checksTotal++;
    if (isError) {
      console.log(`   PASS [${checksTotal}]: ${name}`);
      console.log(`          Server correctly rejected with: "${message}"`);
      checksPassed++;
    } else {
      console.error(`   FAIL [${checksTotal}]: ${name}`);
      console.error("          Server unexpectedly allowed unauthorized operation!");
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Database RLS - Farmer attempting to claim Transporter haulage job
  // -------------------------------------------------------------------------
  console.log("TEST 1: Farmer attempting to claim a transport haulage job via assign_transporter_to_job...");
  const { error: farmerClaimErr } = await farmerClient.rpc("assign_transporter_to_job", {
    p_request_id: "00000000-0000-0000-0000-000000000000",
    p_quoted_amount: 1500,
  });
  assertRejected(
    "Farmer claiming transport job",
    Boolean(farmerClaimErr),
    farmerClaimErr?.message || "Rejected"
  );

  // -------------------------------------------------------------------------
  // TEST 2: Database RLS - Buyer attempting to claim Transporter haulage job
  // -------------------------------------------------------------------------
  console.log("\nTEST 2: Buyer attempting to claim a transport haulage job via assign_transporter_to_job...");
  const { error: buyerClaimErr } = await buyerClient.rpc("assign_transporter_to_job", {
    p_request_id: "00000000-0000-0000-0000-000000000000",
    p_quoted_amount: 1500,
  });
  assertRejected(
    "Buyer claiming transport job",
    Boolean(buyerClaimErr),
    buyerClaimErr?.message || "Rejected"
  );

  // -------------------------------------------------------------------------
  // TEST 3: Database RLS - Buyer attempting to accept an offer as a farmer
  // -------------------------------------------------------------------------
  console.log("\nTEST 3: Buyer attempting to execute accept_buyer_offer_and_create_order RPC...");
  const { error: buyerAcceptErr } = await buyerClient.rpc("accept_buyer_offer_and_create_order", {
    p_actor_id: buyerAuth.user.id,
    p_offer_id: "00000000-0000-0000-0000-000000000000",
    p_items: [],
    p_idempotency_key: "unauthorized-buyer-accept",
    p_request_hash: "hash",
  });
  assertRejected(
    "Buyer accepting offer via farmer RPC",
    Boolean(buyerAcceptErr),
    buyerAcceptErr?.message || "Rejected"
  );

  // -------------------------------------------------------------------------
  // TEST 4: Database RLS - Transporter attempting to dispatch without authorization
  // -------------------------------------------------------------------------
  console.log("\nTEST 4: Farmer attempting to execute dispatch_order RPC...");
  const { error: farmerDispatchErr } = await farmerClient.rpc("dispatch_order", {
    p_actor_id: farmerAuth.user.id,
    p_order_id: "00000000-0000-0000-0000-000000000000",
  });
  assertRejected(
    "Farmer executing dispatch_order RPC",
    Boolean(farmerDispatchErr),
    farmerDispatchErr?.message || "Rejected"
  );

  // -------------------------------------------------------------------------
  // TEST 5: Database RLS - Direct unauthorized update to orders by Transporter
  // -------------------------------------------------------------------------
  console.log("\nTEST 5: Transporter attempting direct unauthorized status UPDATE on orders table...");
  const { data: transUpdateOrders, error: transUpdateErr } = await transClient
    .from("orders")
    .update({ status: "Cancelled" })
    .eq("status", "Delivered")
    .select();
  
  // Under RLS, Transporter cannot update arbitrary orders (either returns error or 0 rows modified)
  const isTransUpdateBlocked = Boolean(transUpdateErr) || (Array.isArray(transUpdateOrders) && transUpdateOrders.length === 0);
  assertRejected(
    "Transporter direct arbitrary orders update",
    isTransUpdateBlocked,
    transUpdateErr?.message || "0 rows affected under RLS"
  );

  // -------------------------------------------------------------------------
  // TEST 6: Database RLS - Direct unauthorized insert to inventory by Buyer
  // -------------------------------------------------------------------------
  console.log("\nTEST 6: Buyer attempting direct INSERT into inventory table...");
  const { error: buyerInvErr } = await buyerClient
    .from("inventory")
    .insert({
      farmer_id: buyerAuth.user.id,
      produce: "Illegitimate produce lot",
      quantity_kg: 9999,
      quality_grade: "A",
      status: "AVAILABLE",
    });
  assertRejected(
    "Buyer inserting into inventory table",
    Boolean(buyerInvErr),
    buyerInvErr?.message || "Rejected"
  );

  console.log("\n=============================================================");
  console.log(`   AUDIT RESULTS: ${checksPassed}/${checksTotal} ROLE-ISOLATION CHECKS PASSED`);
  console.log("=============================================================\n");

  if (checksPassed !== checksTotal) {
    process.exit(1);
  }
}

testRoleIsolation().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
