import "./globals.css";
import { ThemeProvider } from "@/provider/theme";
import { Toaster } from "@/components/ui/sonner"
import { LocaleProvider } from "@/provider/locale";
import { QueryProvider } from "@/provider/query";
import { ServiceWorkerRegister } from "@/components/sw";
import { TooltipProvider } from "@/components/animate-ui/components/animate/tooltip";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="application-name" content="FileChat" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="FileChat" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black" />
        <meta name="mobile-web-app-title" content="FileChat" />
        <link rel="manifest" href="./manifest.json" />
        <link rel="icon" href="./favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="./apple-icon.png" />
        <title>FileChat</title>
      </head>
      <body className="antialiased">
        <ServiceWorkerRegister />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <LocaleProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </LocaleProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}