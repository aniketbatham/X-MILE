import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

interface AddressPayload {
  id?: string;
  addressType?: "RESIDENTIAL" | "FARM_GATE" | "WAREHOUSE" | "COLLECTION_POINT" | "COMMERCIAL_OFFICE" | "OTHER";
  label?: string;
  isDefault?: boolean;
  recipientName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  villageOrLocality?: string;
  cityOrTown?: string;
  district?: string;
  state?: string;
  pincode?: string;
  coordinates?: { lat: number; lng: number };
  notes?: string;
}

export async function GET(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  try {
    const { data: addresses, error } = await client
      .from("user_addresses")
      .select("*")
      .eq("user_id", session.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({
      success: true,
      addresses: addresses || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load user addresses.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required to add addresses." }, { status: 401 });
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  let body: AddressPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const {
    addressType = "RESIDENTIAL",
    label = "Home",
    isDefault = false,
    recipientName = session.name,
    phone,
    addressLine1,
    addressLine2,
    villageOrLocality,
    cityOrTown,
    district,
    state,
    pincode,
    coordinates,
    notes,
  } = body;

  if (!addressLine1 || !cityOrTown || !district || !state || !pincode) {
    return Response.json(
      { error: "Address line 1, city/town, district, state, and pincode are required." },
      { status: 400 }
    );
  }

  try {
    // If setting as default, clear any existing default for this user
    if (isDefault) {
      await client
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", session.userId);
    }

    const newAddress = {
      user_id: session.userId,
      address_type: addressType,
      label,
      is_default: isDefault,
      recipient_name: recipientName,
      phone,
      address_line1: addressLine1,
      address_line2: addressLine2 || null,
      village_or_locality: villageOrLocality || null,
      city_or_town: cityOrTown,
      district,
      state,
      pincode,
      coordinates: coordinates || null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from("user_addresses")
      .insert(newAddress)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      address: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save address.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required to update addresses." }, { status: 401 });
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  let body: AddressPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!body.id) {
    return Response.json({ error: "Address ID is required." }, { status: 400 });
  }

  try {
    if (body.isDefault) {
      // Clear all other defaults for this user
      await client
        .from("user_addresses")
        .update({ is_default: false })
        .eq("user_id", session.userId);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.addressType !== undefined) updates.address_type = body.addressType;
    if (body.label !== undefined) updates.label = body.label;
    if (body.isDefault !== undefined) updates.is_default = body.isDefault;
    if (body.recipientName !== undefined) updates.recipient_name = body.recipientName;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.addressLine1 !== undefined) updates.address_line1 = body.addressLine1;
    if (body.addressLine2 !== undefined) updates.address_line2 = body.addressLine2;
    if (body.villageOrLocality !== undefined) updates.village_or_locality = body.villageOrLocality;
    if (body.cityOrTown !== undefined) updates.city_or_town = body.cityOrTown;
    if (body.district !== undefined) updates.district = body.district;
    if (body.state !== undefined) updates.state = body.state;
    if (body.pincode !== undefined) updates.pincode = body.pincode;
    if (body.coordinates !== undefined) updates.coordinates = body.coordinates;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await client
      .from("user_addresses")
      .update(updates)
      .eq("id", body.id)
      .eq("user_id", session.userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    return Response.json({
      success: true,
      address: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update address.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await verifyServerSession(request);
  if (!session.isAuthenticated || !session.userId) {
    return Response.json({ error: "Authentication required to delete addresses." }, { status: 401 });
  }

  const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Address ID is required." }, { status: 400 });
  }

  try {
    const { error } = await client
      .from("user_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", session.userId);

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Address deleted successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete address.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
