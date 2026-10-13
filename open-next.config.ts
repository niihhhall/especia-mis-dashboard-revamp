import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override: this app has no static or ISR pages to
// cache (every route reads RLS-scoped data at request time), so the default
// config is enough — no R2 bucket to provision.
export default defineCloudflareConfig({});
