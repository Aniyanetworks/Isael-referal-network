import type { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      {...props}
    />
  );
}

export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </Base>
  );
}

export function CheckBadgeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </Base>
  );
}

export function CursorClickIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 4v3M4 9h3M6.5 6.5l7 3.5-2.6 1.3L9 14z" />
      <path d="M14 14l3 6 1.4-3 3-1.4z" />
    </Base>
  );
}

export function FingerprintIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 4a6 6 0 0 0-6 6c0 3 1 4.5 1 7" />
      <path d="M12 4a6 6 0 0 1 6 6c0 2 -.3 3.3 -.7 4.5" />
      <path d="M9 10a3 3 0 0 1 6 0c0 4 1 6 2 8" />
      <path d="M9 10c0 5 .5 7 2 9" />
    </Base>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M9 15l6-6" />
      <path d="M10 6.5 11 5.5a3 3 0 0 1 4.2 4.2l-1 1" />
      <path d="M14 17.5 13 18.5a3 3 0 0 1 -4.2-4.2l1-1" />
    </Base>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 20l.9-3.6L16 5.3a1.5 1.5 0 0 1 2.1 0l.6.6a1.5 1.5 0 0 1 0 2.1L7.6 19.1z" />
      <path d="M14.5 6.8l2.7 2.7" />
    </Base>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}

export function PowerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3v7" />
      <path d="M7 6.5a7 7 0 1 0 10 0" />
    </Base>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </Base>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Base>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Base>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Base>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </Base>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.2 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.2-3.4-8.5S9.8 5.8 12 3.5Z" />
    </Base>
  );
}

export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </Base>
  );
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 4.5h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 4.5 6.1 1.5 1.5 0 0 1 6 4.5Z" />
    </Base>
  );
}

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M5 19.5h14" />
    </Base>
  );
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.25" />
    </Base>
  );
}
