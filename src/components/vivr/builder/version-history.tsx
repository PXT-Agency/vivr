import { History, RotateCcw } from "lucide-react";

import type { VivrVersionView } from "@/server/dashboard/vivr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/components/dashboard/format";

/**
 * Version history with rollback. Presentational and side-effect-free;
 * `onRollback` is bound by the builder client so this component stays
 * render-testable without a router or server action context.
 */
export function VersionHistory({
  versions,
  canRollback,
  onRollback,
}: {
  versions: VivrVersionView[];
  canRollback: boolean;
  onRollback?: (versionId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <History aria-hidden="true" className="text-muted-foreground size-4" />
        <p className="text-sm font-semibold">Version history</p>
      </div>
      {versions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No versions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-sm font-semibold">v{version.sequence}</span>
                {version.isDraft ? (
                  <Badge variant="secondary">Draft</Badge>
                ) : (
                  <>
                    <Badge variant={version.isCurrent ? "default" : "outline"}>
                      {version.isCurrent ? "Live" : "Published"}
                    </Badge>
                    <span className="text-muted-foreground truncate text-xs">
                      {formatDate(version.publishedAt)}
                    </span>
                  </>
                )}
              </div>
              {!version.isDraft && !version.isCurrent && canRollback && onRollback ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRollback(version.id)}
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" /> Rollback
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}