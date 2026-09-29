import { InputHTMLAttributes } from 'react';
import { Input as ShadcnInput } from '../ui/input';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className={`field ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <ShadcnInput
        className={`${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        {...props}
      />
      {error && <span className="field-error text-destructive text-sm">{error}</span>}
    </div>
  );
}
