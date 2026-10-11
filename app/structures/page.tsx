"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function StructuresPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.push("/")} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
          <h1 className="text-lg font-medium text-ink-900">Structures privées et publiques</h1>
        </div>
        <p className="text-sm text-ink-600">Cette section sera bientôt disponible.</p>
      </div>
    </main>
  );
}
