interface IconProps {
  className?: string;
}

function base(className?: string) {
  return {
    "aria-hidden": true as const,
    focusable: "false" as const,
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

/** Compact logo mark: ball on a pitch arc. Decorative. */
export function BallMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable="false" className={className}>
      <rect x="2" y="5" width="28" height="22" rx="6" fill="currentColor" opacity="0.16" />
      <rect x="2" y="5" width="28" height="22" rx="6" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <line x1="16" y1="5" x2="16" y2="27" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <circle cx="16" cy="16" r="4.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <circle cx="16" cy="16" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppGlyph({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false" className={className} fill="currentColor">
      <path d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5 0 1.68.44 3.32 1.28 4.77L2.5 21.5l4.86-1.24a9.45 9.45 0 0 0 4.64 1.18c5.25 0 9.5-4.25 9.5-9.5s-4.25-9.44-9.5-9.44Zm0 17.13a7.6 7.6 0 0 1-3.88-1.06l-.28-.17-2.88.74.77-2.81-.18-.29a7.6 7.6 0 0 1-1.16-4.04c0-4.2 3.42-7.62 7.63-7.62s7.62 3.42 7.62 7.62-3.43 7.63-7.64 7.63Zm4.18-5.71c-.23-.12-1.36-.67-1.57-.75-.21-.08-.36-.12-.51.11-.15.24-.59.75-.72.9-.13.15-.27.17-.5.06-.23-.12-.97-.36-1.85-1.15-.68-.61-1.14-1.36-1.28-1.6-.13-.23-.01-.36.1-.48.1-.1.23-.27.35-.4.12-.13.15-.23.23-.38.08-.15.04-.29-.02-.4-.06-.12-.51-1.23-.7-1.68-.18-.44-.37-.38-.51-.39h-.44c-.15 0-.4.06-.61.29-.21.23-.8.78-.8 1.9s.82 2.21.94 2.36c.12.15 1.61 2.46 3.9 3.45.55.24.97.38 1.3.48.55.17 1.05.15 1.44.09.44-.07 1.36-.56 1.55-1.09.19-.54.19-1 .13-1.09-.05-.1-.2-.15-.43-.27Z" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 4h4l1.5 4.5L8 10.5a12 12 0 0 0 5.5 5.5l2-2.5L20 15v4a1.5 1.5 0 0 1-1.6 1.5C10.7 20 4 13.3 3.5 5.6A1.5 1.5 0 0 1 5 4Z" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

export function ChevronUpIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m6 14.5 6-6 6 6" />
    </svg>
  );
}

export function ArrowUpIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 19V5m-6 6 6-6 6 6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M13 2.5 4.5 13.5H11L10 21.5l8.5-11H12l1-8Z" />
    </svg>
  );
}
