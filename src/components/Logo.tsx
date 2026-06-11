export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M4.6 14.1 14.1 4.6c.9-.9 2.1-1.4 3.4-1.4h7.1A2.8 2.8 0 0 1 27.4 6v7.1c0 1.3-.5 2.5-1.4 3.4l-9.5 9.5a3.3 3.3 0 0 1-4.7 0l-7.2-7.2a3.3 3.3 0 0 1 0-4.7Z"
        fill="#dc2626"
      />
      <circle cx="21.4" cy="9.2" r="2.2" fill="#fff" />
      <path
        d="m11.2 21.4 8-8"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12.1" cy="14.3" r="1.7" fill="#fff" />
      <circle cx="18.3" cy="20.5" r="1.7" fill="#fff" />
    </svg>
  );
}
