import { Application, CheckSubmitPayload } from "@/lib/types";

const GAS_URL = process.env.NEXT_PUBLIC_GAS_API_URL;

export class GASApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public gasError?: string
  ) {
    super(message);
    this.name = "GASApiError";
  }
}

async function fetchGAS(params: Record<string, string>): Promise<unknown> {
  if (!GAS_URL) {
    throw new GASApiError("NEXT_PUBLIC_GAS_API_URL is not defined");
  }
  const url = new URL(GAS_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new GASApiError("GAS API request failed", response.status);
  }

  const data = (await response.json()) as {
    success: boolean;
    message?: string;
    data?: Application[];
    base64?: string;
  };

  if (!data.success) {
    throw new GASApiError(
      data.message || "Unknown error",
      undefined,
      data.message
    );
  }

  return data;
}

export async function getApplications(
  targetMonth?: string
): Promise<Application[]> {
  // ブラウザからは同一オリジンの API 経由で呼ぶ（CORS 回避）
  if (typeof window !== "undefined") {
    const q = targetMonth
      ? `?month=${encodeURIComponent(targetMonth)}`
      : "";
    const res = await fetch(`/api/applications${q}`);
    const text = await res.text();
    let data: { success: boolean; message?: string; data?: Application[] };
    try {
      data = JSON.parse(text);
    } catch {
      throw new GASApiError(
        "サーバーからの応答が不正です。しばらくして再読み込みしてください。",
        res.status
      );
    }
    if (!data.success) {
      throw new GASApiError(data.message || "Unknown error", res.status);
    }
    return data.data || [];
  }

  const params: Record<string, string> = {
    action: "api",
    method: "getApplications",
  };
  if (targetMonth) params.month = targetMonth;
  const data = (await fetchGAS(params)) as { data?: Application[] };
  return data.data || [];
}

export async function submitCheck(payload: CheckSubmitPayload): Promise<void> {
  if (typeof window !== "undefined") {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: payload.applicationId,
        action: payload.action,
        checker: payload.checker,
        comment: payload.comment,
      }),
    });
    const text = await res.text();
    let data: { success: boolean; message?: string };
    try {
      data = JSON.parse(text);
    } catch {
      throw new GASApiError(
        "サーバーからの応答が不正です。",
        res.status
      );
    }
    if (!data.success) {
      throw new GASApiError(data.message || "Unknown error", res.status);
    }
    return;
  }

  const params: Record<string, string> = {
    action: "api",
    method: "submitCheck",
    applicationId: payload.applicationId,
    checkAction: payload.action,
    checker: payload.checker,
  };
  if (payload.comment) params.comment = payload.comment;
  await fetchGAS(params);
}

export async function getImage(
  fileId: string
): Promise<{ base64: string; mimeType: string }> {
  const data = (await fetchGAS({
    action: "api",
    method: "getImageBase64",
    fileId,
  })) as { base64?: string; mimeType?: string };
  if (data.base64 == null) {
    throw new GASApiError("No base64 in response");
  }
  return {
    base64: data.base64,
    mimeType: data.mimeType || "image/jpeg",
  };
}
