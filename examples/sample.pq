// Sample Power Query (M) file
// This is a basic example to test the Power Query Lint extension

let
    // Define a simple function
    GetData = () =>
        let
            Source = Excel.Workbook(File.Contents("C:\\Data\\Sample.xlsx"), null, true),
            Sheet1_Sheet = Source{[Item="Sheet1",Kind="Sheet"]}[Data],
            #"Promoted Headers" = Table.PromoteHeaders(Sheet1_Sheet, [PromoteAllScalars=true]),
            #"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{
                {"ID", Int64.Type},
                {"Name", type text},
                {"Date", type date}
            })
        in
            #"Changed Type",
    
    // Apply the function
    Result = GetData()
in
    Result
