import { NavLink, Navigate, useParams } from "react-router";
import { useFrame } from "../context/frame";
import { cn } from "../lib/cn";
import type { SettingsNode } from "../settings/composeSettings";

function NavNode({ node, activeId, depth }: { node: SettingsNode; activeId: string; depth: number }) {
  const Icon = node.icon;
  return (
    <>
      <NavLink
        to={`/settings/${node.id}`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        className={cn(
          "flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          node.id === activeId
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground",
        )}
      >
        {Icon ? <Icon size={16} className="shrink-0" /> : null}
        <span className="truncate">{node.title}</span>
      </NavLink>
      {node.children.map((child) => (
        <NavNode key={child.id} node={child} activeId={activeId} depth={depth + 1} />
      ))}
    </>
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
            {node.children.map((child) => (
              <li key={child.id}>
                <NavLink
                  to={`/settings/${child.id}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {child.title}
                </NavLink>
              </li>
            ))}
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
          <NavNode key={node.id} node={node} activeId={sectionId} depth={0} />
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
