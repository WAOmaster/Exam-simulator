import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-context";
import ThemeWrapper from "@/components/ThemeWrapper";

export const metadata: Metadata = {
  title: "ExamSimulator - AI-Powered Practice Exams",
  description: "Generate custom practice exams from any subject using AI. Upload files, scrape URLs, or search knowledge to create questions with detailed explanations powered by Google Gemini.",
  keywords: "exam simulator, practice exams, AI questions, study tool, certification prep",
  authors: [{ name: "ExamSimulator" }],
  openGraph: {
    title: "ExamSimulator - AI-Powered Practice Exams",
    description: "Generate custom practice exams from any subject using AI",
    type: "website",
    url: "https://examsimulator.appcloudpro.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ThemeWrapper />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
