import { describe, expect, it } from "vitest";
import { KILLBOARD_MATRIX } from "@/components/build-card/layout-matrix";
import { SLOT_ORDER } from "@/types/build";

describe("KILLBOARD_MATRIX", () => {
  it("flat() + mount is an exact permutation of SLOT_ORDER (ACM-073 AC#3)", () => {
    // If a slot is ever added to SLOT_ORDER without updating this matrix, a
    // slot silently disappears from the Compressed card's 3x3 grid. Sorting
    // both sides catches additions, removals AND duplicates — a straight
    // `.length` check would miss a duplicate slot masking a missing one.
    const matrixSlots = [...KILLBOARD_MATRIX.flat(), "mount"].toSorted();
    const expectedSlots = [...SLOT_ORDER].toSorted();
    expect(matrixSlots).toEqual(expectedSlots);
  });

  it("is a 3x3 grid (9 cells)", () => {
    expect(KILLBOARD_MATRIX).toHaveLength(3);
    for (const row of KILLBOARD_MATRIX) {
      expect(row).toHaveLength(3);
    }
  });
});
