# Technical Communication - Module 01 Context Reflection

## 1. Deconstructing Ineffective Feedback
- **Example Scenario**: Vague, blunt dismissal such as "this is wrong / doesn't make sense" on a complex pull request or design document without line references or rationale.
- **Root Failure**: Both content and delivery fail simultaneously. Without specificity, the author has no actionable path forward. Without respectful phrasing, psychological safety collapses, triggering defensive reactions rather than learning and collaborative problem solving.

## 2. Characteristics of High-Impact Technical Feedback
- **Example Scenario**: Reviewer highlighted an edge case: "In line 42, if `items` is an empty list, `items[0]` will raise an `IndexError`. We could default using `items.first()` or guard with an early return `if not items: return None`. What do you think?"
- **Core Principles**:
  1. **Specific & Contextual**: Pinpoints the exact code line, data structure, or interface contract.
  2. **Explains the 'Why'**: Explains the mechanical failure mode or system implication.
  3. **Offers Constructive Alternatives or Inquiries**: Provides a workable suggestion or invites author perspective.
  4. **Separates Code from Person**: Evaluates the artifact objectively while maintaining empathy and collaborative tone.

