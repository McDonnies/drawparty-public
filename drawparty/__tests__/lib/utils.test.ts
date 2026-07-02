// DrawParty — lib/utils Tests
// Tests utility functions in lib/utils.ts.

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classnames helper)", () => {
  it("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    // tailwind-merge: last padding wins
    expect(cn("p-2", "p-4")).toBe("p-4");
    // last text color wins
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", undefined, null as unknown as string, false as unknown as string, "bar")).toBe("foo bar");
  });
});
