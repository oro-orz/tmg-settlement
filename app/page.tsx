import { redirect } from "next/navigation";

/** ルートは請求書管理（ダッシュボード）へリダイレクト */
export default function RootPage() {
  redirect("/dashboard");
}
