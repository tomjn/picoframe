import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useFrame } from "../context/frame";
import { useNavigationStack } from "../history/navigation-stack";
import { cn } from "../lib/cn";
import { titleCase } from "../routing/crumbs";
import { Slot } from "../slots/slots";

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function TopBar({ title, onToggleSidebar }: { title: string; onToggleSidebar: () => void }) {
  const navigate = useNavigate();
  const { canBack, canForward } = useNavigationStack();
  const { crumbs: crumbMap } = useFrame();
  const { pathname } = useLocation();

  // Build cumulative breadcrumb labels from the path; honor explicit `crumb`
  // labels where set, otherwise title-case the segment.
  const crumbs: string[] = [];
  let acc = "";
  for (const seg of pathname.split("/").filter(Boolean)) {
    acc += `/${seg}`;
    crumbs.push(crumbMap.get(acc) ?? titleCase(seg));
  }
  if (crumbs.length === 0) {
    const root = crumbMap.get("/");
    if (root) crumbs.push(root);
  }

  return (
    <header
      data-tauri-drag-region
      className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-2"
    >
      <IconButton label="Toggle sidebar" onClick={onToggleSidebar}>
        <PanelLeft size={18} />
      </IconButton>
      <IconButton label="Back" disabled={!canBack} onClick={() => navigate(-1)}>
        <ChevronLeft size={18} />
      </IconButton>
      <IconButton label="Forward" disabled={!canForward} onClick={() => navigate(1)}>
        <ChevronRight size={18} />
      </IconButton>

      <div className="ml-1 flex items-center gap-1 text-sm font-medium">
        {crumbs.length > 0 ? (
          crumbs.map((c, i) => (
            <span key={`${c}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <span className={i === crumbs.length - 1 ? "" : "text-muted-foreground"}>{c}</span>
            </span>
          ))
        ) : (
          <span>{title}</span>
        )}
      </div>

      <div className="ml-2 flex items-center gap-1">
        <Slot id="topbar.left" />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Slot id="topbar.right" />
      </div>
    </header>
  );
}
