---
name: pbir-report-authoring
description: Guide to develop Power BI Reports in PBIR format. Use for any development operation against a Power BI Report PBIR file format including creating new reports on top of semantic models, editing visuals/pages/bookmarks, aligning and laying out visuals, rebinding reports to different semantic models, deploying reports to Fabric workspaces, and exporting reports from workspaces.
user-invokable: false
---

# Power BI Report (PBIR) Authoring Skill

> Based on work by [RuiRomano](https://github.com/RuiRomano/powerbi-agentic-plugins/blob/main/plugins/powerbi/skills/powerbi-report-authoring/SKILL.md), licensed under the [MIT License](https://github.com/RuiRomano/powerbi-agentic-plugins/blob/main/LICENSE).

You are an expert in Power BI report development using the PBIR (Power BI Report) JSON file format. You create, edit, validate, and deploy PBIR reports fluently.

```SudoLang
PBIRReportAuthoring {
  Constraints {
    Schema-aware: validate JSON against the declared $schema; call out violations and propose fixes.
    Understand the PBIP file structure.
    This skill handles report layout, visuals, and pages only.
    Use powerbi-semantic-model skill for semantic model development (tables, measures, DAX).
  }
}
```

## Pre-development: Understand the Report

Before making any changes to an existing report, always gather context first:

```SudoLang
fn preDevDiscovery(reportPath) {
  Constraints {
    Verify PBIR format — confirm the report has a definition/ folder with report.json, pages/, and version.json.
    List all pages — read pages/pages.json to understand page structure and order.
    List visuals per page — for each page, list visual folders and read each visual.json to understand types, positions, and field mappings.
    Identify the semantic model — read definition.pbir to find which semantic model the report connects to (byPath or byConnection).
    Check theme and resources — review StaticResources/RegisteredResources/ for custom themes and images.
  }
}
```

## PBIR File Format

Example of a report folder using `PBIR` format:

```text
Report/
├── StaticResources/
│   ├── RegisteredResources/
│   │   ├── logo.jpg
│   │   ├── CustomTheme4437032645752863.json
├── definition/
│   ├── bookmarks/
│   │   ├── Bookmark7c19b7211ada7de10c30.bookmark.json
│   │   ├── bookmarks.json
│   ├── pages/
│   │   ├── 61481e08c8c340011ce0/
│   │   │   ├── visuals/
│   │   │   │   ├── 3852e5607b224b8ebd1a/
│   │   │   │   │   ├── visual.json
│   │   │   │   │   ├── mobile.json
│   │   │   │   ├── 7df3763f63115a096029/
│   │   │   │   │   ├── visual.json
│   │   │   ├── page.json
│   │   ├── pages.json
│   ├── version.json
│   ├── report.json
├── semanticModelDiagramLayout.json
└── definition.pbir
```

```SudoLang
interface PBIRFileStructure {
  StaticResources/RegisteredResources/ — stores report resources (images, custom themes)
  definition/ — stores entire report definition: pages, visuals, bookmarks
  definition.pbir — overall definition and core settings; holds semantic model reference; rebind by updating this file
  semanticModelDiagramLayout.json — copy of the connected semantic model diagram layout
}
```

## Name Property

All report objects have a `name` property. By default PBIR uses the internal `name` in files and folders. For example:

`Sales.Report/definition/pages/89a9619c7025093ade1c/visuals/5acb1caf298449a8acb4/visual.json`

`89a9619c7025093ade1c` is the page name and `5acb1caf298449a8acb4` is the visual name.

Example `visual.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.1.0/schema.json",
  "name": "5868707ac858bcbe007a",
  "position": {
    "x": 32.118081180811807,
    "y": 216.32472324723247,
    "z": 4000,
    "height": 492.16236162361622,
    "width": 366.52398523985238,
    "tabOrder": 2000
  },
  "visual": {
    "visualType": "barChart",
    "drillFilterOtherVisuals": true
  }
}
```

## Task: Create New Report on Top of Semantic Model

```SudoLang
fn createReport(semanticModel) {
  Constraints {
    Understand the semantic model — its tables, key measures, dimensions, and date/calendar table.
    Create or reuse PBIP folder structure.
    Copy template files for report/definition and report/StaticResources.
    Configure the semantic model reference in definition.pbir (byPath for local, byConnection for workspace).
    Adapt visuals to the semantic model — map each visual to semantic model fields.
    Run post-development validation.
  }
}
```

### Adapting Template Visuals

When adapting a template report to a semantic model, edit each visual's `visual.json`:

- **title** — set a descriptive report title in the `textRun` value:

```json
{
  "visual": {
    "visualType": "textbox",
    "objects": {
      "general": [{
        "properties": {
          "paragraphs": [{
            "textRuns": [{
              "value": "[Report Title]"
            }]
          }]
        }
      }]
    }
  }
}
```

- **topCard** — add main semantic model measures (max 4) using Measure field projections:

```json
{
  "visual": {
    "query": {
      "queryState": {
        "Data": {
          "projections": [{
            "field": {
              "Measure": {
                "Expression": { "SourceRef": { "Entity": "[table name]" } },
                "Property": "[measure name]"
              }
            },
            "queryRef": "[table name].[measure name]",
            "nativeQueryRef": "[measure name]"
          }]
        }
      }
    }
  }
}
```

- **dateSlicer** — add the date column from the Calendar table (only one column) using Column field:

```json
{
  "visual": {
    "query": {
      "queryState": {
        "Values": {
          "projections": [{
            "field": {
              "Column": {
                "Expression": { "SourceRef": { "Entity": "[table name]" } },
                "Property": "[column name]"
              }
            },
            "queryRef": "[table name].[column name]",
            "nativeQueryRef": "[column name]",
            "active": true
          }]
        }
      }
    }
  }
}
```

- **barChart** — add a main category column to Category and the main measure to Y axis:

```json
{
  "visual": {
    "query": {
      "queryState": {
        "Category": {
          "projections": [{
            "field": {
              "Column": {
                "Expression": { "SourceRef": { "Entity": "[table name]" } },
                "Property": "[column name]"
              }
            },
            "queryRef": "[table name].[column name]",
            "nativeQueryRef": "[column name]",
            "active": true
          }]
        },
        "Y": {
          "projections": [{
            "field": {
              "Measure": {
                "Expression": { "SourceRef": { "Entity": "[table name]" } },
                "Property": "[measure name]"
              }
            },
            "queryRef": "[table name].[measure name]",
            "nativeQueryRef": "[measure name]"
          }]
        }
      }
    }
  }
}
```

- **timeSeries** — add a date field from Calendar table to Category and the main measure to Y axis (same structure as barChart).

## Task: Edit an Existing Report

```SudoLang
fn editReport(reportPath, userRequest) {
  Constraints {
    Locate the report — determine source (PBIP folder or export from workspace) and access the PBIR files.
    Run pre-development discovery.
    Plan changes — identify which files need to be created, edited, or removed.
    Execute changes:
      Adding visuals: create a new folder under the page's visuals/ directory with a visual.json file using correct $schema, position, visual.visualType, and field mappings.
      Editing visuals: modify the visual.json — update field mappings, position, or visual type.
      Adding pages: create a new page folder under pages/, add a page.json, and update pages/pages.json with the new page entry.
      Removing objects: delete the folder/file and update parent index files (e.g., pages.json, bookmarks.json).
    Run post-development validation.
  }
}
```

## Task: Align Power BI Report Visuals

```SudoLang
fn alignVisuals(reportPath) {
  Constraints {
    Verify PBIR format — confirm there is a definition/ folder with report pages.
    For each page:
      Inspect all visual.json files — read position property (x, y, height, width, z, tabOrder) and page dimensions (default 1280x720) in page.json.
      Build a wireframe — map out each visual's position and dimensions.
      Infer the layout grid — identify rows and columns; group visuals by similar y (rows) and x (columns).
      Apply consistent alignment:
        Ensure even horizontal and vertical distribution across rows and columns.
        If a row has only one visual, expand its width to fill the row.
        Make all visuals in the same row have the same height and width when possible.
      Update position values — edit each visual.json with corrected position properties.
  }
}
```

## Task: Rename Folders to Improve Readability

```SudoLang
fn renameFolders(targetObjects) {
  Constraints {
    The internal name property is used by default in folder and file names.
    You can rename folders for: pages, visuals, and bookmarks.
    Change folder name to a human-readable name (e.g., mainPage, salesBarChart, dateFilter).
    Internal name property in JSON files remains unchanged — only the folder name changes.
    Verify no other files reference the old folder name.
  }
}
```

## Task: Export a Report from Workspace

```SudoLang
fn exportReport(workspaceId, reportId, localPath) {
  Constraints {
    Create PBIP folder structure.
    Use fabric-cli to export the report code definition from the workspace.
    Place exported definition into [Name].Report/definition/ folder.
    Verify the exported folder contains report.json, version.json, and pages/ with at least one page.
  }
}
```

## Task: Import/Deploy a Report to a Workspace

```SudoLang
fn deployReport(reportPath, workspaceId, semanticModelId) {
  Constraints {
    CRITICAL: definition.pbir must use byConnection configuration targeting a workspace semantic model.
    Use fabric-cli to deploy; can deploy with a new name if needed.
    Verify the report appears in the target workspace and opens correctly.
  }
}
```

`definition.pbir` for workspace deployment:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  "version": "4.0",
  "datasetReference": {
    "byConnection": {
      "connectionString": "semanticmodelid=[SemanticModelId]"
    }
  }
}
```

## Task: Rebind Report to a Different Semantic Model

### Target is a Local PBIP Folder

Edit `definition.pbir` with `byPath` using a relative reference:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  "version": "4.0",
  "datasetReference": {
    "byPath": {
      "path": "../Sales.SemanticModel"
    }
  }
}
```

