# Error Codes Documentation

This document lists all error codes used in the API. Frontend applications should use these codes for multi-language error message handling.

## Response Format

```json
{
    "code": 400,
    "message": "English error message",
    "data": "ERROR_CODE_STRING"
}
```

## Authentication Errors (AUTH_*)

| Error Code | HTTP Status | Description | When It Occurs |
|------------|-------------|-------------|----------------|
| `AUTH_MISSING_FIELDS` | 400 | Required fields are missing | Register/login without required fields |
| `AUTH_EMAIL_EXISTS` | 409 | Email already registered | Register with existing email |
| `AUTH_USERNAME_EXISTS` | 409 | Username already taken | Register with existing username |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email or password incorrect | Login with wrong credentials |
| `AUTH_INVALID_TOKEN` | 401 | Token is invalid or malformed | Using invalid JWT token |
| `AUTH_TOKEN_REVOKED` | 401 | Token has been revoked | Using a revoked refresh token |
| `AUTH_TOKEN_EXPIRED` | 401 | Token has expired | Using an expired refresh token |
| `AUTH_TOKEN_MISSING` | 401 | Token not provided | Missing refresh token in request |

## Common Errors (COMMON_*)

| Error Code | HTTP Status | Description | When It Occurs |
|------------|-------------|-------------|----------------|
| `INTERNAL_ERROR` | 500 | Internal server error | Unexpected server errors |
| `NOT_FOUND` | 404 | Resource not found | Requested resource doesn't exist |
| `UNAUTHORIZED` | 401 | Authentication required | No valid authentication |
| `FORBIDDEN` | 403 | Permission denied | Insufficient permissions |
| `BAD_REQUEST` | 400 | Invalid request | Malformed request data |

## User Errors (USER_*)

| Error Code | HTTP Status | Description | When It Occurs |
|------------|-------------|-------------|----------------|
| `USER_NOT_FOUND` | 404 | User not found | Requesting non-existent user |
| `USER_ALREADY_EXISTS` | 409 | User already exists | Creating duplicate user |

## Room Errors (ROOM_*)

| Error Code | HTTP Status | Description | When It Occurs |
|------------|-------------|-------------|----------------|
| `ROOM_NOT_FOUND` | 404 | Room not found | Requesting non-existent room |
| `ROOM_ACCESS_DENIED` | 403 | Access denied to room | No permission to access room |
| `ROOM_INVALID_PASSWORD` | 401 | Invalid room password | Wrong password for private room |
| `ROOM_ALREADY_JOINED` | 409 | Already joined the room | Attempting to join already-joined room |

## Frontend Usage Example

```typescript
// Example error handling in frontend
const errorMessages = {
    'en': {
        'AUTH_MISSING_FIELDS': 'Please fill in all required fields',
        'AUTH_EMAIL_EXISTS': 'This email is already registered',
        'AUTH_INVALID_CREDENTIALS': 'Invalid email or password',
        // ... more translations
    },
    'zh-CN': {
        'AUTH_MISSING_FIELDS': '请填写所有必填字段',
        'AUTH_EMAIL_EXISTS': '该邮箱已被注册',
        'AUTH_INVALID_CREDENTIALS': '邮箱或密码错误',
        // ... more translations
    }
};

// Handle API error
function handleError(response, language = 'en') {
    const errorCode = response.data;
    const localizedMessage = errorMessages[language][errorCode] || response.message;
    showError(localizedMessage);
}
```

## API Response Examples

### Success Response
```json
{
    "code": 200,
    "message": "Success",
    "data": {
        "user": {...},
        "access_token": "...",
        "refresh_token": "..."
    }
}
```

### Error Response
```json
{
    "code": 400,
    "message": "Required fields are missing",
    "data": "AUTH_MISSING_FIELDS"
}
```

### Error Response (Login Failed)
```json
{
    "code": 401,
    "message": "Invalid email or password",
    "data": "AUTH_INVALID_CREDENTIALS"
}
```
