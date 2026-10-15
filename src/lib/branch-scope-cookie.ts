// Mirrors period-cookie.ts exactly. Which branch/group scope a report page
// renders, "consolidated" | "branch:<id>" | "group:<id>", set by
// BranchScopeSelector, read server-side via getSelectedBranchScope().
export const BRANCH_SCOPE_COOKIE = "mis_branch_scope";
