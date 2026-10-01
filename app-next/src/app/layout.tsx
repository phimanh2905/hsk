import { ThemeProvider } from "@/components/shell/theme-provider";
import { ToastProvider } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal } from "@/components/shell/login-modal";
import Topbar from "@/components/shell/topbar";
import SidebarNav from "@/components/shell/sidebar-nav";
import SettingsModal from "@/components/shell/settings-modal";
import AiWidget from "@/components/social/ai-widget";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhaihsk.example"),
  title: { default: "Nhai HSK — Học tiếng Trung mỗi ngày", template: "%s · Nhai HSK" },
  description: "Học từ vựng tiếng Trung theo HSK 3.0 — flashcard, trắc nghiệm, pinyin, bộ thủ.",
  openGraph: { images: ["/assets/vietnam-map.svg"], locale: "vi_VN", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LoginProvider>
              <Topbar />
              <div className="flex">
                <SidebarNav />
                <main className="flex-1">{children}</main>
              </div>
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
