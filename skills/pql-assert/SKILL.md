---
name: pql-assert
version: 1.2.1
description: PQL.Assert DAX unit testing library documentation. Use when writing, understanding, or debugging DAX-based unit tests for Power BI and Analysis Services semantic models. Covers assertion functions for values, columns, tables, relationships, best practices, test discovery, environment governance, and function name validation against reserved DAX words.
user-invocable: false
---

# PQL.Assert

Act as a semantic model test engineer writing DAX unit tests with the PQL.Assert library for Power BI and Analysis Services. PQL.Assert provides standardized assertion functions that validate data, calculations, and model integrity.

Current version: **PQL.Assert 0.7.0** ([DAX Lib](https://daxlib.org/package/PQL.Assert/)). Install it from DAX Lib, or load [`functions.tmdl`](references/functions.tmdl) (in this extension's `skills/pql-assert/references/` folder) into the semantic model and refresh.

Competencies {
  writing atomic DAX assertions for values, columns, tables, relationships, perspectives, partitions, and OLS
  organizing tests by environment (DEV, TEST, PROD, ANY)
  discovering and running tests, including RLS / OLS impersonation
  model health checks with PQL.Assert.BP
  validating user-defined function names against reserved DAX words
}

Constraints {
  Every standard test function returns the 4-column schema (TestName, Expected, Actual, Passed).
  Never UNION `PQL.Assert.BP` results with standard `PQL.Assert` results. BP returns 5 columns (adds RuleDescription); mixing them is a runtime error. BP functions may be UNIONed with each other.
  Keep BP runners in dedicated functions that contain only BP calls, and keep standard runners free of BP calls.
  Name test functions `[name].[environment].Tests` (`.Test` for a single assertion). Keep `[name]` to 15-20 characters.
  Keep tests focused and atomic: one thing per assertion, with a descriptive test name.
  Include "should pass" or "should fail" in a test name when you want automatic validation of expectations.
  Every dot-separated segment of a test function name must not be a reserved DAX word (case-insensitive). `Calculations.DEV.Tests` fails to parse because `Calculations` is reserved; use `Metrics.DEV.Tests`. Check with validateFunctionName BEFORE writing any file.
  A DAX query (a `.dax` file or a DAX Query View tab) contains only DAX. Never put TMDL-only lines in one: `lineageTag`, `annotation ...`, `description`, or `///` doc comments. They belong in `definition/functions.tmdl` only. Pasting them into a query fails with `The syntax for 'lineageTag' is incorrect`.
  Follow the `semantic-model-authoring` skill (`references/tmdl-guidelines.md`) for any TMDL you write; where this skill's TMDL example differs, those guidelines win.
  When the test function is persisted in the model (`functions.tmdl`), the query tab only calls it: `EVALUATE <Name>()`. Do not also `DEFINE FUNCTION` the same name in the tab.
  When the column ref parameter is a column, pass a column reference (`'Table'[Column]`); when it says tableName / columnName, pass strings.
  Pass `""` (or omit) for optional parameters you do not want checked.
}

## Interfaces

TestResult {
  TestName: String   // description of the test being conducted
  Expected: Any      // what the test should result in (hardcoded value or Boolean)
  Actual: Any        // the result under the current dataset
  Passed: Boolean    // true if expected matches actual
}

BPResult extends TestResult {
  RuleDescription: String
}

Environment {
  DEV   // static or parameterized data, known baseline; calculation and logic validation
  TEST  // live data for stakeholder validation; content and schema validation
  PROD  // live production data; health checks and data drift detection
  ANY   // applies to all environments
  // custom environments (UAT, STAGING, ...) are supported: RetrieveTestsByEnvironmentV2("UAT") returns .UAT. and .ANY. tests
}

TestCategories {
  // which environments each category belongs in
  calculations: [DEV]            // measures, calculated columns, edge cases
  content: [DEV, TEST, PROD]     // row counts, data quality, value validation
  schema: [DEV, TEST, PROD]      // table/column existence, relationships, data types
}

DiscoveredTest {
  Name
  Description
  PQLAssert_ImpersonatedUserName // non-blank => run with EffectiveUserName (RLS)
  PQLAssert_RoleName             // non-blank => run under this role (OLS / RLS)
}

## Function Catalog

Signatures use `(testName, ...)`. The first argument is always the test name.

Basic {
  PQL.Assert.ShouldBeTrue(testName, actualCondition)
  PQL.Assert.ShouldBeFalse(testName, actualCondition)
  PQL.Assert.ShouldBeNull(testName, actualValue)            // BLANK()
  PQL.Assert.ShouldNotBeNull(testName, actualValue)
  PQL.Assert.ShouldBeBlank(testName, actualValue)           // empty string ""
  PQL.Assert.ShouldNotBeBlank(testName, actualValue)
  PQL.Assert.ShouldBeNullOrBlank(testName, actualValue)
  PQL.Assert.ShouldNotBeNullOrBlank(testName, actualValue)
}

Equality {
  PQL.Assert.ShouldEqual(testName, expected, actual)
  PQL.Assert.ShouldNotEqual(testName, notExpected, actual)
  PQL.Assert.ShouldEqualExactly(testName, expected, actual) // case-sensitive string equality
}

Numeric {
  PQL.Assert.ShouldBeGreaterThan(testName, threshold, actual)
  PQL.Assert.ShouldBeLessThan(testName, threshold, actual)
  PQL.Assert.ShouldBeGreaterOrEqual(testName, threshold, actual)
  PQL.Assert.ShouldBeLessOrEqual(testName, threshold, actual)
  PQL.Assert.ShouldBeBetween(testName, lowerBound, upperBound, actual)
}

String {
  PQL.Assert.ShouldStartWith(testName, prefix, actual)
  PQL.Assert.ShouldEndWith(testName, suffix, actual)
  PQL.Assert.ShouldContainString(testName, substring, actual)
  PQL.Assert.ShouldMatch(testName, pattern, actual)
}

Column.NullAndBlank {
  PQL.Assert.Col.ShouldBeNull(testName, columnRef)               // all values NULL
  PQL.Assert.Col.ShouldNotBeNull(testName, columnRef)
  PQL.Assert.Col.ShouldBeBlank(testName, columnRef)              // all values empty strings
  PQL.Assert.Col.ShouldNotBeBlank(testName, columnRef)
  PQL.Assert.Col.ShouldBeNullOrBlank(testName, columnRef)
  PQL.Assert.Col.ShouldNotBeNullOrBlank(testName, columnRef)
}

Column.Completeness {
  PQL.Assert.Col.NullRateShouldBeAtMost(testName, columnRef, maxNullPct)
  PQL.Assert.Col.BlankRateShouldBeAtMost(testName, columnRef, maxBlankPct)
  PQL.Assert.Col.NullOrBlankRateShouldBeAtMost(testName, columnRef, maxPct)
  PQL.Assert.Col.PopulatedRateShouldBeAtLeast(testName, columnRef, minPct) // non-null, non-blank
}

Column.Uniqueness {
  PQL.Assert.Col.ShouldBeDistinct(testName, columnRef)
  PQL.Assert.Col.ShouldNotContainDuplicates(testName, columnRef)  // alias for ShouldBeDistinct
  PQL.Assert.Col.ShouldBeUniqueWithin(testName, columnRef, partitionByCol)
  PQL.Assert.Col.ComboShouldBeDistinct(testName, columnRef1, columnRef2) // composite key
}

Column.RangeAndDistribution {
  PQL.Assert.Col.ShouldBeInRange(testName, columnRef, minIncl, maxIncl)
  PQL.Assert.Col.MinShouldBeAtLeast(testName, columnRef, minIncl)
  PQL.Assert.Col.MaxShouldBeAtMost(testName, columnRef, maxIncl)
  PQL.Assert.Col.MeanShouldBeInRange(testName, columnRef, minIncl, maxIncl)
  PQL.Assert.Col.PctileShouldBeInRange(testName, columnRef, pct, minIncl, maxIncl)
  PQL.Assert.Col.StdDevShouldBeAtMost(testName, columnRef, maxStdDev)
  PQL.Assert.Col.ShareOfZerosAtMost(testName, columnRef, maxPct)
  PQL.Assert.Col.ShareOfEvensAtLeast(testName, columnRef, minPct)
  PQL.Assert.Col.ShareOfOddsAtLeast(testName, columnRef, minPct)
}

Column.SignAndMonotonicity {
  PQL.Assert.Col.ShouldBeNonNegative(testName, columnRef)  // >= 0
  PQL.Assert.Col.ShouldBePositive(testName, columnRef)     // > 0
  PQL.Assert.Col.ShouldBeNonZero(testName, columnRef)
  PQL.Assert.Col.ShouldBeMonotonicIncreasing(testName, columnRef, orderedByCol)    // strictly increasing
  PQL.Assert.Col.ShouldBeMonotonicNonDecreasing(testName, columnRef, orderedByCol)
  PQL.Assert.Col.ShouldBeMonotonicDecreasing(testName, columnRef, orderedByCol)    // strictly decreasing
}

Column.CategoricalAndFormat {
  // model-independent: allowed / banned values name their table and column explicitly
  PQL.Assert.Col.ValuesShouldBeInSet(testName, columnRef, allowedValuesTable, allowedValuesColumn)
  PQL.Assert.Col.ValuesShouldNotBeInSet(testName, columnRef, bannedValuesTable, bannedValuesColumn)
  PQL.Assert.Col.DistinctCountShouldBeAtMost(testName, columnRef, maxDistinct)
  PQL.Assert.Col.DistinctCountShouldBeAtLeast(testName, columnRef, minDistinct)
  PQL.Assert.Col.TextShouldHaveNoLeadingOrTrailingSpaces(testName, columnRef)
  PQL.Assert.Col.TextShouldBeTrimmed(testName, columnRef)  // alias
  PQL.Assert.Col.TextCaseShouldBeUpper(testName, columnRef)
  PQL.Assert.Col.TextCaseShouldBeLower(testName, columnRef)
  PQL.Assert.Col.TextLengthShouldBeInRange(testName, columnRef, minLen, maxLen)
}

Column.TextPattern {
  // optional trailing matchCase: "Y" | "YES" | "TRUE" | "1" => case-sensitive; default "" => case-insensitive. Blank values are ignored.
  PQL.Assert.Col.ShouldStartWith(testName, columnRef, prefix [, matchCase])
  PQL.Assert.Col.ShouldNotStartWith(testName, columnRef, prefix [, matchCase])
  PQL.Assert.Col.ShouldEndWith(testName, columnRef, suffix [, matchCase])
  PQL.Assert.Col.ShouldNotEndWith(testName, columnRef, suffix [, matchCase])
  PQL.Assert.Col.ShouldContainString(testName, columnRef, substring [, matchCase])
  PQL.Assert.Col.ShouldNotContainString(testName, columnRef, substring [, matchCase])
}

Column.SchemaAndExistence {
  PQL.Assert.Col.ShouldExist(testName, tableName, columnName)
  PQL.Assert.Col.IsAvailableInMDX(testName, tableName, columnName) // prevents Analyze in Excel problems; returns an extra IsMDXActive column
}

Table {
  PQL.Assert.Tbl.ShouldHaveRows(testName, tableRef)
  PQL.Assert.Tbl.ShouldHaveRowCount(testName, tableRef, expectedRowCount)
  PQL.Assert.Tbl.ShouldHaveMoreRowsThan(testName, threshold, tableToCheck)
  PQL.Assert.Tbl.ShouldExist(testName, tableName)
  // The next three take the table as a STRING name, e.g. "Sales" (not 'Sales' or a table expression).
  // The library parameter is still called tableRef in 0.7.0; it was renamed tableName in 0.7.1.
  PQL.Assert.Tbl.ShouldHaveColumns(testName, tableName, columnNamesList)                  // comma-separated
  PQL.Assert.Tbl.ShouldNotHaveExtraColumns(testName, tableName, allowedColumnNamesList)   // comma-separated
  PQL.Assert.Tbl.ColumnDataTypeShouldBe(testName, tableName, columnName, expectedType)
}

Relationship {
  PQL.Assert.Relationship.ShouldExist(testName, fromTable, fromColumn, toTable, toColumn
    [, fromCardinality [, toCardinality [, securityFilteringBehavior]]])
  // fromCardinality / toCardinality: "One" | "Many"
  // securityFilteringBehavior: "OneDirection" | "BothDirections"
}

Perspective {
  PQL.Assert.Perspective.ShouldExist(testName, perspectiveName)
  PQL.Assert.Perspective.ShouldContain(testName, perspectiveName, expectedTablesList, expectedColumnsList, expectedMeasuresList)
  PQL.Assert.Perspective.ShouldMatchSchema(testName, perspectiveName, expectedTablesList, expectedColumnsList, expectedMeasuresList) // exactly these, no extras
  // lists are comma-separated; pass "" for object types not being checked
}

Partitions {
  PQL.Assert.Partitions.ShouldExist(testName, tableName, partitionName)
  PQL.Assert.Partitions.ShouldBe(testName, tableName, expectedPartitionCount)
  PQL.Assert.Partitions.ShouldBeAtLeast(testName, tableName, minPartitionCount)
}

OLS {
  // Rely on the current role context. Run with Modeling > Security > View as, or via MCP with EffectiveUserName / RoleName.
  PQL.Assert.OLS.TableShouldBeHidden(testName, tableName)             // metadataPermission: none
  PQL.Assert.OLS.TableShouldBeVisible(testName, tableName)
  PQL.Assert.OLS.ColumnShouldBeHidden(testName, tableName, columnName) // columnPermission: none
  PQL.Assert.OLS.ColumnShouldBeVisible(testName, tableName, columnName)
}

Discovery {
  // Use INFO.USERDEFINEDFUNCTIONS and INFO.ANNOTATIONS: NOT compatible with the Power Automate "Execute Dataset Query" action.
  PQL.Assert.RetrieveTestsV2()                        // all tests with DiscoveredTest columns
  PQL.Assert.RetrieveTestsByEnvironmentV2(environment) // matches .{ENV}. or .ANY.; case-insensitive; blank returns all
}

BestPractices {
  // 5-column BPResult schema. Never UNION with standard assertions. More rules are added continuously.
  ErrorPrevention {
    PQL.Assert.BP.ShouldHaveSameDataTypeInRelationships() // avoid int64 -> decimal relationships
    PQL.Assert.BP.CheckErrorPrevention()                  // runs all
  }
  Formatting {
    PQL.Assert.BP.ShouldProvideFormatStringForMeasures()
    PQL.Assert.BP.ShouldNotSummarizeNumericColumns()      // SummarizeBy = None
    PQL.Assert.BP.ShouldMarkRowLabels()                   // IsDefaultLabel; helps Copilot find primary identifiers
    PQL.Assert.BP.ShouldMarkPrimaryKeys()                 // IsKey on the "One" side of relationships
    PQL.Assert.BP.ShouldHideFactTableColumns()            // numeric columns used in aggregation measures
    PQL.Assert.BP.CheckFormatting()
  }
  DAXExpressions {
    PQL.Assert.BP.ShouldUseFullyQualifiedColumnReferences() // Table[Column]
    PQL.Assert.BP.ShouldUseTreatAsInsteadOfIntersect()
    PQL.Assert.BP.CheckDAXExpressions()
  }
  Maintenance {
    PQL.Assert.BP.ShouldRemoveUnnecessaryMeasures()       // hidden and unreferenced
    PQL.Assert.BP.ShouldHaveObjectDescriptions()
    PQL.Assert.BP.ShouldRemoveUnnecessaryColumns()        // hidden and unreferenced by DAX, relationships, hierarchies, Sort By
    PQL.Assert.BP.CheckMaintenance()
  }
  Performance {
    PQL.Assert.BP.ShouldAvoidBiDirectionalOnHighCardinalityColumn() // > 1M distinct values
    PQL.Assert.BP.ShouldRemoveAutoDateTable()
    PQL.Assert.BP.ShouldAvoidFloatingPointDataTypes()     // avoid Number (Double)
    PQL.Assert.BP.ShouldSetIsAvailableInMdxFalseOnNonAttributeColumns()
    PQL.Assert.BP.CheckPerformance()
  }
}

## Where Test Code Lives

TestForm {
  inline: a DAX Query View tab with `DEFINE FUNCTION <Name> = () => ...` followed by `EVALUATE <Name>()`. Pure DAX. Good for trying an idea. Not discoverable by RetrieveTests* or live pql-test discovery, because the function is not in the model.
  persisted: the function is defined in the model, in `definition/functions.tmdl` using TMDL syntax. A query tab only calls it with `EVALUATE <Name>()`. This is what RetrieveTestsV2 and live pql-test discovery find; `*.Tests.dax` files are an offline fallback.
}

Syntax {
  TMDL only (valid in functions.tmdl, invalid in a DAX query): `function 'Name' =` header, `lineageTag`, `annotation ...` (for example `annotation PQLAssert_Environment = ANY`), `description`, `///` doc comments
  DAX only (valid in a query, invalid in functions.tmdl): `DEFINE FUNCTION`, `EVALUATE`
}

checkTestFile(text) => cleanText {
  1. text contains `lineageTag`, `annotation`, or `///` lines => remove them; they belong in functions.tmdl only (and new functions should not have `lineageTag` at all)
  2. text has `DEFINE FUNCTION <Name>` and `<Name>` is already persisted in functions.tmdl => delete the DEFINE block and keep `EVALUATE <Name>()`
  3. validateFunctionName(<Name>)
  4. the call is written without quotes: `EVALUATE Schema.ANY.Tests()`
}

Persisted function in `definition/functions.tmdl` (TMDL). Indent with tabs: the expression (`() =>` and the body) two tabs in, properties like `annotation` exactly one tab in, and no `lineageTag` on new functions. A property indented the same as the expression is folded into the body and the function loads in a SemanticError state:

```tmdl
function 'Schema.ANY.Tests' =
		() =>
			UNION(
				PQL.Assert.Tbl.ShouldExist("Sales table exists", "Sales")
			)

	annotation PQLAssert_Environment = ANY
	annotation PQLAssert_Category = Schema
```

The matching query tab (DAX), containing only the call:

```dax
EVALUATE Schema.ANY.Tests()
```

## Writing Tests

writeTest(request) => testFunction {
  1. Pick the category: (calculation logic) => DEV; (content / data quality) => any; (schema) => any
  1b. Choose the TestForm: persisted (recommended, discoverable) or inline (quick experiment)
  2. Name it `[name].[environment].Tests`, then validateFunctionName(name) before writing anything
  3. Compose atomic assertions with UNION (standard schema only)
  4. Persisted => put the function in functions.tmdl (TMDL) and a tab with only `EVALUATE <name>()`; inline => `DEFINE FUNCTION` plus `EVALUATE <name>()` in one tab, with no TMDL lines
  5. checkTestFile(text) on every query text you produce
}

The examples below use the inline form (pure DAX, ready to paste into a DAX Query View tab).

Calculation logic in DEV:

```dax
DEFINE
	FUNCTION BusinessLogic.DEV.Tests = () =>
	UNION (
		PQL.Assert.ShouldEqual("Revenue calculation with positive sales", 15000, [Total Revenue]),
		PQL.Assert.ShouldEqual("Revenue calculation with zero sales", 0, [Total Revenue Zero Case]),
		PQL.Assert.ShouldBeNull("Revenue calculation with blank sales", [Total Revenue Blank Case])
	)

EVALUATE BusinessLogic.DEV.Tests()
```

Content in any environment:

```dax
DEFINE
	FUNCTION DataContent.ANY.Tests = () =>
	UNION (
		PQL.Assert.Tbl.ShouldHaveRows("Fact table has data", 'Sales'),
		PQL.Assert.Col.ShouldNotBeNull("Customer ID not null", 'Customers'[CustomerID]),
		PQL.Assert.Col.ShouldBeDistinct("Customer ID should be unique", 'Customers'[CustomerID]),
		PQL.Assert.Col.ShouldStartWith("SKU should start with 'SKU-'", 'Products'[SKU], "SKU-", "Y"),
		PQL.Assert.ShouldBeBetween("Order amount in valid range", 0, 1000000, MAX('Orders'[Amount]))
	)

EVALUATE DataContent.ANY.Tests()
```

Schema in any environment:

```dax
DEFINE
	FUNCTION Schema.ANY.Tests = () =>
	UNION (
		PQL.Assert.Tbl.ShouldExist("Sales table exists", "Sales"),
		PQL.Assert.Tbl.ShouldHaveColumns("Sales has key columns", "Sales", "OrderID,Amount"),
		PQL.Assert.Tbl.ColumnDataTypeShouldBe("OrderID is integer", "Sales", "OrderID", "Integer"),
		PQL.Assert.Col.ShouldExist("Customer ID column exists", "Customers", "CustomerID"),
		PQL.Assert.Relationship.ShouldExist("Sales-Customer is Many-to-One, single direction",
			"Sales", "CustomerID", "Customers", "CustomerID", "Many", "One", "OneDirection")
	)

EVALUATE Schema.ANY.Tests()
```

Measures with filter context (DEV):

```dax
DEFINE
	FUNCTION Measures.DEV.Tests = () =>
	VAR __DS0FilterTable = TREATAS({TRUE}, 'TestData'[IsActive])
	VAR _Test1 =
		SUMMARIZECOLUMNS(
			__DS0FilterTable,
			"CountID", IGNORE(CALCULATE(COUNTA('TestData'[ID])))
		)
	RETURN PQL.Assert.ShouldEqual("ShouldBeEqual to 3", 3, _Test1)

EVALUATE Measures.DEV.Tests()
```

Perspective and partition checks:

```dax
EVALUATE PQL.Assert.Perspective.ShouldContain(
    "Finance perspective should contain core objects", "Finance",
    "Sales,Customers,Products",       // tables
    "Sales[Amount],Sales[OrderDate]", // columns
    "Sales[Total Sales]"              // measures
)
EVALUATE PQL.Assert.Partitions.ShouldBe("Sales has two partitions", "Sales", 2)
```

OLS role (TMDL) and runner:

```tmdl
role West
    modelPermission: read

    tablePermission 'Admin Table' = none

    tablePermission 'Hidden Column Table' = read
        columnPermission 'Hidden Column' = none
```

```dax
DEFINE
    FUNCTION OLS_West.ANY.Tests = () =>
    UNION(
        PQL.Assert.OLS.TableShouldBeHidden("West: Admin Table should be hidden", "Admin Table"),
        PQL.Assert.OLS.ColumnShouldBeHidden("West: Hidden Column should be hidden", "Hidden Column Table", "Hidden Column"),
        PQL.Assert.OLS.TableShouldBeVisible("West: Groups table should be visible", "Groups")
    )

EVALUATE OLS_West.ANY.Tests()
```

## Discovering and Running Tests

discoverAndRun(environment) => results {
  1. tests = `EVALUATE PQL.Assert.RetrieveTestsByEnvironmentV2("<environment>")` // blank => all tests; case-insensitive
  2. for each (test in tests) executeTest(test)
  3. Report results; keep BP results separate from standard results
}

executeTest(test) {
  test.PQLAssert_ImpersonatedUserName is non-blank => `EVALUATE <Name>()` with EffectiveUserName = that value (RLS evaluated as that user)
  test.PQLAssert_RoleName is non-blank => `EVALUATE <Name>()` with RoleName = that value (OLS / RLS rules applied)
  otherwise => `EVALUATE <Name>()` normally

  Constraints {
    In the MCP context, use `dax_query_operations` with EffectiveUserName and/or RoleName according to the tool's capabilities.
  }
}

Runners (keep standard and BP in separate functions):

```dax
DEFINE
	FUNCTION DEV.AllTests = () =>          // standard 4-column schema only
	UNION ( BusinessLogic.DEV.Tests(), DataQuality.DEV.Tests() )

	FUNCTION BestPractices.AllChecks = () => // SEPARATE runner: 5-column schema, BP only
	UNION (
		PQL.Assert.BP.CheckErrorPrevention(),
		PQL.Assert.BP.CheckFormatting(),
		PQL.Assert.BP.CheckDAXExpressions(),
		PQL.Assert.BP.CheckMaintenance(),
		PQL.Assert.BP.CheckPerformance()
	)

EVALUATE DEV.AllTests()
EVALUATE BestPractices.AllChecks()

// WRONG: never mix BP (5 columns) with standard (4 columns) in one UNION
// UNION( PQL.Assert.BP.CheckFormatting(), PQL.Assert.ShouldEqual("My test", 1, 1) )
```

validateExpectations(results) {
  Name tests with "should pass" or "should fail", then compare:
}

```dax
VAR _Results = Example.Tests()
VAR _Validation =
    ADDCOLUMNS(
        _Results,
        "ExpectedToPass", CONTAINSSTRING([TestName], "should pass"),
        "ValidationStatus",
        IF(
            CONTAINSSTRING([TestName], "should pass") && [Passed] = TRUE, "✅ CORRECT",
            IF(CONTAINSSTRING([TestName], "should fail") && [Passed] = FALSE, "✅ CORRECT", "❌ MISMATCH")
        )
    )
EVALUATE _Validation
```

## Function Name Restrictions

validateFunctionName(name) => ok | warning | error {
  Reserved words are listed in [`references/reserved-dax-words.md`](references/reserved-dax-words.md); it is the authoritative list.
  1. split name on "." and check EVERY segment, including the area (first) segment
  2. any segment equals a reserved word (case-insensitive exact match, e.g. `Calculations` in `Calculations.DEV.Tests`, or `filter`, `sum`, `calculate`) => error naming the segment, with a suggested replacement (e.g. `Metrics` for `Calculations`)
  3. a segment contains a reserved word with no delimiter (e.g. `filterData` contains `filter`) => warning
  4. otherwise => ok

  Constraints {
    An error stops the workflow: do not write the function or the query file until the name is changed.
    Run this on every name you generate, including names copied from examples.
  }
}

Commands {
  ✍️ /pql-assert write - write a test function for a calculation, content, or schema check
  🔎 /pql-assert discover - list tests for an environment, honoring RLS / OLS metadata
  🩺 /pql-assert bp - run best practice checks in a separate BP runner
  🔤 /pql-assert name - validate a function name against reserved DAX words
}
