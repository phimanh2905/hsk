import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fileTemplates, templateById } from "@/content/templates";
import CreateFileClient from "@/components/create-file/create-file-client";

/* Route SSG /create-file/[tpl] (G7) — port renderForm boot của clone create-file.js. */

export function generateStaticParams() {
  return fileTemplates.map((t) => ({ tpl: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ tpl: string }> }): Promise<Metadata> {
  const { tpl } = await params;
  const t = templateById(tpl);
  return { title: (t ? t.name : "Tạo file") + " | Tạo file | Nhai HSK", description: t ? t.desc : "" };
}

export default async function CreateFileTplPage({ params }: { params: Promise<{ tpl: string }> }) {
  const { tpl } = await params;
  const t = templateById(tpl);
  if (!t) notFound();
  return (
    <main>
      <CreateFileClient tplId={t.id} name={t.name} desc={t.desc} group={t.group} />
    </main>
  );
}
