import { type DrawerDirection, type DrawerSize, Button, useDrawer } from "@picoframe/frame";
import { PanelBottom, PanelLeft, PanelRight } from "lucide-react";
import { DropdownMenu, Popover } from "radix-ui";
import { useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DIRECTIONS: { value: DrawerDirection; label: string; icon: typeof PanelRight }[] = [
  { value: "right", label: "Right", icon: PanelRight },
  { value: "left", label: "Left", icon: PanelLeft },
  { value: "bottom", label: "Bottom", icon: PanelBottom },
];

const SIZES: DrawerSize[] = ["sm", "md", "lg", "full"];

function DrawerContents({ direction, size }: { direction: DrawerDirection; size: DrawerSize }) {
  const { close } = useDrawer();
  return (
    <div className="grid gap-3 text-sm">
      <p className="text-muted-foreground">
        A <strong>{direction}</strong> drawer at size <strong>{size}</strong>, portalled into the
        bounded box — its overlay stops at the box edge, so the sidebar stays clickable.
      </p>
      <p className="text-muted-foreground">
        Inside a drawer, use the registry <code>select</code> component rather than a native{" "}
        <code>&lt;select&gt;</code>: the dialog focus trap fights the browser's native popup.
      </p>
      {/* Portalled popup layers. Dismissing one without choosing an item must close only
          that popup, never the drawer underneath it. See the file comment. */}
      <div className="flex flex-wrap items-center gap-3">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Alpha</SelectItem>
            <SelectItem value="b">Bravo</SelectItem>
          </SelectContent>
        </Select>
        <Popover.Root>
          <Popover.Trigger className="rounded border px-3 py-2">Popover</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="z-50 rounded border bg-background p-3 shadow-lg">
              Popover body
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="rounded border px-3 py-2">Menu</DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="z-50 rounded border bg-background p-1 shadow-lg">
              <DropdownMenu.Item className="px-3 py-1 outline-none">Item one</DropdownMenu.Item>
              <DropdownMenu.Item className="px-3 py-1 outline-none">Item two</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <Button variant="outline" size="sm" onClick={close}>
        Close
      </Button>
    </div>
  );
}

/**
 * Exercises issue #18: container targeting (drawer portalled into a bounded region, not the
 * whole window) plus the right/left/bottom directions and sm/md/lg/full sizes. The box below
 * is `relative` + `overflow-hidden` so the absolutely-positioned drawer and its scrim are
 * clipped to it and respect its rounded corners.
 *
 * Both open buttons are here because contained and full-window drawers take different Radix
 * dialog paths (non-modal vs modal), and the Select/Popover/Menu inside the drawer cover the
 * portalled-popup case: dismissing a popup with no selection used to take the drawer with it.
 */
export default function DrawerLab() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [direction, setDirection] = useState<DrawerDirection>("right");
  const [size, setSize] = useState<DrawerSize>("md");
  const { open } = useDrawer();

  return (
    <div className="grid gap-6 p-6">
      <div className="grid gap-1">
        <h1 className="text-lg font-semibold">Drawer lab</h1>
        <p className="text-sm text-muted-foreground">
          Container targeting, directions and sizes. The drawer opens inside the framed box, not
          over the whole window.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6">
        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Direction</span>
          <div className="flex gap-2">
            {DIRECTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={direction === value ? "default" : "outline"}
                size="sm"
                onClick={() => setDirection(value)}
              >
                <Icon size={16} />
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <span className="text-xs font-medium text-muted-foreground">Size</span>
          <div className="flex gap-2">
            {SIZES.map((value) => (
              <Button
                key={value}
                variant={size === value ? "default" : "outline"}
                size="sm"
                onClick={() => setSize(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
        <Button
          onClick={() =>
            open({
              title: "Contained drawer",
              description: `${direction} · ${size}`,
              direction,
              size,
              container: () => boxRef.current,
              content: <DrawerContents direction={direction} size={size} />,
            })
          }
        >
          Open in box
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            open({
              title: "Full-window drawer",
              description: `${direction} · ${size}`,
              direction,
              size,
              content: <DrawerContents direction={direction} size={size} />,
            })
          }
        >
          Open full window
        </Button>
      </div>

      <div
        ref={boxRef}
        className="relative h-96 overflow-hidden rounded-xl border border-border bg-muted/30"
      >
        <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
          Bounded content region. The drawer&apos;s overlay covers only this box; anything outside
          it (the sidebar, the top bar) stays interactive.
        </div>
      </div>
    </div>
  );
}
