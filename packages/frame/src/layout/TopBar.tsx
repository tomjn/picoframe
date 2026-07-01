import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useFrame } from "../context/frame";
import { useNavigationStack } from "../history/navigation-stack";
import { cn } from "../lib/cn";
import { decodeSegment, isRoutePath, resolveCrumb, titleCase } from "../routing/crumbs";
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
  const { crumbs: resolvers } = useFrame();
  const { pathname } = useLocation();

  // Build cumulative breadcrumbs from the path; honor static parent labels and
  // per-route `crumb` (string or param-aware function), else title-case. Each
  // crumb carries `to` only when the accumulated path is a real, non-current
  // route, so ancestors you can navigate to become clickable and the rest stay
  // plain text.
  const crumbs: { label: string; to?: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);
  let acc = "";
  segments.forEach((rawSeg, i) => {
    // `pathname` is URL-encoded (spaces -> %20); decode so lookups match the
    // unencoded route/crumb definitions and the fallback label reads cleanly.
    const seg = decodeSegment(rawSeg);
    acc += `/${seg}`;
    const isCurrent = i === segments.length - 1;
    const to = !isCurrent && isRoutePath(resolvers, acc) ? acc : undefined;
    const label = resolveCrumb(resolvers, acc);
    // A label may expand one segment into several crumbs (e.g. settings ancestry);
    // only the final piece maps to the accumulated path, so only it can link.
    if (Array.isArray(label)) {
      label.forEach((l, j) => crumbs.push({ label: l, to: j === label.length - 1 ? to : undefined }));
    } else {
      crumbs.push({ label: label ?? titleCase(seg), to });
    }
  });
  if (crumbs.length === 0) {
    const root = resolveCrumb(resolvers, "/");
    if (typeof root === "string") crumbs.push({ label: root });
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
          crumbs.map((c, i) => {
            const to = c.to;
            return (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                {to ? (
                  <button
                    type="button"
                    onClick={() => navigate(to)}
                    className={cn(
                      "-mx-1 rounded-sm px-1 py-0.5 text-muted-foreground transition-colors",
                      "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {c.label}
                  </button>
                ) : (
                  <span className={i === crumbs.length - 1 ? "" : "text-muted-foreground"}>{c.label}</span>
                )}
              </span>
            );
          })
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
