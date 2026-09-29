export default function ConnectionStatus({ connectionState, reconnectAttempt }) {
  const configs = {
    connected:    { cls: 'connected-badge',    dot: 'connected',    label: 'Connected' },
    connecting:   { cls: 'connecting-badge',   dot: 'connecting',   label: 'Connecting…' },
    reconnecting: { cls: 'reconnecting-badge', dot: 'reconnecting', label: `Reconnecting (${reconnectAttempt})…` },
    disconnected: { cls: 'disconnected-badge', dot: 'disconnected', label: 'Disconnected' },
  };
  const { cls, dot, label } = configs[connectionState] || configs.disconnected;

  return (
    <div role="status" aria-live="polite" aria-label={`Connection: ${label}`}>
      <span className={cls}>
        <span className={`status-dot ${dot}`} aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
