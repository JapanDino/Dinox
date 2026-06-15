// Type declarations for the Electron contextBridge API (window.dinox).
// This object is injected only when running inside the desktop Electron shell.
// When running in a browser it is undefined — always guard with `window.dinox?.backup`.

export {};

interface DinoxBackupFile {
  /** Filename, e.g. "dinox.backup-v0.1.0-2026-04-17T12-00-00-manual.db" */
  name: string;
  /** File size in bytes */
  size: number;
  /** ISO-8601 modification timestamp */
  createdAt: string;
}

declare global {
  interface Window {
    dinox?: {
      /** App version string from package.json */
      version: string;
      /** Open the Pomodoro timer popup window */
      openPomodoroPopup: (relativeUrl: string) => void;
      /** Backup management IPC bridge */
      backup: {
        list: () => Promise<DinoxBackupFile[]>;
        create: () => Promise<{ name: string }>;
        restore: (name: string) => Promise<{ ok: boolean }>;
        delete: (name: string) => Promise<{ ok: boolean }>;
        openDir: () => Promise<{ ok: boolean }>;
      };
    };
  }
}
