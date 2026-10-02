import { ThemeProvider } from "@/components/shell/theme-provider";
import { ToastProvider } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal } from "@/components/shell/login-modal";
import Topbar from "@/components/shell/topbar";
import SidebarNav from "@/components/shell/sidebar-nav";
import BottomNav from "@/components/shell/bottom-nav";
import SettingsModal from "@/components/shell/settings-modal";
import AiWidget from "@/components/social/ai-widget";
import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});
const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhaihsk.example"),
  title: { default: "Nhai HSK — Học tiếng Trung mỗi ngày", template: "%s · Nhai HSK" },
  description: "Học từ vựng tiếng Trung theo HSK 3.0 — flashcard, trắc nghiệm, pinyin, bộ thủ.",
  openGraph: { images: ["/assets/vietnam-map.svg"], locale: "vi_VN", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${beVietnamPro.variable} ${notoSansSC.variable}`}>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LoginProvider>
              <Topbar />
              <div className="flex">
                <SidebarNav />
                <main className="flex-1">{children}</main>
              </div>
              <BottomNav />
              <SettingsModal />
              <LoginModal />
              <AiWidget />
            </LoginProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
