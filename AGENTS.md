# Architecture rules
- Store systemic adjustments in a versioned local map keyed by production-cycle start; only the open cycle is writable, so historical PDFs never reuse a changing global value.
- Migrate legacy global adjustments once for known cycles, preferring explicit saved module adjustments; keep the old key intact because older data has no recoverable per-cycle history.
- Perform photo OCR lazily in a single browser worker using bundled same-origin Portuguese resources, then terminate it; this protects offline privacy and bounds memory use.
- Extract only the requested labelled row or an unambiguous isolated row; leave ambiguous images untouched rather than contaminating other report fields.
- Keep offline registration in one guarded wrapper and precache OCR resources through generateSW; editor previews must not register app-shell workers.
- Remove only the retired maps IndexedDB database at startup without awaiting deletion; personal production storage must remain untouched.