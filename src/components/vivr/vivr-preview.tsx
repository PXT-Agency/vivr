import { Smartphone } from "lucide-react";

import type { VivrConfig } from "@/types/vivr";
import { VivrPublicPage } from "./blocks-public";

/**
 * Mobile-first preview rail used by the builder. Renders the current draft
 * through {@link VivrPublicPage} — the same renderer the public runtime will
 * use in Phase 7 — so preview always equals public rendering (docs/04 Step 5).
 */
export function VivrPreview({ config }: { config: VivrConfig }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Smartphone aria-hidden="true" className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-sm">
          Mobile preview — same renderer as the published page.
        </p>
      </div>
      <div className="bg-muted/60 mx-auto w-full max-w-80 rounded-[2rem] border-8 border-background p-0 shadow-md ring-1 ring-black/5">
        <div className="bg-muted/40 h-8" />
        <VivrPublicPage config={config} />
      </div>
    </div>
  );
}