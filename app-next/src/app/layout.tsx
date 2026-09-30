import { ThemeProvider } from "@/components/shell/theme-provider";
import { ToastProvider } from "@/components/shell/toast-provider";
import { LoginProvider, LoginModal } from "@/components/shell/login-modal";
import Topbar from "@/components/shell/topbar";
import SidebarNav from "@/components/shell/sidebar-nav";
import SettingsModal from "@/components/shell/settings-modal";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nhai HSK — Học tiếng Trung",
  description: "Học tiếng Trung theo lộ trình HSK",
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
              <div data-ai-slot />
            </LoginProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
