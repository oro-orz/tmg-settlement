import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

/** POST: 一括アップロード（担当者名は FormData で1件共通） */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const submitterName = formData.get("submitterName");
    const email = formData.get("email");
    const files = formData.getAll("files") as File[];

    const nameStr =
      submitterName != null && typeof submitterName === "string"
        ? String(submitterName).trim()
        : "";
    if (!nameStr) {
      return NextResponse.json(
        { success: false, message: "担当者名は必須です" },
        { status: 400 }
      );
    }

    const emailStr =
      email != null && typeof email === "string" && String(email).trim() !== ""
        ? String(email).trim()
        : "";

    const validFiles = files.filter(
      (f): f is File => f instanceof File && f.type === "application/pdf"
    );
    if (validFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: "PDFファイルを1件以上選択してください" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const results: { id: string; fileName: string }[] = [];

    for (const file of validFiles) {
      const id = crypto.randomUUID();
      const filePath = `tmp/${id}.pdf`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error("invoices bulk storage upload error:", uploadError);
        return NextResponse.json(
          { success: false, message: "PDFのアップロードに失敗しました" },
          { status: 500 }
        );
      }

      const { error: insertError } = await supabase.from("invoices").insert({
        id,
        submitter_name: nameStr,
        vendor_name: "",
        target_month: "",
        email: emailStr,
        file_path: filePath,
        file_name: file.name,
        type: "received",
        status: "pending",
      });

      if (insertError) {
        await supabase.storage.from("invoices").remove([filePath]);
        console.error("invoices bulk insert error:", insertError);
        return NextResponse.json(
          { success: false, message: insertError.message ?? "登録に失敗しました" },
          { status: 500 }
        );
      }

      results.push({ id, fileName: file.name });
    }

    return NextResponse.json({ success: true, data: { results } });
  } catch (err) {
    console.error("invoices bulk POST error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
