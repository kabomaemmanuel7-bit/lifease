export function MessagesIcon({ className = "h-7 w-7" }: { className?: string; fill?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M10 2.5h9a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-.5v3.5l-4-3.5H10a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3z" opacity=".4" />
      <path d="M5 8.5h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H9.5L6 22v-3.5H5a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z" stroke="white" strokeWidth="1.3" />
      <circle cx="6" cy="13.5" r="1.1" fill="white" />
      <circle cx="9" cy="13.5" r="1.1" fill="white" />
      <circle cx="12" cy="13.5" r="1.1" fill="white" />
    </svg>
  );
}
