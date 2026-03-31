---
name: json-logic
description: JsonLogic rule engine documentation for building PBIR (Power BI Enhanced Report) tests using FabInspector. Use when writing, understanding, or debugging JsonLogic rules for validating Power Report definitions. Covers all supported operations including data access, logic, numeric, array, and string operators with examples and best practices for deterministic report validation.
user-invokable: false
---

# JsonLogic — Rule Engine for PBIR Report Validation

You are an expert in JsonLogic, the JSON-based rule engine used by FabInspector to build deterministic tests that validate PBIR (Power BI Enhanced Report) definitions. You write, debug, and explain JsonLogic rules fluently.

## Why JsonLogic?

JsonLogic is a small, safe way to represent one decision as a JSON object.

Constraints {
  Rules are compact JSON objects — terse by design.
  Every rule follows the pattern `{"operator": ["values" ...]}` — always consistent.
  Rules are never eval()-ed — they have read-only data access with no write access — secure.
  Easy to add new operators and build complex structures — flexible.
  No setters, no loops, no functions, no gotos.
  One rule → one decision, no side effects, deterministic computation time.
}

## Rule Format

```SudoLang
JsonLogicRule {
  shape: { operator: [arg1, arg2, ...] }
  Each argument can be a string, number, boolean, array, null, or another JsonLogicRule.
}
```

```json
{ "operator": ["value1", "value2"] }
```

# Supported Operations

## Accessing Data

### `var` — retrieve data from the provided data object

Most JsonLogic rules operate on data supplied at run-time. The argument to `var` is a property name.

```js
jsonLogic.apply(
  { "var" : ["a"] },
  { "a":1, "b":2 }
);
// 1
```

Syntactic sugar — skip the array around single arguments:

```js
jsonLogic.apply(
  { "var" : "a" },
  { "a":1, "b":2 }
);
// 1
```

Supply a default as the second argument for values that might be missing:

```js
// Rule: {"var":["z", 26]}
// Data: {"a":1, "b":2}
// Result: 26
```

Dot-notation — access nested properties to any depth:

```js
// Rule: { "var" : "champ.name" }
// Data: { "champ": { "name": "Fezzig", "height": 223 }, "challenger": { "name": "Dread Pirate Roberts", "height": 183 } }
// Result: "Fezzig"
```

Numeric index — access array elements:

```js
// Rule: {"var": 1}
// Data: ["zero", "one", "two"]
// Result: "one"
```

Complex rule — mix literals and data:

```js
// Rule
{ "and" : [
  {"<" : [ { "var" : "temp" }, 110 ]},
  {"==" : [ { "var" : "pie.filling" }, "apple" ] }
] }

// Data: { "temp" : 100, "pie" : { "filling" : "apple" } }
// Result: true
```

Empty string — get the entire data object (useful in map, filter, reduce):

```js
// Rule: { "cat" : [ "Hello, ", {"var":""} ] }
// Data: "Dolly"
// Result: "Hello, Dolly"
```

### `missing` — find keys absent from the data object

Takes an array of data keys. Returns an array of any keys missing from the data, or `[]`.

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

In JsonLogic empty arrays are falsy, so combine `missing` with `if`:

```js
// Rule: {"if":[ {"missing":["a", "b"]}, "Not enough fruit", "OK to proceed" ]}
// Data: {"a":"apple", "b":"banana"}
// Result: "OK to proceed"
```

### `missing_some` — require N of M keys

Takes a minimum count and an array of keys. Returns `[]` if minimum is met, otherwise the missing keys.

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

Combined example — require first name, last name, and at least one phone number:

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

### `if` — conditional branching

Takes 3 arguments (condition, then, else) or chains as if/then elseif/then … else:

```js
// Rule: {"if" : [ true, "yes", "no" ]}   → "yes"
// Rule: {"if" : [ false, "yes", "no" ]}  → "no"
```

Chained:

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

### `==` — equality with type coercion

```js
// {"==" : [1, 1]}        → true
// {"==" : [1, "1"]}      → true
// {"==" : [0, false]}    → true
```

### `===` — strict equality

```js
// {"===" : [1, 1]}       → true
// {"===" : [1, "1"]}     → false
```

### `!=` — not-equal with type coercion

```js
// {"!=" : [1, 2]}        → true
// {"!=" : [1, "1"]}      → false
```

### `!==` — strict not-equal

```js
// {"!==" : [1, 2]}       → true
// {"!==" : [1, "1"]}     → true
```

### `!` — logical negation

```js
// {"!" : [true]}         → false
// {"!" : true}           → false   (unary sugar)
```

### `!!` — double negation (cast to boolean)

JsonLogic truthiness: empty arrays are falsy, string "0" is truthy.

```js
// {"!!" : [ [] ] }       → false
// {"!!" : ["0"] }        → true
```

### `or` — logical OR (returns first truthy or last argument)

```js
// {"or": [true, false]}    → true
// {"or": [false, "a"]}     → "a"
// {"or": [false, 0, "a"]}  → "a"
```

### `and` — logical AND (returns first falsy or last argument)

```js
// {"and": [true, true]}   → true
// {"and": [true, false]}  → false
// {"and": [true,"a",3]}   → 3
// {"and": [true,"",3]}    → ""
```

## Numeric Operations

### Comparison: `>`, `>=`, `<`, `<=`

```js
// {">" : [2, 1]}   → true
// {">=" : [1, 1]}  → true
// {"<" : [1, 2]}   → true
// {"<=" : [1, 1]}  → true
```

### Between — special 3-argument form of `<` and `<=`