### Target is in a Fabric Workspace

Find the semantic model ID, then edit `definition.pbir` with `byConnection`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  "version": "4.0",
  "datasetReference": {
    "byConnection": {
      "connectionString": "semanticmodelid=[SemanticModelId]"
    }
  }
}
```

After rebinding, verify that visual field mappings (`Entity` and `Property` references in `visual.json` files) are still valid against the new semantic model.

## Post-development: Validate Changes

```SudoLang
fn postDevValidation(reportPath) {
  Constraints {
    Validate file structure — ensure all required files and folders are present and correctly named.
    Validate JSON schemas — ensure all edited JSON files are valid against their declared $schema URL.
    Check visual field mappings — verify Entity (table name) and Property (column/measure name) references match the connected semantic model.
    Verify page index — confirm pages/pages.json lists all page folders with correct order.
    Check visual positions — ensure no overlapping visuals and positions make sense within page dimensions.
    Validate definition.pbir — confirm semantic model reference (byPath or byConnection) is correctly configured.
  }
}
```

## Error Handling

```SudoLang
match (error) {
  case "Invalid JSON schema" => read the $schema URL, validate structure against it, fix missing or extra properties
  case "Broken field references" => update Entity and Property values to match valid semantic model objects
  case "Deployment failure" => verify definition.pbir uses byConnection (not byPath) for workspace; check semantic model ID
  case "Missing pages or visuals after export" => verify export completed fully; re-export if pages/ folder missing subfolders
  case "Template adaptation issues" => verify field mappings use exact table and measure names from semantic model (case-sensitive)
}
```

## References

- [PBIR docs](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report?tabs=v2%2Cdesktop#pbir-format)
