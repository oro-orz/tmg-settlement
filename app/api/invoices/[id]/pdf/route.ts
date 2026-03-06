import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

/** GET: PDF の署名付きURLへ 302 リダイレクト（認証必須・middleware で 401） */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const { data: row, error: fetchError } = await supabase
      .from("invoices")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { success: false, message: fetchError?.message ?? "Not found" },
        { status: fetchError?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const filePath = (row as { file_path: string | null }).file_path;
    if (!filePath) {
      return NextResponse.json(
        { success: false, message: "PDF not uploaded" },
        { status: 404 }
      );
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("invoices")
      .createSignedUrl(filePath, 60);

    if (signError || !signed?.signedUrl) {
      console.error("invoices pdf signedUrl error:", signError);
      return NextResponse.json(
        { success: false, message: signError?.message ?? "Failed to generate PDF link" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (err) {
    console.error("invoices [id] pdf GET error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
