import type { Metadata } from "next";
import ProgressClient from "./progress-client";

export const metadata: Metadata = {
  title: "Tiến độ học",
};

export default function ProgressPage() {
  return <ProgressClient />;
}
