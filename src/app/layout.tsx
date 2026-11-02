import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CookieConsentProvider } from "@/components/cookies/cookie-consent-banner";
import { CurrencyProvider } from "@/lib/currency";


export const metadata: Metadata = {
  title: "Kaizen Admin",
  description: "Kaizen Admins - A comprehensive Kaizen Admin management application",
  icons: {
    icon: [
      { url: '/icon1.png', sizes: 'any' },
      { url: '/icon0.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: 'Kaizen',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-white">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="preload"
          href="/kaizen-logo.svg"
          as="image"
          type="image/svg+xml"
          fetchPriority="high"
        />
      </head>
      <body
        className={`font-sans antialiased bg-white`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
          </ReactQueryProvider>
          <Toaster position="top-center" />
          <CookieConsentProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
