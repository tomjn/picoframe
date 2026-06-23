import { Link } from "react-router";
import { useFrame } from "../context/frame";

/**
 * Default landing page contributed by the built-in `framePlugin`: a launcher that
 * lists every navigable route (drawn from the composed nav, minus Home itself) as
 * a card. Domain-agnostic and presentable — apps get a useful home for free
 * without referencing the frame itself.
 */
export default function Home() {
  const { nav, title } = useFrame();
  const items = nav.flatMap((g) => g.items).filter((i) => i.to !== "/");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {items.length === 0 ? (
        <p className="mt-2 max-w-prose text-muted-foreground">No tools available yet.</p>
      ) : (
        <>
          <p className="mt-1 text-muted-foreground">Choose a tool to get started.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors hover:border-ring hover:bg-accent"
                >
                  {Icon && (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-background">
                      <Icon size={20} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.to}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
