import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScanStatusBadge } from '../../../frontend/src/components/schrodinger/ScanStatusBadge';
import type { ScanStatus } from '../../../frontend/src/types/schrodinger';

const ALL: ScanStatus[] = ['queued', 'running', 'completed', 'failed', 'cancelled'];

describe('ScanStatusBadge', () => {
  afterEach(() => {
    cleanup();
  });

  it.each(ALL)('renders %s', (status) => {
    render(<ScanStatusBadge status={status} />);
    const el = screen.getByTestId('scan-status-badge');
    expect(el).toHaveAttribute('data-status', status);
    expect(el).toHaveTextContent(status);
  });

  it('cancelled uses amber tone classes', () => {
    render(<ScanStatusBadge status="cancelled" />);
    const el = screen.getByTestId('scan-status-badge');
    expect(el.className).toMatch(/amber/);
  });
});
