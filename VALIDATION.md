# Validation System Documentation

## Overview

The DSL Orchestration Wizard implements a comprehensive two-layer validation system:
1. **Client-side validation** (JavaScript) - Immediate feedback
2. **Server-side validation** (Python/Flask) - Security and data integrity

## Validation Layers

### 1. Client-Side Validation (JavaScript)

Located in `static/wizard.js`, provides immediate user feedback.

#### Features:
- **Real-time field validation**: Validates on blur for critical fields
- **Step validation**: Prevents navigation to next step if current step has errors
- **Visual feedback**: Red borders and inline error messages
- **Pattern matching**: Uses regex patterns for identifiers, versions, and images

#### Validation Patterns:
```javascript
identifier: /^[a-zA-Z][a-zA-Z0-9_-]*$/
version: /^\d+\.\d+\.\d+$/
image: /^[a-zA-Z0-9._\/-]+:[a-zA-Z0-9._-]+$/
```

#### Validated Elements:
- Orchestration name and version (Step 1)
- Environment resources and time horizon (Step 2)
- Service IDs, names, and container images (Step 3)
- Task IDs, services, priorities, and deadlines (Step 4)
- Dependency relationships (Step 5)
- Fault tolerance parameters (Step 6)

### 2. Server-Side Validation (Python)

Located in `app.py`, ensures data integrity and security.

#### Validation Functions:

**`validate_identifier(value)`**
- Checks if value starts with a letter
- Ensures only alphanumeric, underscore, and hyphen characters
- Returns: `(bool, str)` - success status and error message

**`validate_version(value)`**
- Validates semantic versioning format (X.Y.Z)
- Returns: `(bool, str)`

**`validate_positive_number(value, field_name)`**
- Ensures value is >= 0
- Returns: `(bool, str)`

**`validate_priority(value)`**
- Checks if value is between 1 and 99
- Returns: `(bool, str)`

**`validate_image_name(value)`**
- Validates container image format: `registry/name:tag`
- Returns: `(bool, str)`

**Step-specific validators:**
- `validate_orchestration(data)` - Step 1
- `validate_environment(data)` - Step 2
- `validate_services(data)` - Step 3
- `validate_tasks(data)` - Step 4
- `validate_dependencies(data)` - Step 5
- `validate_fault_tolerance(data)` - Step 6

Each returns a list of error messages (empty list if valid).

## Error Handling

### Client-Side
```javascript
// Display errors in a styled container
showValidationErrors(errors)

// Clear previous errors
clearValidationErrors()

// Field-level errors
showFieldError(input, message)
hideFieldError(input)
```

### Server-Side
```python
# Returns 400 status with error list
if errors:
    return jsonify({'success': False, 'errors': errors}), 400

# Returns 200 on success
return jsonify({'success': True, 'message': 'Step saved successfully'})
```

## Validation Rules Summary

| Field Type | Rule | Example |
|------------|------|---------|
| Identifier | `^[a-zA-Z][a-zA-Z0-9_-]*$` | `my_service_1` |
| Version | `^\d+\.\d+\.\d+$` | `1.2.3` |
| Container Image | `registry/name:tag` | `registry.sat/app:v1.0` |
| Priority | 1-99 | `95` |
| Positive Number | > 0 | `1024` |
| Non-negative | >= 0 | `0` |

## HTML5 Validation Attributes

The HTML template includes native browser validation:

```html
<!-- Pattern validation -->
<input pattern="[a-zA-Z][a-zA-Z0-9_-]*" title="...">

<!-- Range validation -->
<input type="number" min="1" max="99">

<!-- Required fields -->
<input required>
```

## User Experience

### Validation Flow:
1. User fills in form fields
2. On blur, critical fields are validated (client-side)
3. Invalid fields show red border + error message
4. On "Next" button click:
   - Current step is validated
   - If errors exist, display error panel at top
   - Scroll to errors
   - Prevent navigation
5. Data is sent to server for validation
6. Server validates and returns errors if any
7. Client displays server errors if present

### Error Display:
- **Field-level**: Red border + small text below field
- **Step-level**: Red alert box at top with bullet list of errors
- **Server errors**: Same red alert box format

## Testing Validation

### Test Cases:

**Invalid Identifier:**
- Input: `123_service` (starts with number)
- Expected: Error message

**Invalid Version:**
- Input: `1.0` (missing patch version)
- Expected: Error message

**Invalid Container Image:**
- Input: `myimage` (missing tag)
- Expected: Error message

**Duplicate IDs:**
- Add two services with same ID
- Expected: Error on second service

**Invalid Priority:**
- Input: `100` (out of range)
- Expected: Error message

**Invalid Time Horizon:**
- Start: `1000`, End: `500`
- Expected: Error "end must be greater than start"

## Extending Validation

To add new validation rules:

1. **Client-side** (`wizard.js`):
```javascript
// Add pattern
const PATTERNS = {
    newPattern: /^your-regex$/
};

// Add to validateCurrentStep()
if (!PATTERNS.newPattern.test(value)) {
    errors.push('Error message');
}
```

2. **Server-side** (`app.py`):
```python
def validate_new_field(value):
    if not re.match(r'^your-regex$', value):
        return False, "Error message"
    return True, ""
```

3. **HTML** (`index.html`):
```html
<input pattern="your-regex" title="Help text">
```

## Security Considerations

- All user input is validated server-side (never trust client)
- Regex patterns prevent injection attacks
- Numeric ranges prevent overflow/underflow
- Duplicate detection prevents data corruption
- Container image validation prevents malicious images

## Performance

- Client-side validation is instant (no network delay)
- Server-side validation adds ~50-100ms per request
- Validation errors prevent invalid data from being stored
- Overall improves UX by catching errors early
