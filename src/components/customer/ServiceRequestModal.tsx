import { useState } from "react";
import { Modal } from "../ui/Modal";
import { detectDevice, getClientIp, getVisitorId } from "../../lib/visitor";
import { submitServiceRequest } from "../../services/referralEvents.service";

interface ServiceRequestModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  networkId?: string | null;
  referrerPartnerId?: string | null;
}

export function ServiceRequestModal({
  open,
  onClose,
  partnerId,
  partnerName,
  networkId,
  referrerPartnerId,
}: ServiceRequestModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setError(null);
    setDone(false);
  }

  function handleClose() {
    onClose();
    // Delay so the closing animation (if any) doesn't show the form reset.
    setTimeout(reset, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    setSubmitting(true);
    try {
      const [ip] = await Promise.all([getClientIp()]);
      await submitServiceRequest({
        partnerId,
        networkId,
        referrerPartnerId,
        visitorId: getVisitorId(),
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        message,
        device: detectDevice(),
        userAgent: navigator.userAgent,
        ipAddress: ip,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Request Service - ${partnerName}`}>
      {done ? (
        <div className="py-2">
          <p className="text-sm text-slate-700">
            Your request has been sent to <span className="font-medium">{partnerName}</span>.
            They'll reach out to you soon.
            {email && " We've also emailed you a copy of what you sent."}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-secondary"
          >
            Close
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="sr-name">
              Your name
            </label>
            <input
              id="sr-name"
              className="form-input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="sr-phone">
              Phone
            </label>
            <input
              id="sr-phone"
              type="tel"
              className="form-input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="sr-email">
              Email (optional)
            </label>
            <input
              id="sr-email"
              type="email"
              className="form-input mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="sr-message">
              What do you need help with?
            </label>
            <textarea
              id="sr-message"
              rows={3}
              className="form-input mt-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-secondary disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
