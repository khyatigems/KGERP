type Props = {
  email: string;
};

export default function ContactSupport({ email }: Props) {
  return (
    <div className="text-center text-sm text-muted-foreground">
      Need help?{" "}
      <a href={`mailto:${email}`} className="text-primary font-medium">
        Contact Support
      </a>
    </div>
  );
}

