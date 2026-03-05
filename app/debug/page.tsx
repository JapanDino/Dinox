import Link from "next/link";
import { LoadDemoButton } from "./load-demo-button";

export default function DebugPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dinox Debug</h1>
        <p className="text-sm text-zinc-700">
          Use this page to quickly load deterministic demo data into the local SQLite database.
        </p>
      </div>

      <LoadDemoButton />

      <Link href="/" className="text-sm text-blue-700 underline">
        Back to app
      </Link>
    </main>
  );
}
