import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../../components/common/Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows a loading spinner when loading is true', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
