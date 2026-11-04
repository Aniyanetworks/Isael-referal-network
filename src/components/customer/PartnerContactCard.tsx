import { useEffect, useRef, useState } from "react";
import { GlobeIcon, MapPinIcon, PhoneIcon } from "../ui/icons";
import { SocialLinks } from "./SocialLinks";
import { ServiceRequestModal } from "./ServiceRequestModal";
import { SaveToPhoneButton } from "../ui/SaveToPhoneButton";
import { toExternalUrl } from "../../lib/url";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { recordReferralEvent } from "../../services/referralEvents.service";
import type { ContactClickType, Partner } from "../../types";

interface PartnerContactCardProps {
  partner: Partner;
  categoryName?: string;
  /** Group context the visitor arrived through, if any - stamps every
   * event (profile view, contact clicks, service request) so the group's
   * owner/admin can see their own group's totals. */
  networkId?: string | null;
  /** The business whose link/QR brought the visitor here, if any - stamps
   * every event so that business sees its own referral counts. */
  referrerPartnerId?: string | null;
}

export function PartnerContactCard({
  partner,
  categoryName,
  networkId = null,
  referrerPartnerId = null,
}: PartnerContactCardProps) {
  const [requestOpen, setRequestOpen] = useState(false);
  // Guards against React StrictMode's dev-only double-invoke of effects
  // (mount -> unmount -> mount), which would otherwise fire profile_view
  // twice back to back - fast enough that the server-side dedup window can
  // race and let both through. Keyed by what the event is actually
  // attributed to, so picking a different partner card (or the
  // network/referrer context changing) still records its own view.
  const recordedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${partner.id}|${networkId ?? ""}|${referrerPartnerId ?? ""}`;
    if (recordedKeyRef.current === key) return;
    recordedKeyRef.current = key;
    void track("profile_view");
    // Only ever re-fire if the actual profile shown changes (e.g. picking
    // a different partner card on the same /ref/ page), not on every
    // re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.id, networkId, referrerPartnerId]);

  async function track(
    eventType: "profile_view" | "contact_click",
    contactType?: ContactClickType
  ) {
    const ip = await getClientIp();
    void recordReferralEvent({
      eventType,
      contactType,
      targetPartnerId: partner.id,
      networkId,
      referrerPartnerId,
      visitorId: getVisitorId(),
      device: detectDevice(),
      userAgent: navigator.userAgent,
      ipAddress: ip,
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-brand-primary/5 sm:p-8">
      <div className="flex items-start gap-4">
        <img
          src={partner.logo_url}
          alt=""
          className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 bg-white object-contain"
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

      <SocialLinks
        links={partner.social_links}
        companyName={partner.company_name}
        className="mt-4"
        onLinkClick={(network) => void track("contact_click", network)}
      />

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
            onClick={() => void track("contact_click", "call")}
            className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary"
          >
            Call Now
          </a>
        )}
        {partner.website && (
          <a
            href={toExternalUrl(partner.website) ?? undefined}
            target="_blank"
            rel="noreferrer"
            onClick={() => void track("contact_click", "website")}
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
            onClick={() => void track("contact_click", "directions")}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            Get Directions
          </a>
        )}
        <SaveToPhoneButton partner={partner} onSave={() => void track("contact_click", "save_contact")} />
        <button
          type="button"
          onClick={() => setRequestOpen(true)}
          className="rounded-md border border-brand-primary px-4 py-2 text-sm font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
        >
          Request Service
        </button>
      </div>

      <ServiceRequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        partnerId={partner.id}
        partnerName={partner.company_name}
        networkId={networkId}
        referrerPartnerId={referrerPartnerId}
      />
    </div>
  );
}
