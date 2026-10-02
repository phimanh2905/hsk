export const metadata = { title: "Điều khoản sử dụng | Nhai HSK" };

import { Card } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-6">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Điều khoản sử dụng</h1>
      <p className="text-text-secondary mb-6">Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng Nhai HSK.</p>

      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">1. Chấp nhận điều khoản</h2>
          <p className="text-[15px] leading-relaxed">Khi truy cập hoặc sử dụng Nhai HSK, bạn đồng ý tuân thủ toàn bộ các điều khoản này. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng ngừng sử dụng website. Chúng tôi có thể cập nhật điều khoản vào bất cứ lúc nào; phiên bản mới nhất luôn được đăng tại trang này.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">2. Nội dung học liệu</h2>
          <p className="text-[15px] leading-relaxed">Toàn bộ bài học, từ vựng, ngữ pháp, âm thanh và công cụ luyện tập trên Nhai HSK chỉ phục vụ mục đích học tập và tham khảo. Chúng tôi nỗ lực đảm bảo nội dung chính xác nhưng không bảo đảm tuyệt đối về mặt chuyên môn. Bạn không được sao chép, bán lại hoặc sử dụng nội dung vào mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">3. Tài khoản</h2>
          <p className="text-[15px] leading-relaxed">Bạn chịu trách nhiệm giữ bí mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình. Không được mượn, cho mượn hoặc chia sẻ tài khoản cho người khác. Chúng tôi có quyền tạm khóa tài khoản vi phạm điều khoản mà không cần báo trước.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">4. Sử dụng hợp lý</h2>
          <p className="text-[15px] leading-relaxed">Bạn cam kết không sử dụng Nhai HSK cho bất kỳ hành vi bất hợp pháp nào, không can thiệp, tải scraping số lượng lớn hoặc làm gián đoạn hoạt động của hệ thống. Việc sử dụng tự động (bot, script) để truy cập nội dung không được cho phép.</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-xl font-extrabold mb-2">5. Thay đổi điều khoản</h2>
          <p className="text-[15px] leading-relaxed">Chúng tôi có thể sửa đổi điều khoản này theo thời gian. Khi có thay đổi quan trọng, chúng tôi sẽ thông báo trên website. Việc bạn tiếp tục sử dụng Nhai HSK sau khi điều khoản được cập nhật đồng nghĩa với việc chấp nhận phiên bản mới. Mọi thắc mắc xin gửi qua trang <a href="/feedback" className="text-action-primary font-semibold">Góp ý</a>.</p>
        </Card>
      </div>
    </main>
  );
}
