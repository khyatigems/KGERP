type Props = {
  email: string;
};

export default function ContactSupport({ email }: Props) {
  return (
    <div className="text-center text-sm text-gray-600">
      Need help?{" "}
      <a href={`mailto:${email}`} className="text-blue-600 font-medium">
        Contact Support
      </a>
    </div>
  );
}

