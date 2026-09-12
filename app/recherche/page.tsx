import { Suspense } from "react";
import { SearchView } from "./search-view";

export default function RecherchePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-5 py-6">
          <p className="text-sm text-ink-600">Chargement…</p>
        </main>
      }
    >
      <SearchView />
    </Suspense>
  );
}
