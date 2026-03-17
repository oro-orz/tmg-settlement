/**
 * POST: 指定した請求書 ID の PDF を ZIP にまとめて返す（一括ダウンロード用）。
 * 要ログイン。ids は最大 100 件まで。
 */
import { NextRequest, NextResponse } from "next/server";
import { Writable } from "node:stream";
import archiver from "archiver";
import { getSessionFromRequest } from "@/lib/session";
import { getServerSupabase } from "@/lib/supabase";
import { getInvoiceDownloadFileNameJapanese } from "@/lib/invoiceFileName";
import type { InvoiceRow } from "@/lib/supabase";

const MAX_IDS = 100;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "ids を指定してください" },
        { status: 400 }
      );
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { success: false, message: `最大 ${MAX_IDS} 件までです` },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();
    const chunks: Buffer[] = [];
    const collector = new Writable({
      write(chunk: Buffer, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
      final(cb) {
        cb();
      },
    });

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(collector);

    const finished = new Promise<void>((resolve, reject) => {
      collector.on("finish", resolve);
      collector.on("error", reject);
      archive.on("error", reject);
    });

    const typeMap = { received: "received" as const, payment: "payment" as const, receipt: "receipt" as const };

    for (const id of ids) {
      const { data: row, error: fetchError } = await supabase
        .from("invoices")
        .select("file_path, file_name, vendor_name, client_name, target_month, type")
        .eq("id", id)
        .single();

      if (fetchError || !row) continue;
      const r = row as Pick<
        InvoiceRow,
        "file_path" | "file_name" | "vendor_name" | "client_name" | "target_month" | "type"
      >;
      if (!r.file_path) continue;

      const { data: signed, error: signError } = await supabase.storage
        .from("invoices")
        .createSignedUrl(r.file_path, 60);

      if (signError || !signed?.signedUrl) continue;

      const res = await fetch(signed.signedUrl);
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const fileName = getInvoiceDownloadFileNameJapanese({
        vendorName: r.vendor_name ?? "",
        clientName: r.client_name ?? undefined,
        targetMonth: r.target_month ?? "",
        type: typeMap[r.type as keyof typeof typeMap] ?? "received",
      });
      archive.append(Buffer.from(arrayBuffer), { name: fileName });
    }

    archive.finalize();
    await finished;

    const zipBuffer = Buffer.concat(chunks);
    const zipFileName = `archive_${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
      },
    });
  } catch (err) {
    console.error("archive-download POST error:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
