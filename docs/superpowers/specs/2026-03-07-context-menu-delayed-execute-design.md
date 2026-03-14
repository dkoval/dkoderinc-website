# Context Menu: Delayed Command Execution

## Problem
When selecting a command from the suggestions menu (Tab/Enter/click), the command executes immediately without ever appearing in the input box. This feels abrupt and unnatural.

## Solution
After selecting a command from the suggestions menu:
1. Close the suggestions menu
2. Display the selected command name in the input box
3. After 300ms, auto-execute the command

If the user types during the 300ms delay, cancel the pending execution.

## Scope
- **File:** `src/components/Terminal/Terminal.tsx`
- **All 3 selection methods** (Tab, Enter, click/tap) use the same delayed behavior

## Implementation
1. Add a ref to track the pending execution timeout
2. Modify `selectSuggestion()` to set input value, close menu, and schedule execution after 300ms
3. Update `<Suggestions>` `onSelect` callback to use `selectSuggestion()` instead of inline logic
4. In `handleInputChange`, cancel any pending execution timeout
5. Clean up timeout on unmount
