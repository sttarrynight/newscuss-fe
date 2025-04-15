import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: "swap",
});

export const metadata = {
    title: "Newscuss - AI와 함께하는 뉴스 토론",
    description: "AI와 토론하고 싶은 뉴스 기사의 URL을 입력해주세요!",
};

export default function RootLayout({ children }) {
    return (
        <html lang="ko" className="scroll-smooth">
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        {children}
        </body>
        </html>
    );
}