export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <div className="p-6">
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have permission to access this page. If you believe this is a mistake, please contact the administrator.
        </p>
      </div>
    </div>
  );
}

