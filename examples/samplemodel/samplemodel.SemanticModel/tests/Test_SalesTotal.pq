// TestName: Sales Total Should Be Positive
// TestDescription: Verifies that the total sales amount is greater than zero

let
    // Simulate retrieving the sales total from the model
    SalesTotal = 1250000.00,

    // PQL.Assert verifies that the condition is true
    // Parameters: assertion description, condition, optional failure message
    TestResult = PQL.Assert(
        "Sales Total Should Be Positive",
        SalesTotal > 0,
        "Expected sales total to be greater than zero, but got: " & Number.ToText(SalesTotal)
    )
in
    TestResult
