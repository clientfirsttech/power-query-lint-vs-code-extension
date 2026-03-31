---
name: json-logic
description: JsonLogic rule engine documentation for building PBIR (Power BI Enhanced Report) tests using FabInspector. Use when writing, understanding, or debugging JsonLogic rules for validating Power Report definitions. Covers all supported operations including data access, logic, numeric, array, and string operators with examples and best practices for deterministic report validation.
user-invokable: false
---

# JsonLogic - Rule Engine for PBIR Report Validation

JsonLogic is a small, safe way to represent one decision as a JSON object. It is used by FabInspector to build tests that validate PBIR (Power BI Enhanced Report) definitions in Power Reports. Because rules are pure data, they can be stored, shared, and evaluated deterministically with no side effects.

## Why JsonLogic?

- **Terse.** Rules are compact JSON objects.
- **Consistent.** Every rule follows the pattern `{"operator": ["values" ...]}`. Always.
- **Secure.** Rules are never `eval()`-ed. They have read-only access to the data you provide and no write access to anything.
- **Flexible.** Easy to add new operators and build complex structures.

JsonLogic has no setters, no loops, no functions or gotos. One rule leads to one decision, with no side effects and deterministic computation time.

## Rule Format

A JsonLogic rule is a JSON object with a single key (the operator) whose value is an array of arguments. Each argument can be a string, number, boolean, array, null, or another rule.

```json
{ "operator": ["value1", "value2"] }
```

# Supported Operations

## Accessing Data

### `var`

Retrieve data from the provided data object.

Most JsonLogic rules operate on data supplied at run-time. Typically this data is an object, in which case the argument to `var` is a property name.

```js
jsonLogic.apply(
  { "var" : ["a"] },
  { "a":1, "b":2 }
);
// 1
```

Syntactic sugar lets you skip the array around single arguments:

```js
jsonLogic.apply(
  { "var" : "a" },
  { "a":1, "b":2 }
);
// 1
```

You can supply a default as the second argument, for values that might be missing in the data object. (Note, the skip-the-array sugar won't work here because you're passing two arguments to `var`):

```js
// Rule: {"var":["z", 26]}
// Data: {"a":1, "b":2}
// Result: 26
```

The key passed to `var` can use dot-notation to get the property of a property (to any depth you need):

```js
// Rule
{ "var" : "champ.name" }

// Data
{
  "champ" : {
    "name" : "Fezzig",
    "height" : 223
  },
  "challenger" : {
    "name" : "Dread Pirate Roberts",
    "height" : 183
  }
}

// Result: "Fezzig"
```

You can also use the `var` operator to access an array by numeric index:

```js
// Rule: {"var": 1}
// Data: ["zero", "one", "two"]
// Result: "one"
```

Here's a complex rule that mixes literals and data. The pie isn't ready to eat unless it's cooler than 110 degrees, *and* filled with apples.

```js
// Rule
{ "and" : [
  {"<" : [ { "var" : "temp" }, 110 ]},
  {"==" : [ { "var" : "pie.filling" }, "apple" ] }
] }

// Data
{ "temp" : 100, "pie" : { "filling" : "apple" } }

// Result: true
```

You can also use `var` with an empty string to get the entire data object — which is really useful in `map`, `filter`, and `reduce` rules.

```js
// Rule
{ "cat" : [
    "Hello, ",
    {"var":""}
] }

// Data: "Dolly"
// Result: "Hello, Dolly"
```

### `missing`

Takes an array of data keys to search for (same format as `var`). Returns an array of any keys that are missing from the data object, or an empty array.

```js
// Rule: {"missing":["a", "b"]}
// Data: {"a":"apple", "c":"carrot"}
// Result: ["b"]
```

```js
// Rule: {"missing":["a", "b"]}
// Data: {"a":"apple", "b":"banana"}
// Result: []
```

Note, in JsonLogic empty arrays are falsy. So you can use `missing` with `if` like:

```js
// Rule
{"if":[
  {"missing":["a", "b"]},
  "Not enough fruit",
  "OK to proceed"
]}

// Data: {"a":"apple", "b":"banana"}
// Result: "OK to proceed"
```

