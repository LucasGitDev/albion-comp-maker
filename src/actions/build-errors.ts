/**
 * Error types shared by `src/actions/builds.ts`. Kept in a separate module
 * because a `"use server"` file may only export async functions — classes
 * and type aliases have to live outside it.
 */
export class BuildNotFoundError extends Error {
  constructor(message = "Build not found") {
    super(message);
    this.name = "BuildNotFoundError";
  }
}
