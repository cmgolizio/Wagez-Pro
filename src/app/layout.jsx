import { Geist } from "next/font/google";

import "./globals.css";

const wagezSans = Geist({
  variable: "--font-wagez-sans",
  subsets: ["latin"],
  display: "swap",
});

const title = "Wagez — Shift & Wage Calculator";
const description =
  "Enter a shift, press Do Math., and see how long you worked and what you made. Everything stays on your device.";

export const metadata = {
  title,
  description,
  applicationName: "Wagez",
  openGraph: {
    title,
    description,
    siteName: "Wagez",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Let the gradient run under notches and the home indicator.
  viewportFit: "cover",
  themeColor: "#00ffd0",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang='en' className={wagezSans.variable}>
      <body className='antialiased'>{children}</body>
    </html>
  );
}
