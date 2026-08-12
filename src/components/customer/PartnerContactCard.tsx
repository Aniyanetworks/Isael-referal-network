import { GlobeIcon, MapPinIcon, PhoneIcon } from "../ui/icons";
import { SaveToPhoneButton } from "../ui/SaveToPhoneButton";
import type { Partner } from "../../types";

export function PartnerContactCard({
  partner,
  categoryName,
}: {
  partner: Partner;
  categoryName?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-brand-primary/5 sm:p-8">
      <div className="flex items-start gap-4">
        <img
          src={partner.logo_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 object-cover"
        />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-slate-900">{partner.company_name}</h3>
          {categoryName && (
            <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
              {categoryName}
            </span>
          )}
        </div>
      </div>

      {partner.description && <p className="mt-4 text-zinc-600">{partner.description}</p>}

      <div className="mt-5 space-y-2 text-sm text-zinc-600">
        {partner.phone && (
          <p className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            {partner.phone}
          </p>
        )}
        {partner.address && (
          <p className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            {partner.address}
          </p>
        )}
        {partner.website && (
          <p className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4 shrink-0 text-brand-primary" />
            <span className="truncate">{partner.website}</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {partner.phone && (
          <a
            href={`tel:${partner.phone}`}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
          >
            Call Now
          </a>
        )}
        {partner.website && (
          <a
            href={partner.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Visit Website
          </a>
        )}
        {partner.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Get Directions
          </a>
        )}
        <SaveToPhoneButton partner={partner} />
      </div>
    </div>
  );
}
