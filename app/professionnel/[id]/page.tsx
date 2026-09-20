"use client";

import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { WorkerProfileView } from "@/components/WorkerProfileView";

export default function ProfessionnelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-beige-50">
      <div className="mx-auto max-w-md px-5 py-6">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Retour">
            <ChevronLeft className="h-5 w-5 text-ink-900" />
          </button>
        </div>
        <WorkerProfileView workerId={params.id} variant="public" />
      </div>
    </main>
  );
}
