import { CreatePackagingWizard } from "./create-wizard";

export default function CreatePackagingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Create Packaging Labels</h1>
      <CreatePackagingWizard />
    </div>
  );
}
