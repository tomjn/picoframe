import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Slider } from "@/components/ui/slider";

afterEach(cleanup);

test("the slider thumb shows a full-strength ring-coloured indicator on focus-visible", () => {
  render(<Slider defaultValue={[50]} />);
  const thumb = screen.getByRole("slider").className;
  expect(thumb).toContain("hover:ring-4");
  expect(thumb).toContain("focus-visible:border-ring");
});
