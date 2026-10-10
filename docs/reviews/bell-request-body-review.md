# Bell input streaming review — 2026-10-09

Delegated reviewer: auth_review. Accepted lib/bells/request-body.ts, POST/PATCH route integration and tests. Reader bounds raw bytes before decoding, strictly decodes split UTF-8, cancels failure paths and releases reader locks. Three targeted tests passed. Existing same-origin validation, server-derived account ownership, strict schemas and transactional publication version fencing remain. No concrete blocker found. No financial actions were performed.
