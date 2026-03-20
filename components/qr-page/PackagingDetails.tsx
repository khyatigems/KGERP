type Props = {
  packedOn: string;
  mrp?: string | null;
};

export default function PackagingDetails({ packedOn, mrp }: Props) {
  return (
    <div className="bg-white rounded-[14px] shadow-sm p-4 text-sm space-y-1">
      <p>
        <span className="text-gray-500">Packed On:</span> <span className="font-medium text-gray-900">{packedOn}</span>
      </p>
      {mrp && (
        <p>
          <span className="text-gray-500">MRP:</span> <span className="font-medium text-gray-900">{mrp}</span>
        </p>
      )}
      <p>
        <span className="text-gray-500">Country:</span> <span className="font-medium text-gray-900">India</span>
      </p>
    </div>
  );
}

