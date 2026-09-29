import Spinner from './Spinner';

export default function Button({ children, loading, disabled, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`btn-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
}
