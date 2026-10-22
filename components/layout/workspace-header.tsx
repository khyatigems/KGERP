import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared page introduction. Children retain the page's actions and permissions. */
export function WorkspaceHeader({
  children,
  className,
  eyebrow = "KhyatiGems · Business workspace",
  ...props
}: ComponentProps<"section"> & { eyebrow?: string }) {
  return (
    <section className={cn("workspace-header", className)} {...props}>
      <p className="workspace-eyebrow"><span aria-hidden="true" />{eyebrow}</p>
      <div className="workspace-header-content">{children}</div>
    </section>
  );
}
