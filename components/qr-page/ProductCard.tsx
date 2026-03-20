type Field = { label: string; value: string };

type Props = {
  name: string;
  fields: Field[];
};

export default function ProductCard({ name, fields }: Props) {
  const visible = fields.filter((f) => f.value);
  return (
    <div className="bg-white rounded-[14px] shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">{name}</h2>
      <div className="grid grid-cols-2 gap-3">
        {visible.map((f) => (
          <div key={f.label}>
            <p className="text-xs text-gray-500">{f.label}</p>
            <p className="text-sm font-semibold text-gray-900">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

