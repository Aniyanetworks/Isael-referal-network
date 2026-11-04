import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { PartnerContactCard } from "../../components/customer/PartnerContactCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Footer } from "../../components/ui/Footer";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Logo } from "../../components/ui/Logo";
import { getCategoryById } from "../../services/categories.service";
import { getPartnerBySlug } from "../../services/partners.service";

/**
 * Full business profile for a single partner: /business/:partnerSlug. No
 * partner_referral_clicks click is recorded here - that attribution
 * already happened at whichever /ref/:partnerSlug link brought the
 * customer in. PartnerContactCard itself still records a profile_view and
 * any contact_click/service_request made from here, both with no
 * referrer/group attribution (this is a direct/organic visit).
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

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-brand-primary/5 via-white to-white">
      <div className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto mb-8 flex max-w-2xl justify-center">
          <Logo size="md" />
        </div>

        <div className="animate-fade-in-up mx-auto max-w-2xl">
          <PartnerContactCard partner={partner} categoryName={categoryQuery.data?.name} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
