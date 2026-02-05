"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExternalLink, faMagnifyingGlassPlus } from "@fortawesome/free-solid-svg-icons";

interface ReceiptViewerProps {
  receiptUrl: string;
  creditUrl?: string;
}

/** Google Drive URL から fileId を取得（/file/d/ID または ?id=ID 形式に対応） */
function getDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const u = url.trim();
  // https://drive.google.com/file/d/FILE_ID/view...
  const m1 = u.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
  if (m1) return m1[1];
  // https://drive.google.com/open?id=FILE_ID
  const m2 = u.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (m2) return m2[1];
  return null;
}

function getImageSrc(url: string): string {
  const fileId = getDriveFileId(url);
  if (fileId) return `/api/image?fileId=${encodeURIComponent(fileId)}`;
  return url;
}

type LoadErrorType = "pdf" | "error";

export function ReceiptViewer({ receiptUrl, creditUrl }: ReceiptViewerProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [receiptError, setReceiptError] = useState<LoadErrorType | null>(null);
  const [creditError, setCreditError] = useState<LoadErrorType | null>(null);
  const [receiptPdfUrl, setReceiptPdfUrl] = useState<string | null>(null);
  const [creditPdfUrl, setCreditPdfUrl] = useState<string | null>(null);
  const hasReceiptUrl = !!receiptUrl?.trim();
  const receiptSrc = hasReceiptUrl ? getImageSrc(receiptUrl) : "";
  const creditSrc = creditUrl?.trim() ? getImageSrc(creditUrl) : undefined;
  const hasReceiptProxy = !!getDriveFileId(receiptUrl);

  async function handleLoadError(
    src: string,
    setError: (t: LoadErrorType | null) => void,
    setPdfUrl: (url: string | null) => void
  ) {
    try {
      const res = await fetch(src);
      const ct = res.headers.get("Content-Type") || "";
      if (ct.includes("application/pdf")) {
        setPdfUrl(src);
        setError("pdf");
      } else {
        setError("error");
      }
    } catch {
      setError("error");
    }
  }

  return (
    <Card className="p-4 rounded-xl border-0 shadow-none">
      <h3 className="text-body font-semibold text-foreground mb-3">領収書・明細</h3>
      <Tabs defaultValue="receipt" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="receipt" className="rounded-lg">領収書</TabsTrigger>
          <TabsTrigger value="credit" disabled={!creditUrl} className="rounded-lg">
            クレカ明細
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipt" className="mt-3">
          <div className="relative bg-muted rounded-xl overflow-hidden min-h-[360px]">
            {!hasReceiptUrl ? (
              <div className="flex items-center justify-center min-h-[360px] text-body text-muted-foreground">
                領収書はありません
              </div>
            ) : receiptError === "pdf" && receiptPdfUrl ? (
              <div className="p-6 text-center bg-muted/50 rounded-xl border border-dashed border-border">
                <p className="text-body text-muted-foreground mb-3">
                  PDFは新しいタブで開いて確認してください。
                </p>
                <Button asChild className="rounded-xl">
                  <a
                    href={receiptPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                    PDFを開く
                  </a>
                </Button>
              </div>
            ) : receiptError === "error" && hasReceiptProxy ? (
              <div className="p-6 text-center text-muted-foreground">
                <p className="mb-2 text-body">画像を読み込めませんでした</p>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                    Driveで開く
                  </a>
                </Button>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- proxy URL, next/image not used
              <img
                src={receiptSrc}
                alt="領収書"
                className={`w-full h-auto cursor-zoom-in transition-transform ${
                  isZoomed ? "scale-150" : "scale-100"
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
                onError={() => {
                  handleLoadError(receiptSrc, setReceiptError, setReceiptPdfUrl);
                }}
              />
            )}
            {!isZoomed && (
              <div className="absolute bottom-3 right-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setIsZoomed(true)}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlassPlus} className="h-4 w-4 mr-2" />
                  拡大
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {creditSrc && (
          <TabsContent value="credit" className="mt-3">
            <div className="relative bg-muted rounded-xl overflow-hidden min-h-[360px]">
              {creditError === "pdf" && creditPdfUrl ? (
                <div className="p-6 text-center bg-muted/50 rounded-xl border border-dashed border-border">
                  <p className="text-body text-muted-foreground mb-3">
                    PDFは新しいタブで開いて確認してください。
                  </p>
                  <Button asChild className="rounded-xl">
                    <a
                      href={creditPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                      PDFを開く
                    </a>
                  </Button>
                </div>
              ) : creditError === "error" ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="mb-2 text-body">画像を読み込めませんでした</p>
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <a href={creditUrl} target="_blank" rel="noopener noreferrer">
                      <FontAwesomeIcon icon={faExternalLink} className="h-4 w-4 mr-2" />
                      Driveで開く
                    </a>
                  </Button>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- proxy URL
                <img
                  src={creditSrc}
                  alt="クレカ明細"
                  className="w-full h-auto"
                  onError={() => {
                    if (creditSrc) handleLoadError(creditSrc, setCreditError, setCreditPdfUrl);
                  }}
                />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
