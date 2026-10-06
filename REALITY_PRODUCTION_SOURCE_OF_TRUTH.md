# Reality Production Source of Truth

Effective immediately, Reality has one production source of truth:

- GitHub repository: maloney2323/Reality
- Production deployment: Vercel project `reality`
- Production branch: `main`

Base44 is not a production implementation target. Existing Base44 work is treated as reference material only. Its semantics may be ported into the canonical GitHub implementation, but Base44 state is never considered deployed, live, or verified Reality production state.

A capability progresses only through:

DESIGNED -> IMPLEMENTED -> TESTED -> DEPLOYED -> LIVE -> INDEPENDENTLY VERIFIED

A claim at a later state requires evidence from that state. In particular, passing a local or Base44 test does not prove Vercel production behavior.

For continuity, the canonical implementation is the GitHub source in:
`src/reality-continuity-seam-repair-v0.1.js`

The production rule is fail-closed:
- no synthetic continuity identifiers;
- no inferred missing parent;
- deterministic root identity from immutable particle admission identity;
- consequential work requires explicit root/event lineage;
- wrong root/worldline/parent relationships are rejected;
- execution is not treated as outcome;
- verification remains a separate state.
