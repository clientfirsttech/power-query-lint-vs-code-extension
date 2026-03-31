---
name: fab-inspector
description: PBI Inspector V2 (FabInspector) rule authoring documentation. Use when writing, understanding, or debugging inspection rules for Power BI Reports (PBIR) and other Fabric CI/CD items. Covers rule file structure, the part iterator, test definitions with data mapping and expected results, patch definitions for auto-fixing, all custom PBI Inspector operators, and a step-by-step rule creation tutorial.
user-invokable: false
---

# PBI Inspector V2 — FabInspector Rule Authoring Guide

You are an expert in PBI Inspector V2 (FabInspector) rule authoring. You write, debug, and explain inspection rules for Power BI Reports (PBIR) and Fabric CI/CD items fluently. You know every custom operator, the part iterator system, test/patch definitions, and best practices.

> Based on the [PBI-InspectorV2 wiki](https://github.com/NatVanG/PBI-InspectorV2/wiki) by Nat Van Gulck.

PBI Inspector V2 uses JsonLogic (written in JSON) to express inspection rules that validate Power BI Report (PBIR) definitions and other Fabric CI/CD item definitions.

## Structure of a Rules File

A rules file is JSON containing a `rules` array:

```json
{
  "rules": [
    { /* rule 1 */ },
    { /* rule 2 */ }
  ]
}
```

## Anatomy of a Rule

```SudoLang
interface FabInspectorRule {
  id: String             // unique identifier
  name: String           // display name in HTML results with wireframes
  description?: String   // longer explanation of what this rule checks
  logType?: "error" | "warning"  // default: "warning"
  itemType?: String      // Fabric item type from .platform file (e.g. Report, CopyJob, Lakehouse, "*" for cross-item, "json" for any JSON metadata)
  disabled?: Boolean     // default: false
  part?: String          // iterator expression — see Part Iterator
  test: [Logic, DataMapping?, ExpectedResult]
  patch?: [PartName, [PatchOperation]]
  applyPatch?: Boolean   // set to true when patch is defined
}
```

### Rule Properties

| Property | Required | Description |
|---|---|---|
| `id` | Yes | A unique identifier string for the rule. |
| `name` | Yes | Display name shown in HTML results with wireframe images. |
| `description` | No | Longer explanation of what the rule checks. |
| `logType` | No | `"error"` or `"warning"` (default). |
| `itemType` | No | The Fabric item type from the `.platform` file (e.g. `Report`, `CopyJob`, `Lakehouse`). Use `"*"` for cross-item rules or `"json"` for any JSON metadata file. |
| `disabled` | No | `true` to skip the rule; defaults to `false`. |
| `part` | No | An iterator expression — see [Part Iterator](#part-iterator). |
| `test` | Yes | Array of `[logic, optionalDataMapping, expectedResult]`. |
| `patch` | No | Optional auto-fix — see [Patch Definition](#patch-definition). |

## Part Iterator

The `part` property controls **what** the rule iterates over.

```SudoLang
interface PartIterator {
  Constraints {
    When part matches an array of items, the rule applies iteratively to each item.
    For Power BI Reports, use reserved part names (case-sensitive).
    For other Fabric items, use a regular expression to match file/folder paths.
    Folder separators are normalised to ":" for cross-platform compatibility.
  }
}
```

### Reserved Part Names (Power BI Reports — case-sensitive)

| Part Name | Returns |
|---|---|
| `Report` | The `report.json` file |
| `ReportExtensions` | The `reportExtensions.json` file |
| `Version` | The `version.json` file |
| `PagesHeader` | The `pages.json` file (context-dependent) |
| `Pages` | All `*.page.json` files |
| `AllPages` | Same as Pages across all contexts |
| `Visuals` | `*.visual.json` files in the current part context |
| `AllVisuals` | All `*.visual.json` files regardless of context |
| `MobileVisuals` | `*.mobile.json` files in the current part context |
| `AllMobileVisuals` | All `*.mobile.json` files regardless of context |
| `BookmarksHeader` | The `bookmarks.json` file (context-dependent) |
| `Bookmarks` | `*.bookmark.json` files in the current part context |
| `AllBookmarks` | All `*.bookmark.json` files |
| `Files` | All files within the parent part context |

### Regex Part Matching (Fabric Items)

For non-report Fabric items (or to match files by name), supply a regular expression. Folder separators are normalised to `:` for cross-platform compatibility:

```json
"part": "copyjob-content.json"
```

```json
"part": "folder1:.*:copyjob-content\\.json$"
```

This matches paths like `C:\fabricproject\folder1\copyjob1.CopyJob\copyjob-content.json` (Windows) or `/home/fabricproject/folder1/copyjob1.CopyJob/copyjob-content.json` (Linux).

## Test Definition

```SudoLang
interface TestDefinition {
  shape: [Logic, DataMapping?, ExpectedResult]

  Constraints {
    Logic is a JsonLogic expression — can return any JSON value.
    DataMapping provides named variables as literal values or JSON Pointer path expressions (RFC 6901).
    If DataMapping is omitted, the test array has only two items: logic and expected result.
    ExpectedResult is the value the logic must produce for the test to pass.
    Returning an array of failing items is often more useful than true/false — expected result is then [].
  }
}
```

### Test Logic

The first element is a JsonLogic expression. It can return any JSON value — boolean, string, number, array, or object.

### Data Mapping (Optional)

The second element provides named variables as literal values or JSON Pointer path expressions:

```json
"test": [
  { "var": "myvar" },
  { "myvar": "/path/to/json/node" },
  "expected"
]
```

### Expected Result

The last element is the value the logic must produce for the test to pass. Common patterns:

- `true` / `false` for boolean checks
- `[]` when the logic returns an array of failing items (empty = all pass)
- A literal value or object for exact-match checks

## Patch Definition

```SudoLang
interface PatchDefinition {
  shape: [PartName, [PatchOperation]]

  Constraints {
    Currently only Power BI Report parts are supported.
    PartName is one of the reserved Power BI part names.
    Operations follow JSON Patch specification (RFC 6902).
    Add "applyPatch": true to the rule object when using a patch.
  }
}
```

Example:

```json
"patch": [
  "Visuals",
  [
    { "op": "replace", "path": "/visual/objects/categoryAxis/0/properties/showAxisTitle/expr/Literal/Value", "value": "true" },
    { "op": "replace", "path": "/visual/objects/valueAxis/0/properties/showAxisTitle/expr/Literal/Value", "value": "true" }
  ]
]
```

# PBI Inspector Custom Operators

PBI Inspector adds the following operators beyond the built-in JsonLogic library.

```SudoLang
interface CustomOperators {
  Constraints {
    These operators extend JsonLogic and are available inside any rule's test logic.
    They follow the same {"operator": [args]} pattern as standard JsonLogic.
  }
}
```

## `count` — count items in an array

```json
{
  "id": "COUNT_EXAMPLE",
  "name": "COUNT_EXAMPLE",
  "itemtype": "*",
  "test": [
    { "count": [["a", "b", "c", "d"]] },
    4
  ]
}
```

Nested example — filter entities with locally defined measures:

```json
{
  "id": "CHECK_FOR_LOCAL_MEASURES",
  "name": "Check for locally defined measures",
  "description": "Returns an array of report-level measure definitions",
  "part": "ReportExtensions",
  "test": [
    {
      "filter": [
        { "var": "entities" },
        { ">": [{ "count": [{ "var": "measures" }] }, 0] }
      ]
    },
    { "entities": "/entities" },
    []
  ]
}
```

## `diff` — set difference of two arrays

Accepts two JSON arrays as non-ordered sets. Returns items in the first set but not the second.

```json
{
  "id": "DIFF_EXAMPLE",
  "name": "DIFF_EXAMPLE",
  "itemtype": "*",
  "test": [
    { "diff": [["a", "b", "c", "d"], ["d", "c"]] },
    ["a", "b"]
  ]
}
```

Real-world example — find unused custom visuals:

```json
{
  "id": "REMOVE_UNUSED_CUSTOM_VISUALS",
  "name": "Remove custom visuals which are not used in the report.",
  "description": "Returns an array of custom visual names to be removed if any.",
  "disabled": false,
  "part": "Report",
  "test": [
    {
      "diff": [
        { "var": "customvis" },
        {
          "map": [
            { "part": "Visuals" },
            { "var": "visual.visualType" }
          ]
        }
      ]
    },
    { "customvis": "/publicCustomVisuals" },
    []
  ]
}
```

## `drillvar` — parse stringified JSON via pointer

Accepts a JSON pointer string and parses stringified JSON on the right of a `>` character. This operator was needed in V1 of PBI Inspector due to escaped JSON in `report.json`. Less relevant for V2 but still useful for querying escaped JSON such as in Deneb custom visual definitions.

## `equalsets` — test set equality

Accepts two JSON arrays as non-ordered sets. Returns `true` if they are equal.

```json
{
  "id": "EQUAL_SETS",
  "name": "EQUAL_SETS",
  "itemtype": "*",
  "test": [
    { "equalsets": [["a", "b", "c", "d"], ["d", "c", "a", "b"]] },
    true
  ]
}
```

## `filesize` — get file size in bytes

Accepts a file path string or `partinfo` output. Returns file size in bytes.

```json
{
  "id": "PQ_FILESIZE_CHECK",
  "name": "Check PowerQuery file size.",
  "itemtype": "Dataflow",
  "part": ".pq$",
  "test": [
    { "filesize": [{ "partinfo": "" }] },
    0
  ]
}
```

## `filetextsearchcount` — count regex matches in a file

Takes a file path (or `partinfo` output) and a regular expression pattern. Returns the number of matches.

```json
{
  "id": "SEARCH_SQLDATABASE_FILES",
  "name": "SEARCH_SQLDATABASE_FILES",
  "itemtype": "SQLDatabase",
  "part": ".sql",
  "test": [
    { "filetextsearchcount": [{ "partinfo": "" }, "ErrorLogID"] },
    0
  ]
}
```

## `intersection` — set intersection of two arrays

Accepts two JSON arrays as non-ordered sets. Returns their intersection.

```json
{
  "id": "INTERSECTION",
  "name": "INTERSECTION",
  "itemtype": "*",
  "test": [
    { "intersection": [["a", "b", "c", "d"], ["d", "c", "f", "e"]] },
    ["c", "d"]
  ]
}
```

## `part` — get file content of a Fabric CI/CD item

For Power BI Reports, use the reserved part names. For other items, supply a regex to match file paths.

Example — filter visuals with drop shadows enabled:

```json
{
  "id": "DISABLE_DROP_SHADOWS_ON_VISUALS",
  "name": "Disable drop shadows on visuals",
  "description": "Returns an array of visuals with drop shadows enabled.",
  "part": "Pages",
  "test": [
    {
      "map": [
        {
          "filter": [
            { "part": "Visuals" },
            {
              "some": [
                { "var": "visual.visualContainerObjects.dropShadow" },
                {
                  "==": [
                    { "var": "properties.show.expr.Literal.Value" },
                    "true"
                  ]
                }
              ]
            }
          ]
        },
        { "var": "name" }
      ]
    },
    {},
    []
  ]
}
```

### Part Matching by File Name

If the part operator references a name not in the reserved list, it matches files by regex:

```json
{ "part": "CY23SU04.json" }
```

```json
{
  "id": "COPYJOB_JSON_PART",
  "name": "COPYJOB_JSON_PART",
  "itemtype": "CopyJob",
  "test": [
    { "part": ".json$" },
    []
  ]
}
```

If the parameter is an empty string, it uses the current part iteration from the rule-level `part`:

```json
{
  "id": "COPYJOB_JSON_PART",
  "name": "COPYJOB_JSON_PART",
  "itemtype": "CopyJob",
  "part": ".json$",
  "test": [
    { "part": "" },
    []
  ]
}
```

## `partinfo` — get part metadata

Similar to `part` but returns **metadata** instead of content.

Folder metadata example:

```json
{
  "filesystemname": "root",
  "filesystempath": "C:\\...\\dw1.Warehouse",
  "partfilesystemtype": "Folder",
  "filesize": 49335,
  "filecount": 12
}
```

File metadata example:

```json
{
  "filesystemname": "Date.sql",
  "filesystempath": "C:\\...\\dw1.Warehouse\\dbo\\Tables\\Date.sql",
  "partfilesystemtype": "File",
  "filesize": 1030,
  "filecount": 1
}
```

## `path` — JSONPath query

Defines a JSONPath expression to query the context JSON. Uses [JsonPath.Net](https://docs.json-everything.net/path/basics/) ([RFC 9535](https://www.rfc-editor.org/rfc/rfc9535.html)).

```json
{
  "id": "REDUCE_OBJECTS_WITHIN_VISUALS",
  "name": "Reduce the number of objects within visuals",
  "part": "Pages",
  "test": [
    {
      "map": [
        {
          "filter": [
            { "part": "Visuals" },
            { ">": [{ "count": [{ "path": "$..projections[*]" }] }, 6] }
          ]
        },
        { "var": "name" }
      ]
    },
    {},
    []
  ]
}
```

## `query` — apply an operator to a JSON node

Accepts a JSON node object and an operator to apply. Useful for querying a part and applying further logic.

```json
{
  "id": "CHECK_VERSION",
  "name": "Check version",
  "itemtype": "Report",
  "test": [
    {
      "query": [
        { "part": "Version" },
        { "var": "version" }
      ]
    },
    "2.0.0"
  ]
}
```

## `rectoverlap` — detect overlapping rectangles

Accepts a JSON array of rectangle records (`name`, `x`, `y`, `width`, `height`) and an optional margin width. Returns overlapping rectangle names (inflated by the margin).

```json
{
  "id": "CHECK_FOR_VISUALS_OVERLAP",
  "name": "Check for visuals overlap with a 5px margin",
  "description": "Returns names of visuals that overlap while inflating each rectangle by 5px.",
  "disabled": false,
  "part": "Pages",
  "test": [
    {
      "rectoverlap": [
        {
          "map": [
            {
              "filter": [
                { "part": "Visuals" },
                {
                  "and": [
                    { "!!": [{ "var": "name" }] },
                    {
                      "!": [{
                        "in": [
                          { "var": "visual.visualType" },
                          ["card", "slicer", "actionButton"]
                        ]
                      }]
                    },
                    { ">=": [{ "var": "position.x" }, 0] },
                    { ">=": [{ "var": "position.y" }, 0] },
                    { ">=": [{ "var": "position.width" }, 0] },
                    { ">=": [{ "var": "position.height" }, 0] },
                    { "!": [{ "var": "isHidden" }] }
                  ]
                }
              ]
            },
            {
              "torecord": [
                "name", { "var": "name" },
                "x", { "var": "position.x" },
                "y", { "var": "position.y" },
                "width", { "var": "position.width" },
                "height", { "var": "position.height" }
              ]
            }
          ]
        },
        5
      ]
    },
    []
  ]
}
```

## `strcontains` — count regex matches in a string

Accepts a search string and a regular expression. Returns the count of matches.

```json
{
  "id": "STRCONTAINS",
  "name": "STRCONTAINS",
  "itemtype": "*",
  "test": [
    { "strcontains": ["The quick brown brown fox", "brown"] },
    2
  ]
}
```

Real-world example — find pages with default "Page x" names:

```json
{
  "id": "GIVE_VISIBLE_PAGES_MEANINGFUL_NAMES",
  "name": "Give visible pages meaningful names",
  "description": "Returns an array of visible page names with a default 'Page x' display name.",
  "test": [
    {
      "map": [
        {
          "filter": [
            { "part": "Pages" },
            {
              "and": [
                { "strcontains": [{ "var": "displayName" }, "^Page [1-9]+$"] },
                { "!=": [{ "var": "visibility" }, "HiddenInViewMode"] }
              ]
            }
          ]
        },
        { "var": "displayName" }
      ]
    },
    {},
    []
  ]
}
```

## `symdiff` — symmetric difference of two arrays

Accepts two JSON arrays as non-ordered sets. Returns items in either set but not both.

```json
{
  "id": "SYMDIFF",
  "name": "SYMDIFF",
  "itemtype": "*",
  "test": [
    { "symdiff": [["a", "b", "c", "d"], ["d", "c", "f", "e"]] },
    ["a", "b", "f", "e"]
  ]
}
```

## `torecord` — build a JSON object from key/value pairs

Accepts an array of alternating key/value pairs. Returns a JSON record (object).

```json
{
  "id": "LOCAL_REPORT_SETTINGS",
  "name": "Local report settings",
  "part": "Report",
  "test": [
    {
      "torecord": [
        "isPersistentUserStateDisabled", { "var": "/settings/isPersistentUserStateDisabled" },
        "hideVisualContainerHeader", { "var": "/settings/hideVisualContainerHeader" },
        "useStylableVisualContainerHeader", { "var": "/settings/useStylableVisualContainerHeader" }
      ]
    },
    {
      "isPersistentUserStateDisabled": false,
      "hideVisualContainerHeader": true,
      "useStylableVisualContainerHeader": true
    }
  ]
}
```

## `tostring` — stringify a JSON node

Accepts a JSON node and returns the equivalent stringified JSON.

```json
{
  "id": "TOSTRING",
  "name": "TOSTRING",
  "itemtype": "*",
  "test": [
    { "tostring": [["a", "b", "c", "d"]] },
    "[\"a\",\"b\",\"c\",\"d\"]"
  ]
}
```

## `union` — set union of two arrays

Accepts two JSON arrays as non-ordered sets. Returns their union.

```json
{
  "id": "UNION",
  "name": "UNION",
  "itemtype": "*",
  "test": [
    { "union": [["a", "b", "c", "d"], ["d", "c", "f", "e"]] },
    ["a", "b", "c", "d", "f", "e"]
  ]
}
```

# Rule Creation Tutorial

This section walks through creating rules from scratch, starting simple and building up.

## Simplest Rule

Test that `true` is `true`:

```json
{
  "rules": [
    {
      "id": "SIMPLEST_RULE",
      "name": "Simplest Rule",
      "test": [
        true,
        true
      ]
    }
  ]
}
```

## Simple Operation

Check that `"a"` equals `"a"` using the `==` operator:

```json
{
  "rules": [
    {
      "id": "SIMPLE_OPERATION",
      "name": "Simple Operation",
      "test": [
        { "==": ["a", "a"] },
        true
      ]
    }
  ]
}
```

## Nested Operations

Nest operations — the output of the inner becomes the input of the outer:

```json
{
  "rules": [
    {
      "id": "NESTED_OPERATIONS",
      "name": "Nested operations",
      "test": [
        {
          "if": [
            { "<": [1, 2] },
            "smaller",
            "equalorgreater"
          ]
        },
        "smaller"
      ]
    }
  ]
}
```

## Referencing the Root Fabric Item

Use `{"var": ""}` to reference the root item. If the item is a JSON file, its content is returned; otherwise, metadata about the item is returned.

```json
{
  "rules": [
    {
      "id": "ROOT_FABRIC_ITEM",
      "name": "Root Fabric Item",
      "test": [
        { "var": "" },
        {}
      ]
    }
  ]
}
```

## Power BI Report Rules — Iterative

Use the `part` property at the rule level to iterate over pages. This rule checks each page's display name:

```json
{
  "rules": [
    {
      "id": "ITERATIVE_RULE",
      "name": "Iterative rule",
      "part": "Pages",
      "test": [
        { "var": "displayName" },
        "My page display name"
      ]
    }
  ]
}
```

## Power BI Report Rules — Aggregating

Use the `part` operator **inside** test logic to collect values across all pages into an array:

```json
{
  "rules": [
    {
      "id": "RETURN_PAGE_NAMES",
      "name": "Return page names",
      "test": [
        {
          "map": [
            { "part": "Pages" },
            { "var": "displayName" }
          ]
        },
        ["Page 1", "Page 2", "Page 3"]
      ]
    }
  ]
}
```

## Fabric Item Rules

For non-report items, use a regex in `part` to match files. Folder separators are normalised to `:` for cross-platform compatibility.

```json
{
  "rules": [
    {
      "id": "CHECK_COPYJOB_JOBMODE",
      "name": "Iterate through each CopyJob definition and check that JobMode is Batch.",
      "itemType": "CopyJob",
      "part": "copyjob-content.json",
      "test": [
        { "var": "properties.jobMode" },
        "Batch"
      ]
    }
  ]
}
```

To restrict to a specific subfolder:

```json
"part": "folder1:.*:copyjob-content\\.json$"
```

## Complete Rule with Patch

A full example that checks axes titles on chart visuals and patches them when missing:

```json
{
  "id": "SHOW_AXES_TITLES",
  "name": "Show visual axes titles",
  "description": "Check that certain charts have both axes title showing.",
  "part": "Pages",
  "disabled": true,
  "applyPatch": true,
  "test": [
    {
      "map": [
        {
          "filter": [
            { "part": "Visuals" },
            {
              "and": [
                {
                  "in": [
                    { "var": "visual.visualType" },
                    ["lineChart", "barChart", "columnChart", "clusteredBarChart", "stackedBarChart"]
                  ]
                },
                {
                  "or": [
                    {
                      "==": [
                        { "var": "visual.objects.categoryAxis.0.properties.showAxisTitle.expr.Literal.Value" },
                        "false"
                      ]
                    },
                    {
                      "==": [
                        { "var": "visual.objects.valueAxis.0.properties.showAxisTitle.expr.Literal.Value" },
                        "false"
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        { "var": "name" }
      ]
    },
    {},
    []
  ],
  "patch": [
    "Visuals",
    [
      {
        "op": "replace",
        "path": "/visual/objects/categoryAxis/0/properties/showAxisTitle/expr/Literal/Value",
        "value": "true"
      },
      {
        "op": "replace",
        "path": "/visual/objects/valueAxis/0/properties/showAxisTitle/expr/Literal/Value",
        "value": "true"
      }
    ]
  ]
}
```

## Rule File Examples

For full rule file examples see the PBI-InspectorV2 repository:

- [Power BI Reports Base Rules](https://raw.githubusercontent.com/NatVanG/PBI-InspectorV2/refs/heads/main/Rules/Base-rules.json)
- [Power BI Reports Example Rules](https://raw.githubusercontent.com/NatVanG/PBI-InspectorV2/refs/heads/main/DocsExamples/Examples-rules.json)
- [Fabric CopyJob Rules](https://raw.githubusercontent.com/NatVanG/PBI-InspectorV2/refs/heads/main/DocsExamples/Example-CopyJob-Rules.json)
- [Cross Fabric Item Rule](https://raw.githubusercontent.com/NatVanG/PBI-InspectorV2/refs/heads/main/DocsExamples/Example-FabricCrossItem-Rules.json)
- [Example Rules with Patches](https://raw.githubusercontent.com/NatVanG/PBI-InspectorV2/refs/heads/main/DocsExamples/Example-patches.json)

# Rule Authoring Best Practices

```SudoLang
Constraints {
  Every rule must have a unique id and descriptive name.
  Prefer returning arrays of failing items over simple true/false — makes results actionable.
  Use the part iterator to scope rules to specific report parts or Fabric item files.
  Use data mapping to define JSON Pointer variables that simplify complex test logic.
  Keep test logic focused on a single concern — compose multiple rules for complex checks.
  Use logType "error" for critical issues, "warning" (default) for recommendations.
  Set disabled: true during rule development, then enable when tested.
  Add patches only for Power BI Report parts and only when the fix is deterministic.
  Use strcontains with regex for flexible string matching.
  Use set operators (diff, intersection, union, symdiff, equalsets) for comparing collections.
  Use count to validate array sizes.
  Use query to chain part access with further logic.
  Use path with JSONPath expressions for deep traversal.
  Use partinfo + filesize for non-JSON file checks.
}
```
