import { Link } from "react-router";
import type { NavItem } from "@picoframe/plugin-sdk";
import { ExternalLink } from "lucide-react";
import { useFrame } from "../context/frame";
import { cn } from "../lib/cn";
import { useResolvedNavItem } from "../nav/useResolvedNavItem";
import { openExternal } from "../lib/openExternal";

/**
 * Default landing page contributed by the built-in `framePlugin`: a launcher that
 * lists every navigable route (drawn from the composed nav, minus Home itself) as
 * a card, preserving the sidebar's grouping so related tools stay together.
 * Domain-agnostic and presentable — apps get a useful home for free without
 * referencing the frame itself.
 */
export default function Home() {
  const { nav, title } = useFrame();
  // Keep the composed group structure (already sorted by composeNav); drop Home
  // itself and any group left empty so the launcher mirrors the sidebar.
  const groups = nav
    .map((g) => ({ ...g, items: g.items.filter((i) => i.to !== "/") }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {groups.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted-foreground">No tools available yet.</p>
      ) : (
        <>
          <p className="mt-1 text-muted-foreground">Choose a tool to get started.</p>
          <div className="mt-6 space-y-8">
            {groups.map((group) => (
              // Collapse the section (header included) when it has no visible card, so an
              // all-hidden group leaves no empty heading. `data-nav-item` is rendered by
              // each visible ToolCard.
              <section key={group.id} className="hidden has-[[data-nav-item]]:block">
                {group.label && (
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h2>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <ToolCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ToolCard({ item }: { item: NavItem }) {
  // Mirror the sidebar: an item gated off via `useVisible` is hidden everywhere, the
  // launcher included. Resolved unconditionally (per-item component, so hook-safe) before
  // the early return. Visible cards carry `data-nav-item` so their section stays shown.
  const { visible, label, icon: Icon, description } = useResolvedNavItem(item);
  if (!visible) return null;

  const cardClass =
    "group flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left text-card-foreground transition-colors hover:border-ring hover:bg-accent";
  const inner = (
    <>
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background">
          <Icon size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {description != null && (
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        )}
      </span>
      {item.href && <ExternalLink size={16} className="shrink-0 text-muted-foreground" />}
    </>
  );

  if (item.href) {
    const href = item.href;
    return (
      <button
        type="button"
        data-nav-item=""
        onClick={() => openExternal(href)}
        className={cn(cardClass, "w-full")}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link to={item.to ?? "/"} data-nav-item="" className={cardClass}>
      {inner}
    </Link>
  );
}
