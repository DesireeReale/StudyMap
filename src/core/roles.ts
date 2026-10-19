export const NODE_ROLES = ["radice", "area-1", "area-2", "area-3", "neutro"] as const;
export type NodeRole = (typeof NODE_ROLES)[number];
