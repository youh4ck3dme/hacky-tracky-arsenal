import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FindingBadge } from '../../../frontend/src/components/schrodinger/FindingBadge';

describe('FindingBadge', () => {
  it('renders Collapsed label', () => {
    render(<FindingBadge state="collapsed" />);
    expect(screen.getByText('Collapsed')).toBeInTheDocument();
  });

  it('renders Quantum label', () => {
    render(<FindingBadge state="quantum" />);
    expect(screen.getByText('Quantum')).toBeInTheDocument();
  });

  it('renders Absent label', () => {
    render(<FindingBadge state="absent" />);
    expect(screen.getByText('Absent')).toBeInTheDocument();
  });
});