### `missing_some`

Takes a minimum number of data keys that are required, and an array of keys to search for (same format as `var` or `missing`). Returns an empty array if the minimum is met, or an array of the missing keys otherwise.

```js
// Rule: {"missing_some":[1, ["a", "b", "c"]]}
// Data: {"a":"apple"}
// Result: []
```

```js
// Rule: {"missing_some":[2, ["a", "b", "c"]]}
// Data: {"a":"apple"}
// Result: ["b", "c"]
```

This is useful if you're using `missing` to track required fields, but occasionally need to require N of M fields.

```js
// Rule
{"if" :[
    {"merge": [
      {"missing":["first_name", "last_name"]},
      {"missing_some":[1, ["cell_phone", "home_phone"] ]}
    ]},
    "We require first name, last name, and one phone number.",
    "OK to proceed"
  ]}

// Data: {"first_name":"Bruce", "last_name":"Wayne"}
// Result: "We require first name, last name, and one phone number."
```

## Logic and Boolean Operations

### `if`

The `if` statement typically takes 3 arguments: a condition (if), what to do if it's true (then), and what to do if it's false (else):

```js
// Rule: {"if" : [ true, "yes", "no" ]}
// Result: "yes"
```

```js
// Rule: {"if" : [ false, "yes", "no" ]}
// Result: "no"
```

`if` can also take more than 3 arguments, and will pair up arguments like if/then elseif/then elseif/then else:

```js
// Rule
{"if" : [
  {"<": [{"var":"temp"}, 0] }, "freezing",
  {"<": [{"var":"temp"}, 100] }, "liquid",
  "gas"
]}

// Data: {"temp":55}
// Result: "liquid"
```

### `==`

Tests equality, with type coercion. Requires two arguments.

```js
// Rule: {"==" : [1, 1]}        → true
// Rule: {"==" : [1, "1"]}      → true
// Rule: {"==" : [0, false]}    → true
```

### `===`

Tests strict equality. Requires two arguments.

```js
// Rule: {"===" : [1, 1]}       → true
// Rule: {"===" : [1, "1"]}     → false
```

### `!=`

Tests not-equal, with type coercion.

```js
// Rule: {"!=" : [1, 2]}        → true
// Rule: {"!=" : [1, "1"]}      → false
```

### `!==`

Tests strict not-equal.

```js
// Rule: {"!==" : [1, 2]}       → true
// Rule: {"!==" : [1, "1"]}     → true
```

### `!`

Logical negation ("not"). Takes just one argument.

```js
// Rule: {"!" : [true]}         → false
```

*Note:* unary operators can also take a single, non-array argument:

```js
// Rule: {"!" : true}           → false
```

### `!!`

Double negation, or "cast to a boolean." Takes a single argument.

Note that JsonLogic has its own spec for truthy to ensure that rules will run consistently across interpreters. (e.g., empty arrays are falsy, string `"0"` is truthy.)

```js
// Rule: {"!!" : [ [] ] }       → false
// Rule: {"!!" : ["0"] }        → true
```

### `or`

`or` can be used for simple boolean tests, with 1 or more arguments.

```js
// Rule: {"or": [true, false]}  → true
```

At a more sophisticated level, `or` returns the first truthy argument, or the last argument.

```js
// Rule: {"or":[false, true]}     → true
// Rule: {"or":[false, "a"]}      → "a"
// Rule: {"or":[false, 0, "a"]}   → "a"
```

### `and`

`and` can be used for simple boolean tests, with 1 or more arguments.

```js
// Rule: {"and": [true, true]}   → true
// Rule: {"and": [true, false]}  → false
```

At a more sophisticated level, `and` returns the first falsy argument, or the last argument.

```js
// Rule: {"and":[true,"a",3]}    → 3
// Rule: {"and": [true,"",3]}    → ""
```

## Numeric Operations

### `>`, `>=`, `<`, and `<=`

Greater than:

```js
// Rule: {">" : [2, 1]}         → true
```

Greater than or equal to:

```js
// Rule: {">=" : [1, 1]}        → true
```

Less than:

```js
// Rule: {"<" : [1, 2]}         → true
```

Less than or equal to:

