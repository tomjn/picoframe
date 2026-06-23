import { expect, test } from "bun:test";
import { directionForButton } from "./useMouseNavigation";

test("maps the X1/X2 mouse buttons to directions", () => {
  expect(directionForButton(3)).toBe("back");
  expect(directionForButton(4)).toBe("forward");
});

test("ignores the primary, middle, and secondary buttons", () => {
  expect(directionForButton(0)).toBeNull();
  expect(directionForButton(1)).toBeNull();
  expect(directionForButton(2)).toBeNull();
});
