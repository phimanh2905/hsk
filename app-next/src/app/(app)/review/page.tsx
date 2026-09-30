import type { Metadata } from "next";
import ReviewDashboard from "./review-dashboard";

export const metadata: Metadata = {
  title: "Ôn tập ngắt quãng",
  description: "Thống kê học tập — theo dõi tiến độ và kế hoạch ôn tập ngắt quãng của bạn.",
};

export default function ReviewPage() {
  return <ReviewDashboard />;
}
