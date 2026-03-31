# mobile/components/auth/

Authentication screen components.

## Files

### `AuthScaffold.tsx`
Shared layout for sign-in/sign-up screens. Provides consistent background, logo, form container, and keyboard-avoiding behavior.

### `AuthTextField.tsx`
Styled text input for auth forms. Includes label, validation error display, and secure text entry toggle for passwords.

### `SSOButtons.tsx`
Social sign-in buttons (Google, Apple). Triggers Clerk OAuth flow via `expo-auth-session`.
