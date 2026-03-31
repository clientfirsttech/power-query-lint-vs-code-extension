---
name: fab-inspector
description: PBI Inspector V2 (FabInspector) rule authoring documentation. Use when writing, understanding, or debugging inspection rules for Power BI Reports (PBIR) and other Fabric CI/CD items. Covers rule file structure, the part iterator, test definitions with data mapping and expected results, patch definitions for auto-fixing, all custom PBI Inspector operators, and a step-by-step rule creation tutorial.
user-invokable: false
---

# PBI Inspector V2 — FabInspector Rule Authoring Guide

> Based on the [PBI-InspectorV2 wiki](https://github.com/NatVanG/PBI-InspectorV2/wiki) by Nat Van Gulck.

PBI Inspector V2 uses JsonLogic (written in JSON) to express inspection rules that validate Power BI Report (PBIR) definitions and other Fabric CI/CD item definitions. This skill covers the anatomy of a rule, every custom operator, and a hands-on tutorial for creating rules from scratch.

## Structure of a Rules File

A rules file is JSON. It starts with a `rules` array containing one or more rule objects:

```json
{
  "rules": [
    { /* rule 1 */ },
    { /* rule 2 */ }
  ]
}
```

## Anatomy of a Rule

Each rule object has the following properties:

```json
{
  "id": "UNIQUE_RULE_ID",
  "name": "Human-readable name shown in HTML results with wireframe images",
  "description": "Details to help understand what this rule does",
  "logType": "error|warning(default)",
  "itemType": "Report|CopyJob|Lakehouse|…|*|json",
  "disabled": false,
  "part": "Iterator — see below",
  "test": [
    { /* logic */ },
    { /* optional data mapping */ },
    /* expected result */
  ],
  "patch": [
    "PartName",
    [ /* JSON Patch operations */ ]
  ]
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

If an array of items is matched, the rule is applied **iteratively** to each item.

## Test Definition

A test is an array with two or three items:

```
"test": [
  { logic },
  { optional data mapping },
  expected result
]
```

### Test Logic

The first element is a JsonLogic expression. It can return any JSON value — boolean, string, number, array, or object. While simple `true`/`false` results work, returning an array of failing items (e.g. visual names) is often more useful; the expected result is then an empty array `[]`.

### Data Mapping (Optional)

The second element (when present) provides named variables as literal values or JSON Pointer path expressions (see [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)). If omitted, the test array has only two items: logic and expected result.

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

A rule can optionally define a `patch` to auto-fix failing items. Currently only Power BI Report parts are supported.

```json
"patch": [
  "Visuals",
  [
    { "op": "replace", "path": "/visual/objects/categoryAxis/0/properties/showAxisTitle/expr/Literal/Value", "value": "true" },
    { "op": "replace", "path": "/visual/objects/valueAxis/0/properties/showAxisTitle/expr/Literal/Value", "value": "true" }
  ]
]
```

Structure:

```
"patch": [
  "PartName",
  [ JSON Patch operations ]
]
```

`PartName` is one of the reserved Power BI part names (e.g. `Report`, `Visuals`, `Pages`). The operations follow the JSON Patch specification ([RFC 6902](https://tools.ietf.org/html/rfc6902)).

When using a patch, add `"applyPatch": true` to the rule object.

# PBI Inspector Custom Operators

PBI Inspector adds the following operators beyond those provided by the JsonLogic library.

## `count`

Counts the number of items in an array.

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

Nested example — filter entities that have locally defined measures:

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

## `diff`

Accepts two JSON arrays, treats them as non-ordered sets, and returns the set difference (items in the first set but not the second).

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

## `drillvar`

Accepts a JSON pointer string and parses stringified JSON on the right of a `>` character. This operator was needed in V1 of PBI Inspector due to escaped JSON in `report.json`. It is less relevant for V2 but still useful for querying escaped JSON such as in Deneb custom visual definitions.

## `equalsets`

Accepts two JSON arrays, treats them as non-ordered sets, and returns `true` if they are equal.

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

## `filesize`

Returns the file size in bytes. Accepts either a file path string or the output of a `partinfo` operator.

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

## `filetextsearchcount`

Takes two parameters: a file path (or `partinfo` output) and a regular expression pattern. Returns the number of regex matches in the file.

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

## `intersection`

Accepts two JSON arrays, treats them as non-ordered sets, and returns their intersection.

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

## `part`

Returns the file content of a Fabric CI/CD item. For Power BI Reports, use the reserved part names listed in [Part Iterator](#reserved-part-names-power-bi-reports--case-sensitive). For other items, supply a regex to match file paths.

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

## `partinfo`

Similar to `part` but returns **metadata** about the part instead of its content.

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

## `path`

Provides the ability to define a JSONPath expression to query the context JSON. Uses the [JsonPath.Net](https://docs.json-everything.net/path/basics/) implementation (see [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535.html)).

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

## `query`

Accepts a JSON node object and an operator to apply to it. Useful for querying a part and applying further logic.

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

## `rectoverlap`

Accepts a JSON array of rectangle records (with `name`, `x`, `y`, `width`, `height` properties) and an optional margin width. Returns an array of overlapping rectangle names (inflated by the margin).

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

## `strcontains`

Accepts a search string and a regular expression. Returns the count of regex matches in the string.

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

## `symdiff`

Accepts two JSON arrays, treats them as non-ordered sets, and returns their symmetric difference (items in either set but not both).

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

## `torecord`

Accepts an array of key/value pairs. Returns a JSON record (object).

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

## `tostring`

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

## `union`

Accepts two JSON arrays, treats them as non-ordered sets, and returns their union.

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

Nest operations so the output of the inner becomes the input of the outer:

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
