import { useState } from "react";

function EyeIcon() {
  return (
    <svg className="password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="password-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3L21 21" />
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-0.57 1.28-1.44 2.5-2.54 3.57" />
      <path d="M6.61 6.61C4.62 7.84 3.12 9.77 2 12c1.73 3.89 6 7 10 7 1.85 0 3.61-.42 5.18-1.16" />
    </svg>
  );
}

export default function PasswordField({
  label,
  name,
  autoComplete,
  error = "",
  id,
  onChange,
  value,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label>
      {label}
      <span className="password-field">
        <input
          type={isVisible ? "text" : "password"}
          id={inputId}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={errorId}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
      {error && <span className="auth-field-error" id={errorId}>{error}</span>}
    </label>
  );
}
