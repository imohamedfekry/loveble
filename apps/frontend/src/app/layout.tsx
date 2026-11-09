import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@loveble/utils";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@loveble/ui/sonner";

/*
 * Self-hosted on purpose. `next/font/google` downloads the CSS and the font
 * files while the app builds, and Google intermittently answers with
 * extensionless `fonts.gstatic.com/l/font?kit=…&skey=…` URLs. Turbopack splits
 * those on `&`, so the build dies with "next/font/google queries have exactly
 * one entry" (vercel/next.js#99114) with no code change. The same latin subsets
 * live in ./fonts, so builds are deterministic and need no network.
 */
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

/* Brand kit mono face. */
const robotoMono = localFont({
  src: [
    { path: "./fonts/roboto-mono-400-latin.woff2", weight: "400" },
    { path: "./fonts/roboto-mono-500-latin.woff2", weight: "500" },
  ],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Loveble",
  description: "loveble is an AI-powered platform that helps you build, test, and deploy applications faster than ever. With loveble, you can leverage the power of AI to automate your development workflow and focus on what matters most - building great software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        robotoMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider>{children}</SettingsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
