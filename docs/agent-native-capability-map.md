# Agent-Native Capability Map

This map is the durable contract between the EU LLM Explorer UI and the chat
agent. It records what a user can do directly, what the agent can drive today,
and what remains intentionally out of scope.

## UI Actions

| Surface | User action | Agent parity |
| --- | --- | --- |
| Page shell | Open `Compare`, `Presentation`, `Advanced`, and `Book` tabs through the tab bar and `?tab=` URL state. | Agent-driven through `open_tab` or `set_ui_state`. |
| Page shell | Toggle light/dark theme. | Agent-driven through `set_ui_state`; still persisted as a local preference. |
| Page shell | Show or hide the right-side Compliance Agent panel. | Agent-driven through `set_ui_state`; user remains the normal entry point. |
| Compare | Select a model family first, then inspect only providers that actually offer that model. | Agent-driven through `set_compare_state.selectedModelKey`. |
| Compare | Compare real provider options for the selected model by availability, price benchmark, TTFT, throughput, reliability, and sovereignty tier. | Agent-driven through `set_compare_state`. |
| Compare | Search model families and toggle model filters: reasoning, open, vision, tools, Tier A, and hide Azure-only. | Agent-driven through `set_compare_state`. |
| Compare | Set the primary provider through URL-backed `?vendor=` state when selecting a provider option. | Agent-driven through `set_compare_state`. |
| Advanced Explorer | Filter routes by tier, mode, capability, provider, maker, openness, price, reliability, metric, sort, and text search. | Agent-driven through `set_filters`. |
| Advanced Explorer | Select a route from cards, chart points, or the table to inspect its detail panel. | Agent-driven through `select_route`. |

## Agent Tools

| Tool | Runtime | Capability | Boundary |
| --- | --- | --- | --- |
| `query_data` | Server-side | Runs a read-only Turso SQL query and returns up to 50 rows for catalog reasoning. | Must remain read-only. Allows single SELECT statements against allowlisted catalog tables only. |
| `set_filters` | Client-side | Incrementally updates the Advanced Explorer filter state. Omitted fields keep their current values. | Mirrors `FilterState`; field renames require a tool/schema/map update. |
| `select_route` | Client-side | Selects a route by canonical `routeId` so cards, chart, table, and detail panel can focus the same route. | Does not create or edit route data. |
| `open_tab` | Client-side | Opens Compare, Presentation, Advanced, or Book through the same URL-backed shell state as the tab bar. | Valid tabs are defined in the shared agent constants module. |
| `set_ui_state` | Client-side | Updates shell UI state: active tab, chat panel visibility, and light/dark theme. | Does not alter catalog data or persistent account settings beyond local theme preference. |
| `set_compare_state` | Client-side | Updates Compare model selection, provider selection, primary provider, model search, and matrix filters. | Accepts patches only; Compare rejects unknown providers and no longer treats empty vendor/model intersections as useful comparisons. |

Discovery commands `/help` and `/tools` expose the same tool vocabulary as this
document through deterministic server-side slash command handling.

## Read-Only Database Decision

Runtime catalog data is intentionally read-only. The app and chat agent may read
Turso catalog tables for route, provider coverage, region, summary, and audit
answers, but they must not expose unauthenticated create, update, or delete
paths for persistent catalog entities.

Catalog writes belong in explicit maintenance flows such as seed scripts,
audited data refreshes, or direct operator action. This preserves the public
explorer as a decision surface rather than an ad-hoc catalog editor.

## Maintenance Rule

Any change that adds, removes, renames, or materially changes a UI action must
update this capability map in the same change set. If the action is agent
drivable, update the matching tool schema, prompt/tool descriptions, visible
tool result chip, and `/tools` output when those surfaces exist.
