import type { ComponentType, SVGProps } from "react";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "../ui/icons";
import { toExternalUrl } from "../../lib/url";
import type { SocialLinks as SocialLinksData } from "../../types";

const NETWORKS: {
  key: keyof SocialLinksData;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon },
];

export function SocialLinks({
  links,
  companyName,
  className = "",
}: {
  links: SocialLinksData | null | undefined;
  companyName: string;
  className?: string;
}) {
  const items = NETWORKS.flatMap(({ key, label, Icon }) => {
    const href = toExternalUrl(links?.[key]);
    return href ? [{ key, label, Icon, href }] : [];
  });
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {items.map(({ key, label, Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${companyName} on ${label}`}
          title={label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-slate-600 transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
