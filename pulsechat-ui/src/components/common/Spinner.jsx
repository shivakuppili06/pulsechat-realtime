export default function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: { width: 14, height: 14, borderWidth: 2 },
    md: { width: 24, height: 24, borderWidth: 3 },
    lg: { width: 36, height: 36, borderWidth: 4 },
  };
  const { width, height, borderWidth } = sizeMap[size];
  
  return (
    <div
      className={`spinner-component ${className}`}
      style={{
        width,
        height,
        border: `${borderWidth}px solid rgba(108,99,255,0.2)`,
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
      aria-label="Loading"
      role="status"
    />
  );
}
