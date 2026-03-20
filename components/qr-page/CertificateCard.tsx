import { normalizeCertificateUrl } from "@/lib/number-formatting";

type Props = {
  number?: string | null;
  authority?: string | null;
  url?: string | null;
};

export default function CertificateCard({ number, authority, url }: Props) {
  const normalized = url ? normalizeCertificateUrl(url) : null;
  const show = Boolean(number || authority || normalized);
  if (!show) return null;

  return (
    <div className="bg-white rounded-[14px] shadow-sm p-4 space-y-3">
      <h3 className="text-md font-semibold text-gray-900">Certification</h3>

      {number && (
        <div>
          <p className="text-xs text-gray-500">Certificate Number</p>
          <p className="text-sm font-semibold text-gray-900 break-words">{number}</p>
        </div>
      )}

      {authority && (
        <div>
          <p className="text-xs text-gray-500">Authority</p>
          <p className="text-sm font-semibold text-gray-900 break-words">{authority}</p>
        </div>
      )}

      {normalized && (
        <a
          href={normalized}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-black text-white py-2 rounded-lg text-sm font-medium"
        >
          View Certificate
        </a>
      )}
    </div>
  );
}

