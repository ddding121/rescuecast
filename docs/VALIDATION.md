# Validation - 22 September 2026

## Repeated checks

- `pnpm install --frozen-lockfile`: passed with pnpm 9.15.9.
- `pnpm build`: passed Next.js compilation, TypeScript checking, page-data collection, and static generation.
- Built routes: `/`, `/api/feedback`, `/api/geocode`, `/api/scene-images`.
- No API keys or credentials were found in the archived repository.

## Code-level controls confirmed

- Feedback accepts only `helpful` or `unhelpful`, stores a unique browser-session ID, and rejects a second vote.
- Scene images require an image content type, enforce an 8 MB limit, sanitise the stored file name, and scope retrieval to the session ID.
- Geocoding attempts ArcGIS first and Nominatim second, returning a clear failure when neither provider finds the place.
- The map uses OpenStreetMap tiles, a location marker, and an illustrative 1,200-metre circle.
- Publishing requires all three manual verification checks in the client workflow.

## Evidence boundaries

The repository currently has no automated browser test, third-party geocoding contract test, load test, or formal WCAG audit. Cookie identity is not account authentication, temporary Render storage is not durable, and generated emergency guidance must be reviewed by authorised personnel.