```js
// Rule: {"<=" : [1, 1]}        → true
```

### Between

You can use a special case of `<` and `<=` to test that one value is between two others:

Between exclusive:

```js
// Rule: {"<" : [1, 2, 3]}      → true
// Rule: {"<" : [1, 1, 3]}      → false
// Rule: {"<" : [1, 4, 3]}      → false
```

Between inclusive:

```js
// Rule: {"<=" : [1, 2, 3]}     → true
// Rule: {"<=" : [1, 1, 3]}     → true
// Rule: {"<=" : [1, 4, 3]}     → false
```

This is most useful with data:

```js
// Rule: { "<": [0, {"var":"temp"}, 100]}
// Data: {"temp" : 37}
// Result: true
```

### `max` and `min`

Return the maximum or minimum from a list of values.

```js
// Rule: {"max":[1,2,3]}        → 3
// Rule: {"min":[1,2,3]}        → 1
```

### Arithmetic: `+` `-` `*` `/`

Addition, subtraction, multiplication, and division.

```js
// Rule: {"+":[4,2]}            → 6
// Rule: {"-":[4,2]}            → 2
// Rule: {"*":[4,2]}            → 8
// Rule: {"/":[4,2]}            → 2
```

Because addition and multiplication are associative, they happily take as many args as you want:

```js
// Rule: {"+":[2,2,2,2,2]}      → 10
// Rule: {"*":[2,2,2,2,2]}      → 32
```

Passing just one argument to `-` returns its arithmetic negative (additive inverse).

```js
// Rule: {"-": 2 }              → -2
// Rule: {"-": -2 }             → 2
```

Passing just one argument to `+` casts it to a number.

```js
// Rule: {"+" : "3.14"}         → 3.14
```

### `%`

Modulo. Finds the remainder after the first argument is divided by the second argument.

```js
// Rule: {"%": [101,2]}         → 1
```

This can be paired with a loop in the language that parses JsonLogic to create stripes or other effects:

```js
var rule = {"if": [{"%": [{"var":"i"}, 2]}, "odd", "even"]};
for(var i = 1; i <= 4 ; i++){
  console.log(i, jsonLogic.apply(rule, {"i":i}));
}
/* Outputs:
1 "odd"
2 "even"
3 "odd"
4 "even"
*/
```

## Array Operations

### `map`, `reduce`, and `filter`

You can use `map` to perform an action on every member of an array. Note, that inside the logic being used to map, `var` operations are relative to the array element being worked on.

```js
// Rule
{"map":[
  {"var":"integers"},
  {"*":[{"var":""},2]}
]}

// Data: {"integers":[1,2,3,4,5]}
// Result: [2,4,6,8,10]
```

You can use `filter` to keep only elements of the array that pass a test. Note, that inside the logic being used to filter, `var` operations are relative to the array element being worked on.

Also note, the returned array will have contiguous indexes starting at zero (typical for JavaScript, Python and Ruby) — it will *not* preserve the source indexes.

```js
// Rule
{"filter":[
  {"var":"integers"},
  {"%":[{"var":""},2]}
]}

// Data: {"integers":[1,2,3,4,5]}
// Result: [1,3,5]
```

You can use `reduce` to combine all the elements in an array into a single value, like adding up a list of numbers. Note, that inside the logic being used to reduce, `var` operations only have access to an object like:

```js
{
    "current" :     // this element of the array,
    "accumulator" : // progress so far, or the initial value
}
```

```js
// Rule
{"reduce":[
    {"var":"integers"},
    {"+":[{"var":"current"}, {"var":"accumulator"}]},
    0
]}

// Data: {"integers":[1,2,3,4,5]}
// Result: 15
```

### `all`, `none`, and `some`

These operations take an array, and perform a test on each member of that array.

The most interesting part of these operations is that inside the test code, `var` operations are relative to the array element being tested.

It can be useful to use `{"var":""}` to get the entire array element within the test.

```js
// Rule: {"all" : [ [1,2,3], {">":[{"var":""}, 0]} ]}
// Result: true

// Rule: {"some" : [ [-1,0,1], {">":[{"var":""}, 0]} ]}
// Result: true

// Rule: {"none" : [ [-3,-2,-1], {">":[{"var":""}, 0]} ]}
// Result: true
```

