/* /notebook (G-cá nhân) — dashboard Sổ tay & Ghi chép, port opendesign_hsk/notebook.html.
   Server mỏng; toàn tương tác trong NotebookDashboard. Route group (wide) 1280px. */
import type { Metadata } from "next";
import NotebookDashboard from "./notebook-dashboard";

export const metadata: Metadata = { title: "Sổ tay & Ghi chép" };

export default function NotebookPage() {
  return <NotebookDashboard />;
}
