import { ChevronRight } from "lucide-react";
import { NavLink, Navigate, useParams } from "react-router";
import { useFrame } from "../context/frame";
import { cn } from "../lib/cn";
import type { SettingsNode } from "../settings/composeSettings";

function NavNode({ node, activeId, nested = false }: { node: SettingsNode; activeId: string; nested?: boolean }) {
  const Icon = node.icon;
  return (
    <div>
      <NavLink
        to={`/settings/${node.id}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          node.id === activeId
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground",
        )}
      >
        {/* Top-level rows reserve the icon column so labels align; nested rows skip
            it — the guide line already conveys depth, and their labels then sit
            under the parent's label rather than indented past it. */}
        {Icon ? (
          <Icon size={16} className="shrink-0" />
        ) : nested ? null : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{node.title}</span>
      </NavLink>
      {/* Nested sections sit inside a left guide line so they read as sub-pages. */}
      {node.children.length > 0 && (
        <div className="mt-1 ml-4 space-y-1 border-l border-border pl-2">
          {node.children.map((child) => (
            <NavNode key={child.id} node={child} activeId={activeId} nested />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionContent({ node }: { node: SettingsNode }) {
  const Component = node.Component;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-foreground">{node.title}</h1>
      {node.description ? <p className="mt-1 text-muted-foreground">{node.description}</p> : null}
      <div className="mt-6">
        {Component ? (
          <Component />
        ) : node.children.length ? (
          <ul className="grid gap-2">
            {node.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <li key={child.id}>
                  <NavLink
                    to={`/settings/${child.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground transition-colors hover:border-ring hover:bg-accent"
                  >
                    {ChildIcon && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background">
                        <ChildIcon size={16} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{child.title}</span>
                      {child.description && (
                        <span className="block truncate text-xs text-muted-foreground">{child.description}</span>
                      )}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                  </NavLink>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Frame-owned settings page: the section tree on the left, the selected section on the
 * right. Every node is reachable at `/settings/<id>`, so any code can deep-link to it.
 */
export default function Settings() {
  const { settings } = useFrame();
  const { sectionId } = useParams();

  if (!sectionId) {
    const first = settings.nodes[0];
    return first ? (
      <Navigate to={`/settings/${first.id}`} replace />
    ) : (
      <div className="p-8 text-muted-foreground">No settings available.</div>
    );
  }

  const selected = settings.byId.get(sectionId);

  return (
    <div className="flex h-full">
      <nav className="w-60 shrink-0 space-y-1 overflow-y-auto border-r border-border p-3">
        {settings.nodes.map((node) => (
          <NavNode key={node.id} node={node} activeId={sectionId} />
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-8">
        {selected ? (
          <SectionContent node={selected} />
        ) : (
          <div className="text-muted-foreground">
            Unknown settings section: <code className="font-mono">{sectionId}</code>
          </div>
        )}
      </div>
    </div>
  );
}
