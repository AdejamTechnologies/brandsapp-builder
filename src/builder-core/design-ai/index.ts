// New file (24 Nov 2026): the design-ai entry — everything an outside designer (the partners MCP) or the
// in-app author needs that does not call a model. Deliberately NOT re-exported from ../index, so the
// storefront bundle never pulls 600 lines of stock photos and prompts it does not use.
export * from "./author"
export * from "./craft"
export * from "./edit"
export * from "./examples"
export * from "./guide"
export * from "./slop-gate"
export * from "./stock-images"
export * from "./vocabulary"
