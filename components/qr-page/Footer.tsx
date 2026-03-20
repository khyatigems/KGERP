type Props = {
  website?: string | null;
};

export default function Footer({ website }: Props) {
  return (
    <div className="text-center text-xs text-gray-400 pt-4">
      <p>{website || "khyatigems.com"}</p>
      <p>Original Product</p>
    </div>
  );
}

