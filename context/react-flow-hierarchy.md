# React Flow Data Hierarchy & Persistence

This document explains the recommended way to structure, name, and persist flows (diagrams/canvases) in React Flow, including support for single flows, multiple flows, and workspace/project grouping.

---

## 1. Single Flow (Basic)

A single flow consists of:
- `nodes`: Array of node objects (with id, type, position, data, etc.)
- `edges`: Array of edge objects (with id, source, target, etc.)
- `viewport`: (optional) The current zoom/pan state
- `name`: (recommended) A friendly name for the flow

**Example:**
```json
{
  "name": "Order Processing Flow",
  "nodes": [...],
  "edges": [...],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

---

## 2. Multiple Flows (Per Workspace/Project)

To support multiple flows (e.g., different diagrams, function models, or canvases), wrap each flow in an object with a unique `id` and `name`:

**Example:**
```json
{
  "flows": [
    {
      "id": "flow-1",
      "name": "User Signup Flow",
      "nodes": [...],
      "edges": [...],
      "viewport": { "x": 0, "y": 0, "zoom": 1 }
    },
    {
      "id": "flow-2",
      "name": "Order Fulfillment Flow",
      "nodes": [...],
      "edges": [...],
      "viewport": { "x": 0, "y": 0, "zoom": 1 }
    }
  ]
}
```
- This allows you to list flows by name, search, and link between them.

---

## 3. Workspace/Project Level (Client/Org Grouping)

For multi-tenant or organizational support, group flows under a workspace/project:

**Example:**
```json
{
  "workspaceId": "client-123",
  "name": "Acme Corp Workspace",
  "owner": "user-456",
  "flows": [ ... ]
}
```
- This enables permissions, sharing, and organization-wide features.

---

## 4. Linking Flows Together

If a node or edge in one flow should reference another flow (e.g., a sub-process), store a reference by `id`:

```json
{
  "id": "stage-1",
  "type": "stageNode",
  "data": {
    "linkedFlowId": "flow-2"
  }
}
```
- In your UI, resolve this id to the flow’s name for display and navigation.

---

## 5. Summary Table

| Level         | Structure Example                                 | Use Case                        |
|---------------|---------------------------------------------------|---------------------------------|
| Single Flow   | `{ name, nodes, edges, viewport }`                | One canvas/diagram              |
| Multiple Flows| `{ flows: [ { id, name, ... }, ... ] }`           | Many canvases/diagrams          |
| Workspace     | `{ workspaceId, name, flows: [...] }`             | Grouping flows by client/project|

---

## 6. Best Practices
- Always include a `name` for each flow for user-friendly display.
- Use unique `id`s for flows and workspaces.
- Store extra metadata (description, timestamps, tags) as needed.
- Use the React Flow `toObject()` method for serialization.
- Restore flows by setting nodes, edges, and viewport from the saved object.

---

## 7. References
- [React Flow Save & Restore Example](https://reactflow.dev/examples/interaction/save-and-restore/)
- [React Flow Docs: Save and Restore](https://reactflow.dev/learn/examples/interaction/save-and-restore/)
- [React Flow Sub Flows Guide](https://reactflow.dev/learn/layouting/sub-flows) 