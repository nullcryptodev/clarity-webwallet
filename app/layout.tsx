import { Geist, Geist_Mono, IBM_Plex_Sans, Roboto } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import Session from "@/components/layout/Session";
import { Toaster } from "@/components/ui/toast";

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const ibmPlexSans = IBM_Plex_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", ibmPlexSans.variable, robotoHeading.variable)}
    >
      <body>
        <ThemeProvider>
          <Providers>
            <Session>
              {children}
            </Session>

            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
