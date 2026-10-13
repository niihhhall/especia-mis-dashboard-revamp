// The seeded Tirupati company (see supabase/seed.sql).
//
// NO LONGER used by the app: the active company comes from the `/c/<slug>`
// segment of the URL via `data/company-context`. Kept only for offline scripts
// that run outside a request and so have no URL to read a company from.
export const DEFAULT_COMPANY_ID = "11111111-1111-1111-1111-111111111111";
export const DEFAULT_COMPANY_SLUG = "tirupati";