Or it can be useful to test an object based on its properties:

```js
// Rule
{"some" : [ {"var":"pies"}, {"==":[{"var":"filling"}, "apple"]} ]}

// Data
{"pies":[
  {"filling":"pumpkin","temp":110},
  {"filling":"rhubarb","temp":210},
  {"filling":"apple","temp":310}
]}

// Result: true
```

Note that `none` will return `true` for an empty array, while `all` and `some` will return `false`.

### `merge`

Takes one or more arrays, and merges them into one array. If arguments aren't arrays, they get cast to arrays.

```js
// Rule: {"merge":[ [1,2], [3,4] ]}
// Result: [1,2,3,4]

// Rule: {"merge":[ 1, 2, [3,4] ]}
// Result: [1,2,3,4]
```

`merge` can be especially useful when defining complex `missing` rules, like which fields are required in a document. For example, this vehicle paperwork always requires the car's VIN, but only needs the APR and term if you're financing.

```js
// Rule
{"missing" :
  { "merge" : [
    "vin",
    {"if": [{"var":"financing"}, ["apr", "term"], [] ]}
  ]}
}

// Data: {"financing":true}
// Result: ["vin","apr","term"]
```

```js
// Rule
{"missing" :
  { "merge" : [
    "vin",
    {"if": [{"var":"financing"}, ["apr", "term"], [] ]}
  ]}
}

// Data: {"financing":false}
// Result: ["vin"]
```

### `in`

If the second argument is an array, tests that the first argument is a member of the array:

```js
// Rule: {"in":[ "Ringo", ["John", "Paul", "George", "Ringo"] ]}
// Result: true
```

## String Operations

### `in`

If the second argument is a string, tests that the first argument is a substring:

```js
// Rule: {"in":["Spring", "Springfield"]}
// Result: true
```

### `cat`

Concatenate all the supplied arguments. Note that this is not a join or implode operation, there is no "glue" string.

```js
// Rule: {"cat": ["I love", " pie"]}
// Result: "I love pie"
```

```js
// Rule: {"cat": ["I love ", {"var":"filling"}, " pie"]}
// Data: {"filling":"apple", "temp":110}
// Result: "I love apple pie"
```

### `substr`

Get a portion of a string.

Give a positive start position to return everything beginning at that index. (Indexes start at zero.)

```js
// Rule: {"substr": ["jsonlogic", 4]}
// Result: "logic"
```

Give a negative start position to work backwards from the end of the string, then return everything.

```js
// Rule: {"substr": ["jsonlogic", -5]}
// Result: "logic"
```

Give a positive length to express how many characters to return.

```js
// Rule: {"substr": ["jsonlogic", 1, 3]}
// Result: "son"
```

Give a negative length to stop that many characters before the end.

```js
// Rule: {"substr": ["jsonlogic", 4, -2]}
// Result: "log"
```

## Miscellaneous

### `log`

Logs the first value to console, then passes it through unmodified. This can be especially helpful when debugging a large rule.

```js
// Rule: {"log":"apple"}
// Console output: "apple"
// Result: "apple"
```

# PBIR Validation Patterns

When building FabInspector tests for Power Reports, common patterns include:

### Validate a Property Exists

```json
{ "!": { "missing": ["visualType"] } }
```

### Validate a Property Value

```json
{ "==": [{ "var": "visualType" }, "barChart"] }
```

### Combine Multiple Checks

```json
{
  "and": [
    { "!": { "missing": ["visualType", "title"] } },
    { "==": [{ "var": "visualType" }, "barChart"] },
    { "!=": [{ "var": "title" }, ""] }
  ]
}
```

## Best Practices

- Keep rules small and focused on a single decision.
- Use `var` with dot-notation paths to access nested PBIR properties (e.g., `"var": "config.singleVisual.visualType"`).
- Prefer strict equality (`===`) when validating types matter.
- Use `missing` to check for required fields before testing their values.
- Compose rules with `and` / `or` to build compound validations.
- Store rules as JSON so they can be versioned, shared, and audited.
