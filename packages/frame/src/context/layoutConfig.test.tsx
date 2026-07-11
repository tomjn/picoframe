import { expect, test } from "bun:test";
import { resolveOption } from "./layoutConfig";

test("undefined config resolves to the fallback, locked", () => {
  expect(resolveOption(undefined, false)).toEqual({ default: false, exposed: false });
  expect(resolveOption(undefined, true)).toEqual({ default: true, exposed: false });
});

test("a bare value is locked to that value", () => {
  expect(resolveOption(true, false)).toEqual({ default: true, exposed: false });
  expect(resolveOption(false, true)).toEqual({ default: false, exposed: false });
});

test("object form exposes the option, seeded to its default", () => {
  expect(resolveOption({ default: true }, false)).toEqual({ default: true, exposed: true });
});

test("object form can force locked via userConfigurable:false", () => {
  expect(resolveOption({ default: true, userConfigurable: false }, false)).toEqual({
    default: true,
    exposed: false,
  });
});
