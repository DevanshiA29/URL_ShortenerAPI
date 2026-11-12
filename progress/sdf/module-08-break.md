# Module 08 Break: Search Vulnerability & Pagination Flaw Investigation

## 1. Bug Injected: Filter Injection & Regex Metacharacter Exploitation
- **Vulnerable Code Pattern**:
  ```typescript
  // Flawed query construction: raw unescaped regex interpolation
  filter.long_url = { $regex: query, $options: 'i' };
  ```
- **Symptom & Reproduction**:
  - A client sends `q=.*` or `q=[a-z]+`. This bypasses substring matching and performs regex wildcard searches across the whole collection.
  - A malicious payload with nested quantifiers (e.g. `q=(a+)+$`) paired with non-matching strings causes catastrophic CPU backtracking in MongoDB/Node.js.
  - Furthermore, if JSON objects are deserialized directly into the query, an attacker could supply `{ "$ne": null }` to defeat tenant scoping.

## 2. Bug Injected: Pagination Off-By-One Defect
- **Flawed Pagination Logic**:
  ```typescript
  // Off-by-one bug 1: Missing (page - 1)
  const skip = page * pageSize; 
  // Off-by-one bug 2: Math.floor drops trailing page
  const totalPages = Math.floor(total / pageSize);
  ```
- **Empirical Evidence**:
  - For `page = 1, pageSize = 10, total = 25`:
    - Computed `skip = 10`. The client requesting Page 1 loses records 1 through 10 entirely!
    - Computed `totalPages = Math.floor(25 / 10) = 2`. Records 21 through 25 are rendered unreachable because Page 3 is omitted from metadata.
