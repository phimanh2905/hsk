export const metadata = { title: "Chính sách quyền riêng tư | Bye HSK" };

import { Card } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-6 pb-20 lg:pb-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Chính sách quyền riêng tư</h1>
      <p className="text-text-secondary mb-6">Bye HSK tôn trọng quyền riêng tư của bạn. Dưới đây là cách chúng tôi xử lý dữ liệu.</p>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">1. Dữ liệu thu thập</h2>
          <p className="text-[15px] leading-relaxed">Chúng tôi chỉ thu thập những dữ liệu cần thiết: địa chỉ email khi bạn đăng nhập, tiến trình học (bài đã học, từ đã lưu, điểm luyện tập) và các góp ý bạn tự nguyện gửi. Chúng tôi không thu thập dữ liệu nhạy cảm và không bán dữ liệu cho bên thứ ba.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">2. Mục đích sử dụng</h2>
          <p className="text-[15px] leading-relaxed">Dữ liệu được dùng để: lưu và đồng bộ tiến trình học của bạn, cá nhân hoá lộ trình ôn tập, cải thiện chất lượng nội dung và hỗ trợ kỹ thuật khi bạn yêu cầu. Chúng tôi không dùng dữ liệu của bạn để quảng cáo.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">3. Lưu trữ &amp; bảo mật</h2>
          <p className="text-[15px] leading-relaxed">Dữ liệu được lưu trữ an toàn và chỉ những người có thẩm quyền mới được truy cập. Trong bản demo này, tiến trình học của bạn được lưu ngay trên thiết bị (localStorage của trình duyệt), không gửi lên máy chủ.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">4. Quyền của bạn</h2>
          <p className="text-[15px] leading-relaxed">Bạn có quyền xem, chỉnh sửa hoặc yêu cầu xoá toàn bộ dữ liệu cá nhân của mình bất cứ lúc nào. Để xoá vĩnh viễn tài khoản và dữ liệu liên quan, hãy truy cập trang <a href="/delete-account" className="text-action-primary font-semibold">Xoá tài khoản</a>.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">5. Liên hệ</h2>
          <p className="text-[15px] leading-relaxed">Mọi câu hỏi về chính sách quyền riêng tư, vui lòng gửi qua trang <a href="/feedback" className="text-action-primary font-semibold">Góp ý</a> hoặc liên hệ nhóm Bye HSK qua nhóm Facebook chính thức. Chúng tôi thường xuyên phản hồi trong vòng 3–5 ngày làm việc.</p>
        </Card>
      </div>
    </main>
  );
}
