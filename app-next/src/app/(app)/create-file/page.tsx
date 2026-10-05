import type { Metadata } from "next";
import CatalogGrid from "@/components/create-file/catalog-grid";

export const metadata: Metadata = { title: "Tạo file | Bye HSK", description: "生成练习本 — Tạo bản in luyện viết chữ Hán theo thứ tự nét" };

export default function CreateFilePage() {
  return <main><CatalogGrid /></main>;
}
