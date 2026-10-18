import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

afterEach(cleanup);

function OpenDialog({ closeLabel }: { closeLabel?: string }) {
  return (
    <Dialog open>
      <DialogContent closeLabel={closeLabel}>
        <DialogTitle>title</DialogTitle>
        <DialogDescription>description</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

test("the close button sr-only text is the closeLabel prop", () => {
  render(<OpenDialog closeLabel="Fermer" />);
  const label = screen.getByText("Fermer");
  expect(label.className).toContain("sr-only");
  expect(screen.queryByText("Close")).toBeNull();
});

test("the close button sr-only text defaults to Close", () => {
  render(<OpenDialog />);
  expect(screen.getByText("Close").className).toContain("sr-only");
});
