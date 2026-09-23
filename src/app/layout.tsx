import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "UT Parking & Transportation Services",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-[#BF5700] text-white px-6 py-4">
          {/* #BF5700 is UT Austin's burnt orange */}
          <h1 className="text-lg font-semibold">Parking and Transportation Services</h1>
        </header>
        <main className="max-w-md mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
