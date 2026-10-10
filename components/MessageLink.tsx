import Link from "next/link";

export default function MessageLink({ userId, label }: { userId: string; label: string }) {
  return (
    <Link
      href={`/messages/avec/${userId}`}
      className="mt-3 block w-full rounded-md border border-wine-200 py-2.5 text-center text-sm font-medium text-wine-700"
    >
      {label}
    </Link>
  );
}
