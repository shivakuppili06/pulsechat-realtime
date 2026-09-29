export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      <input
        className={`base-input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
