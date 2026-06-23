import { Loader2 } from "lucide-react";

/** Layout-agnostic route-loading fallback. Deliberately not a skeleton of any page. */
export function DefaultFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
