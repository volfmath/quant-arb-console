import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the console shell with live trading disabled', () => {
    render(<App />);

    expect(screen.getByText('Quant Arb Console')).toBeTruthy();
    expect(screen.getByText(/Live trading off/)).toBeTruthy();
    expect(screen.getByLabelText('dashboard summary')).toBeTruthy();
  });
});
