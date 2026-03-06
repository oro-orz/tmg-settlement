import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { getInvoiceDownloadFileName } from "@/lib/invoiceFileName";
import type { InvoiceRow } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

/** GET: PDF の署名付きURLへ 302 リダイレクト（認証必須）。?download=1 のときは PDF をそのまま返し、日本語ファイル名で保存させる */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 }
      );
    }

    const isDownload = request.nextUrl.searchParams.get("download") === "1";

    const supabase = getServerSupabase();
    const { data: row, error: fetchError } = await supabase
      .from("invoices")
      .select("file_path, file_name, vendor_name, target_month, type")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { success: false, message: fetchError?.message ?? "Not found" },
        { status: fetchError?.code === "PGRST116" ? 404 : 500 }
      );
    }

    const r = row as Pick<
      InvoiceRow,
      "file_path" | "file_name" | "vendor_name" | "target_month" | "type"
    >;
    const filePath = r.file_path;
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

    if (isDownload) {
      const res = await fetch(signed.signedUrl);
      if (!res.ok) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch PDF" },
          { status: 502 }
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      const fileName = getInvoiceDownloadFileName({
        fileName: r.file_name,
        vendorName: r.vendor_name,
        targetMonth: r.target_month,
        type: r.type === "payment" ? "payment" : "received",
      });
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
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
