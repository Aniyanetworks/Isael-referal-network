import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { GlobeIcon, MapPinIcon, PhoneIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { getCategoryById } from "../../services/categories.service";
import { getPartnerBySlug } from "../../services/partners.service";

/**
 * Full business profile for a single partner: /business/:partnerSlug.
 * No click is recorded here - attribution already happened at whichever
 * /ref/:partnerSlug link brought the customer in.
 */
export default function PublicPartnerProfile() {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();

  const partnerQuery = useQuery({
    queryKey: ["public-partner", partnerSlug],
    queryFn: () => getPartnerBySlug(partnerSlug ?? ""),
    enabled: Boolean(partnerSlug),
  });

  const categoryQuery = useQuery({
    queryKey: ["category", partnerQuery.data?.category_id],
    queryFn: () => getCategoryById(partnerQuery.data!.category_id),
    enabled: Boolean(partnerQuery.data?.category_id),
  });

  if (partnerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Loading..." />
      </div>
    );
  }

  if (partnerQuery.isError || !partnerQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <EmptyState
          title="We couldn't find that business"
          description="This profile may be out of date. Double-check the link and try again."
        />
      </div>
    );
  }

  const partner = partnerQuery.data;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partner.address)}`;

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-8 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-brand-primary/5 sm:p-8">
          <div className="flex items-start gap-4">
            <img
              src={partner.logo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-gray-200 object-cover"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-gray-900">{partner.company_name}</h1>
              {categoryQuery.data && (
                <span className="mt-1 inline-block rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                  {categoryQuery.data.name}
                </span>
              )}
            </div>
          </div>

          {partner.description && <p className="mt-4 text-gray-600">{partner.description}</p>}

          <div className="mt-5 space-y-2 text-sm text-gray-600">
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
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Visit Website
              </a>
            )}
            {partner.address && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Get Directions
              </a>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
