import "./globals.css";
import Navbar from "@/components/Navbar";
import { UserProvider } from "@/context/UserContext";
import { ToastProvider } from "@/context/ToastContext";

export const viewport = {
  themeColor: "#14131b",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: "Clash of Codes — Competitive Clan Wars for Coders",
  description: "Clash of Clans style competitive programming. Build algorithmic clan defenses, attack opposing bases, earn stars, and climb the global ELO ladder.",
  keywords: ["competitive programming", "clan wars", "code battles", "algorithmic challenges", "online judge"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chivo:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Saira+Condensed:wght@800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-accent)] selection:text-[var(--color-accent-ink)]">
        <UserProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-link">
              Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <footer className="border-t border-[var(--color-rule)] py-8 mt-16 bg-[var(--color-paper-2)]/50">
              <div className="arena-container flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--color-muted)] gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-display uppercase text-sm tracking-tight text-[var(--color-ink)]">
                    Clash of Codes
                  </span>
                  <span>— Algorithmic Clan Warfare</span>
                </div>
                <div className="font-mono">
                  Floor &amp; Arena System Compliant
                </div>
              </div>
            </footer>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
