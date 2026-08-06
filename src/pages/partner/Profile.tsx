import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GlobeIcon, MailIcon, MapPinIcon, PhoneIcon, UserIcon } from "../../components/ui/icons";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuth";
import { getCategoryById } from "../../services/categories.service";
import { getPartnerById } from "../../services/partners.service";

export default function PartnerProfile() {
  const { profile } = useAuth();
  const partnerId = profile?.partner_id ?? "";

  const partnerQuery = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => getPartnerById(partnerId),
    enabled: Boolean(partnerId),
  });

  const categoryQuery = useQuery({
    queryKey: ["category", partnerQuery.data?.category_id],
    queryFn: () => getCategoryById(partnerQuery.data!.category_id),
    enabled: Boolean(partnerQuery.data?.category_id),
  });

  if (partnerQuery.isLoading) return <LoadingSpinner label="Loading your profile..." />;
  if (partnerQuery.isError) return <ErrorState onRetry={() => void partnerQuery.refetch()} />;
  if (!partnerQuery.data) {
    return <EmptyState title="Profile not available" description="Your account isn't linked to a business yet." />;
  }

  const partner = partnerQuery.data;
  const social = partner.social_links ?? {};
  const hasSocial = Boolean(social.facebook || social.instagram || social.linkedin);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Your Profile</h1>
      <p className="mt-1 text-sm text-zinc-500">
        This is what customers and other partners see about your business. Contact an admin to
        update any of this.
      </p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={partner.logo_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-zinc-200 object-cover"
          />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{partner.company_name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {categoryQuery.data && (
                <span className="rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-medium text-brand-primary">
                  {categoryQuery.data.name}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  partner.status === "active"
                    ? "bg-brand-accent/20 text-green-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    partner.status === "active" ? "bg-green-600" : "bg-zinc-400"
                  }`}
                />
                {partner.status}
              </span>
            </div>
          </div>
        </div>

        {partner.description && <p className="mt-4 text-sm text-zinc-600">{partner.description}</p>}

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField icon={<UserIcon className="h-4 w-4" />} label="Contact" value={partner.partner_name} />
          <ProfileField icon={<MailIcon className="h-4 w-4" />} label="Email" value={partner.email} />
          <ProfileField icon={<PhoneIcon className="h-4 w-4" />} label="Phone" value={partner.phone} />
          <ProfileField icon={<MapPinIcon className="h-4 w-4" />} label="Address" value={partner.address} />
          {partner.website && (
            <ProfileField
              icon={<GlobeIcon className="h-4 w-4" />}
              label="Website"
              value={
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  {partner.website}
                </a>
              }
            />
          )}
        </dl>

        {hasSocial && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
            {social.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                Facebook
              </a>
            )}
            {social.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                Instagram
              </a>
            )}
            {social.linkedin && (
              <a
                href={social.linkedin}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-brand-primary hover:underline"
              >
                LinkedIn
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-zinc-400">{label}</dt>
        <dd className="truncate text-sm text-slate-900">{value}</dd>
      </div>
    </div>
  );
}
