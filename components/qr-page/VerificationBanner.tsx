type Props = {
  sku?: string | null;
  packedOn?: string | null;
};

export default function VerificationBanner({ sku, packedOn }: Props) {
  return (
    <div className="bg-[#ECFDF5] border border-green-200 rounded-[10px] p-3">
      <p className="text-sm font-semibold text-green-800">✔️ Product Verified by Khyati Gems</p>
      <p className="text-xs text-green-600">This item is securely recorded in our system</p>
      {(sku || packedOn) && (
        <div className="mt-2 text-[11px] text-green-700 flex flex-wrap gap-x-3 gap-y-1">
          {sku && <span><span className="text-green-700/70">SKU:</span> <span className="font-medium">{sku}</span></span>}
          {packedOn && <span><span className="text-green-700/70">Packed:</span> <span className="font-medium">{packedOn}</span></span>}
        </div>
      )}
    </div>
  );
}

