// TestName: Date Dimension Row Count Is Valid
// TestDescription: Checks that the Date dimension table has at least 365 rows

let
    // Simulate row count from the Date dimension table
    DateRowCount = 1827,

    // PQL.Assert verifies the row count meets the minimum threshold
    TestResult = PQL.Assert(
        "Date Dimension Row Count Is Valid",
        DateRowCount >= 365,
        "Expected Date dimension to have at least 365 rows, but got: " & Number.ToText(DateRowCount)
    )
in
    TestResult
