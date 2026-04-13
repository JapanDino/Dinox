import type { Metadata } from "next";
import "./globals.css";
import { PomodoroProvider } from "@/src/ui/components/pomodoro-provider";
import { ReminderScheduler } from "@/src/ui/components/reminder-scheduler";

export const metadata: Metadata = {
  title: "Dinox Calendar",
  description: "Local-first calendar MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <PomodoroProvider />
        <ReminderScheduler />
      </body>
    </html>
  );
}
