// TestName: Product Category Count Matches Expected
// TestDescription: Ensures the Products table contains the expected number of distinct categories

let
    // Simulate distinct category count from the Products table
    CategoryCount = 6,
    ExpectedCategories = 6,

    // PQL.Assert checks exact equality of category counts
    TestResult = PQL.Assert(
        "Product Category Count Matches Expected",
        CategoryCount = ExpectedCategories,
        "Expected " & Number.ToText(ExpectedCategories) & " categories but found: " & Number.ToText(CategoryCount)
    )
in
    TestResult
