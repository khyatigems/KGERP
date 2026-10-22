import { CreatePackagingWizard } from "./create-wizard";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export default function CreatePackagingPage() {
  return (
    <div className="space-y-6">
      <WorkspaceHeader eyebrow="KhyatiGems · Fulfillment"><h1 className="text-3xl font-bold tracking-tight">Create Packaging Labels</h1></WorkspaceHeader>
      <CreatePackagingWizard />
    </div>
  );
}
