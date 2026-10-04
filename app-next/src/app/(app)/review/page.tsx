import type { Metadata } from "next";
import ReviewDashboard from "./review-dashboard";

export const metadata: Metadata = {
  title: "Ôn tập ngắt quãng",
  description:
    "Ôn tập SRS — xem độ bền trí nhớ theo nhóm Leitner, tra từ vựng và luyện viết chữ Hán trong một phiên ôn tập.",
};

export default function ReviewPage() {
  return <ReviewDashboard />;
}
