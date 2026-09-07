/**
 * Error types shared by `src/actions/comps.ts`. Kept in a separate module
 * because a `"use server"` file may only export async functions — classes
 * and type aliases have to live outside it. Mirrors `build-errors.ts`.
 */
export class CompNotFoundError extends Error {
  constructor(message = "Comp not found") {
    super(message);
    this.name = "CompNotFoundError";
  }
}

/**
 * Thrown when a build referenced by `addBuildToComp` does not exist, is
 * private and not owned by the caller, or otherwise cannot be attached.
 * Deliberately the same shape/behavior as `CompNotFoundError` for the
 * "missing vs not owned" ambiguity (IDOR) — see `BuildNotFoundError`.
 */
export class CompBuildRefNotFoundError extends Error {
  constructor(message = "Build not found") {
    super(message);
    this.name = "CompBuildRefNotFoundError";
  }
}

/**
 * Thrown by `reorderCompBuilds` when the caller's `orderedIds` is not
 * exactly a permutation of the comp's existing `comp_builds` row ids
 * (duplicate, missing, or foreign id). Refusing outright avoids leaving
 * gapped/duplicate positions from a partial or malformed reorder request.
 */
export class CompBuildReorderInvalidError extends Error {
  constructor(message = "orderedIds must be exactly the comp's existing comp_builds rows, each once") {
    super(message);
    this.name = "CompBuildReorderInvalidError";
  }
}
