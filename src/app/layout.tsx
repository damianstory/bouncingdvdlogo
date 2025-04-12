import "./globals.css";
import { Inter } from "next/font/google";

// Load the Inter font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <title>DVD Logo Generator</title>
        <meta name="description" content="Create nostalgic bouncing DVD logo animations" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
