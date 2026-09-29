import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as ShadcnButton } from '../ui/button';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export default function Button({ children, loading, disabled, variant = 'primary', className = '', ...props }: ButtonProps) {
  const variantMap: Record<string, "default" | "secondary" | "ghost" | "destructive"> = {
    primary: "default",
    secondary: "secondary",
    ghost: "ghost",
    danger: "destructive",
  };
  
  return (
    <ShadcnButton
      className={className}
      variant={variantMap[variant] || "default"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props as any}
    >
      {loading ? <Spinner size="sm" className="mr-2" /> : null}
      {children}
    </ShadcnButton>
  );
}
