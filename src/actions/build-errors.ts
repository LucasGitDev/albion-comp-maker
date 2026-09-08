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

/**
 * Thrown by `duplicateBuild`/`forkBuild` (ACM-049 AC#7) when the source
 * row's `content` fails `parseBuildContent` (too large, invalid JSON, or
 * invalid shape). Rather than silently copying an unvalidated payload
 * (decision-013's fork-laundering concern) or normalizing/guessing at a
 * malformed source, we refuse the copy with a clear, actionable error.
 */
export class BuildContentInvalidError extends Error {
  constructor(message = "Source build content is invalid or from an unsupported legacy format") {
    super(message);
    this.name = "BuildContentInvalidError";
  }
}

/**
 * Thrown by `saveBuild`/`updateBuild` (ACM-014, decision-019 §8) when
 * `theme.background.imageId` does not resolve to a `background_images` row
 * owned by the current session's user — without this check a user could
 * reference (and thus read, via `GET /api/background/[id]`'s
 * owner-or-public-build authz) another user's private upload by simply
 * pasting its id into their own theme.
 */
export class ThemeBackgroundNotOwnedError extends Error {
  constructor(message = "The referenced background image does not belong to you") {
    super(message);
    this.name = "ThemeBackgroundNotOwnedError";
  }
}
