import Image from "next/image";

type Props = {
  imageUrl: string;
  alt: string;
};

export default function ProductImage({ imageUrl, alt }: Props) {
  return (
    <div className="bg-white rounded-[14px] shadow-sm p-2">
      <div className="overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={alt}
          width={900}
          height={900}
          className="w-full h-[220px] object-cover"
          unoptimized
        />
      </div>
    </div>
  );
}

