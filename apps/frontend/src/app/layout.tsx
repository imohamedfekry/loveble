import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SettingsProvider } from "@/components/settings/settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/* Brand kit mono face. */
const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
        inter.variable,
      )}
    >
      <head>
        <Script
          id="project-page-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.pathname.startsWith('/project/')) {
                document.documentElement.setAttribute('data-project-page', '');
              }
            `,
          }}
        />
      </head>
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
