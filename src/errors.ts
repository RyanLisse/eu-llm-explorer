import { Schema } from "effect";

/** The curated dataset failed schema decoding (bad shape / out-of-range value). */
export class CatalogDecodeError extends Schema.TaggedError<CatalogDecodeError>()(
  "CatalogDecodeError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.String),
  },
) {}

/** A failover chain was requested for a task class that has no candidate routes
 *  under the current sovereignty policy. */
export class NoEligibleRouteError extends Schema.TaggedError<NoEligibleRouteError>()(
  "NoEligibleRouteError",
  {
    task: Schema.String,
    message: Schema.String,
  },
) {}
