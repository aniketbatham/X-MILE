import { NextRequest } from "next/server";
import { verifyServerSession, getAuthenticatedClient } from "@/lib/server-auth";
import { supabase as anonClient } from "@/lib/supabase";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json({ error: "Authentication required to upload listing photos." }, { status: 401 });
    }

    if ((session.role !== "FARMER" || !session.isVerified) && !session.isAdmin) {
      return Response.json({ error: "Only verified farmers or administrators can upload listing photos." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return Response.json({
        error: `Invalid file type '${file.type}'. Allowed types: JPG, PNG, WEBP.`,
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json({
        error: `File size exceeds 10MB limit (size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      }, { status: 400 });
    }

    const client = session.token ? getAuthenticatedClient(session.token) : anonClient;

    // Secure bucket path: userId/timestamp-filename
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${session.userId}/${Date.now()}-${cleanName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await client.storage
      .from("marketplace-listings")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return Response.json({
        success: false,
        error: `Storage upload failed: ${uploadError.message}`,
      }, { status: 500 });
    }

    const { data: publicUrlData } = client.storage
      .from("marketplace-listings")
      .getPublicUrl(uploadData.path);

    return Response.json({
      success: true,
      message: "Photo uploaded to marketplace storage successfully.",
      url: publicUrlData.publicUrl,
      path: uploadData.path,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload image.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
