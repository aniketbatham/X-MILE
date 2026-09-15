import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("farmers")
    .select("*")
    .limit(5);

  if (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    farmers: data,
  });
}