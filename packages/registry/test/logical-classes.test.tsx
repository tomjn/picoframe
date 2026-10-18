import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Direction, DropdownMenu } from "radix-ui";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

afterEach(cleanup);

function classesOf(text: string) {
  return (screen.getByText(text).closest("[class]") as HTMLElement).className;
}

test("a select item pads and places its check mark on the logical sides", () => {
  render(
    <Select open value="a">
      <SelectTrigger>trigger</SelectTrigger>
      <SelectContent>
        <SelectItem value="a">alpha</SelectItem>
      </SelectContent>
    </Select>,
  );
  const item = screen.getAllByRole("option")[0].className;
  expect(item).toContain("pe-8");
  expect(item).toContain("ps-2");
  expect(item).not.toMatch(/(^|\s)p[lr]-/);
  const indicator = screen.getAllByRole("option")[0].querySelector("span")?.className;
  expect(indicator).toContain("end-2");
  expect(indicator).not.toContain("right-2");
});

test("a sheet on the right sits at the end and swaps its slide animation under rtl", () => {
  render(
    <Sheet open>
      <SheetContent side="right">
        <SheetTitle>title</SheetTitle>
        <SheetDescription>description</SheetDescription>
      </SheetContent>
    </Sheet>,
  );
  const sheet = screen.getByRole("dialog").className;
  expect(sheet).toContain("end-0");
  expect(sheet).toContain("border-s");
  expect(sheet).toContain("rtl:data-[state=open]:slide-in-from-left");
  expect(sheet).toContain("rtl:data-[state=closed]:slide-out-to-left");
  expect(sheet).not.toMatch(/(^|\s)(right-0|border-l)(\s|$)/);
});

test("a sheet close button sits at the end", () => {
  render(
    <Sheet open>
      <SheetContent>
        <SheetTitle>title</SheetTitle>
        <SheetDescription>description</SheetDescription>
      </SheetContent>
    </Sheet>,
  );
  expect(screen.getByText("Close").closest("button")?.className).toContain("end-4");
});

test("a dropdown sub-menu chevron mirrors under rtl and sits at the end", () => {
  render(
    <DropdownMenu.Root open>
      <DropdownMenu.Trigger>menu</DropdownMenu.Trigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked>check</DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>more</DropdownMenuSubTrigger>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu.Root>,
  );
  const chevron = screen.getByText("more").querySelector("svg")?.getAttribute("class");
  expect(chevron).toContain("ms-auto");
  expect(chevron).toContain("rtl:-scale-x-100");
  const check = screen.getByRole("menuitemcheckbox").className;
  expect(check).toContain("ps-8");
  expect(check).toContain("pe-2");
  expect(classesOf("check")).not.toMatch(/(^|\s)p[lr]-/);
});

// These portal out of the frame root, so they carry the direction themselves.
const portalled: [string, string, () => React.ReactElement][] = [
  [
    "dialog",
    "dialog",
    () => (
      <Dialog open>
        <DialogContent>
          <DialogTitle>t</DialogTitle>
          <DialogDescription>d</DialogDescription>
        </DialogContent>
      </Dialog>
    ),
  ],
  [
    "sheet",
    "dialog",
    () => (
      <Sheet open>
        <SheetContent>
          <SheetTitle>t</SheetTitle>
          <SheetDescription>d</SheetDescription>
        </SheetContent>
      </Sheet>
    ),
  ],
  [
    "alert dialog",
    "alertdialog",
    () => (
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>t</AlertDialogTitle>
          <AlertDialogDescription>d</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    ),
  ],
  [
    "popover",
    "dialog",
    () => (
      <Popover open>
        <PopoverContent>body</PopoverContent>
      </Popover>
    ),
  ],
  [
    "hover card",
    "dialog",
    () => (
      <HoverCard open>
        <HoverCardContent>body</HoverCardContent>
      </HoverCard>
    ),
  ],
];

for (const [name, role, ui] of portalled) {
  test(`a ${name} takes the direction from DirectionProvider`, () => {
    render(<Direction.DirectionProvider dir="rtl">{ui()}</Direction.DirectionProvider>);
    const el = role === "dialog" && (name === "popover" || name === "hover card") ? screen.getByText("body").closest("[data-slot]") : screen.getByRole(role);
    expect(el?.getAttribute("dir")).toBe("rtl");
  });

  test(`a ${name} is ltr without a DirectionProvider, like Radix menus and selects`, () => {
    render(ui());
    const el = role === "dialog" && (name === "popover" || name === "hover card") ? screen.getByText("body").closest("[data-slot]") : screen.getByRole(role);
    expect(el?.getAttribute("dir")).toBe("ltr");
  });
}

test("a tooltip takes the direction from DirectionProvider", () => {
  render(
    <Direction.DirectionProvider dir="rtl">
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger>t</TooltipTrigger>
          <TooltipContent>tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Direction.DirectionProvider>,
  );
  expect(screen.getAllByText("tip")[0].closest("[data-slot]")?.getAttribute("dir")).toBe("rtl");
});