```js
// {"<" : [1, 2, 3]}   → true   (exclusive)
// {"<" : [1, 1, 3]}   → false
// {"<=" : [1, 2, 3]}  → true   (inclusive)
// {"<=" : [1, 1, 3]}  → true
```

With data:

```js
// Rule: { "<": [0, {"var":"temp"}, 100]}
// Data: {"temp" : 37}
// Result: true
```

### `max` and `min`

```js
// {"max":[1,2,3]}  → 3
// {"min":[1,2,3]}  → 1
```

### Arithmetic: `+`, `-`, `*`, `/`

```js
// {"+":[4,2]}  → 6      {"-":[4,2]}  → 2
// {"*":[4,2]}  → 8      {"/":[4,2]}  → 2
```

Associative — take as many args as you want:

```js
// {"+":[2,2,2,2,2]}  → 10
// {"*":[2,2,2,2,2]}  → 32
```

Unary `-` returns the additive inverse; unary `+` casts to number:

```js
// {"-": 2 }       → -2
// {"-": -2 }      → 2
// {"+" : "3.14"}  → 3.14
```

### `%` — modulo

```js
// {"%": [101,2]}  → 1
```

Stripe pattern example:

```js
var rule = {"if": [{"%": [{"var":"i"}, 2]}, "odd", "even"]};
for(var i = 1; i <= 4 ; i++){
  console.log(i, jsonLogic.apply(rule, {"i":i}));
}
// 1 "odd"  2 "even"  3 "odd"  4 "even"
```

## Array Operations

### `map` — transform every element

Inside the logic, `var` is relative to the current array element.

```js
// Rule: {"map":[ {"var":"integers"}, {"*":[{"var":""},2]} ]}
// Data: {"integers":[1,2,3,4,5]}
// Result: [2,4,6,8,10]
```

### `filter` — keep elements passing a test

Inside the logic, `var` is relative to the current array element. Returned indexes are contiguous starting at zero.

```js
// Rule: {"filter":[ {"var":"integers"}, {"%":[{"var":""},2]} ]}
// Data: {"integers":[1,2,3,4,5]}
// Result: [1,3,5]
```

### `reduce` — combine elements into a single value

Inside the logic, `var` has access to `current` (this element) and `accumulator` (progress so far).

```js
// Rule: {"reduce":[ {"var":"integers"}, {"+":[{"var":"current"}, {"var":"accumulator"}]}, 0 ]}
// Data: {"integers":[1,2,3,4,5]}
// Result: 15
```

### `all`, `none`, `some` — array tests

Inside the test, `var` is relative to the current element. Use `{"var":""}` for the whole element.

```js
// {"all" : [ [1,2,3], {">":[{"var":""}, 0]} ]}        → true
// {"some" : [ [-1,0,1], {">":[{"var":""}, 0]} ]}      → true
// {"none" : [ [-3,-2,-1], {">":[{"var":""}, 0]} ]}    → true
```

Test by property:

```js
// Rule: {"some" : [ {"var":"pies"}, {"==":[{"var":"filling"}, "apple"]} ]}
// Data: {"pies":[ {"filling":"pumpkin","temp":110}, {"filling":"rhubarb","temp":210}, {"filling":"apple","temp":310} ]}
// Result: true
```

Constraint: `none` returns true for an empty array; `all` and `some` return false for empty arrays.

### `merge` — flatten arrays

```js
// {"merge":[ [1,2], [3,4] ]}  → [1,2,3,4]
// {"merge":[ 1, 2, [3,4] ]}  → [1,2,3,4]
```

Complex `missing` example — always require VIN, require APR + term only if financing:

```js
// Rule: {"missing" : { "merge" : [ "vin", {"if": [{"var":"financing"}, ["apr", "term"], [] ]} ] } }
// Data: {"financing":true}   → ["vin","apr","term"]
// Data: {"financing":false}  → ["vin"]
```

### `in` — membership test (array)

```js
// {"in":[ "Ringo", ["John", "Paul", "George", "Ringo"] ]}  → true
```

## String Operations

### `in` — substring test

```js
// {"in":["Spring", "Springfield"]}  → true
```

### `cat` — concatenation

```js
// {"cat": ["I love", " pie"]}                                   → "I love pie"
// {"cat": ["I love ", {"var":"filling"}, " pie"]}
//   Data: {"filling":"apple"}                                    → "I love apple pie"
```

### `substr` — extract a portion of a string

```js
// {"substr": ["jsonlogic", 4]}      → "logic"   (from index 4)
// {"substr": ["jsonlogic", -5]}     → "logic"   (last 5 chars)
// {"substr": ["jsonlogic", 1, 3]}   → "son"     (3 chars from index 1)
// {"substr": ["jsonlogic", 4, -2]}  → "log"     (stop 2 before end)
```

## Miscellaneous

### `log` — debug logging

Logs the first value to console, then passes it through unmodified:

```js
// {"log":"apple"}  → console: "apple", result: "apple"
```

# PBIR Validation Patterns

Common patterns when building FabInspector tests for Power Reports:

### Validate a property exists

```json
{ "!": { "missing": ["visualType"] } }
```

### Validate a property value

```json
{ "==": [{ "var": "visualType" }, "barChart"] }
```

### Combine multiple checks

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

Constraints {
  Keep rules small and focused on a single decision.
  Use `var` with dot-notation paths to access nested PBIR properties (e.g., "var": "config.singleVisual.visualType").
  Prefer strict equality (`===`) when type matters.
  Use `missing` to check for required fields before testing their values.
  Compose rules with `and` / `or` to build compound validations.
  Store rules as JSON so they can be versioned, shared, and audited.
}
