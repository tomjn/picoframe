import { useMouseNavigation } from "../history/useMouseNavigation";
import { useFrame } from "../context/frame";
import { DrawerHost } from "../drawer/DrawerHost";
import { usePersistentState } from "../lib/usePersistentState";
import { RouteHost } from "./RouteHost";
import { Sidebar, SIDEBAR_DEFAULT_WIDTH } from "./Sidebar";
import { TopBar } from "./TopBar";

/** The frame's single layout route: sidebar + top bar + routed content. */
export function AppLayout() {
  const { nav, title } = useFrame();
  const [collapsed, setCollapsed] = usePersistentState("picoframe.sidebar.collapsed", false);
  const [width, setWidth] = usePersistentState("picoframe.sidebar.width", SIDEBAR_DEFAULT_WIDTH);
  useMouseNavigation();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar groups={nav} collapsed={collapsed} width={width} onResize={setWidth} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main data-slot="content-scroll" className="min-h-0 flex-1 overflow-auto">
          <RouteHost />
        </main>
      </div>
      <DrawerHost />
    </div>
  );
}
