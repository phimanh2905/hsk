"use client";
import { useToast } from "@/components/shell/toast-provider";

export default function XemTatCa() {
  const toast = useToast();
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); toast("Sẽ có sớm"); }}
      className="inline-block mt-1 text-xs font-extrabold tracking-wide text-nhai-main hover:underline"
    >XEM TẤT CẢ →</a>
  );
}
