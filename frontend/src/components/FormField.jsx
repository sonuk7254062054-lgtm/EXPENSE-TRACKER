export function FormField({ label, error, id, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}
