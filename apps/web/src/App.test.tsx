import { render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { useAuthStore } from './auth/auth-store';

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('App', () => {
  it('renders the login page before authentication', () => {
    render(<App />);

    expect(screen.getByText('Quant Arb Console')).toBeTruthy();
    expect(screen.getByText('登录控制台')).toBeTruthy();
  });

  it('renders the console shell with permission filtered menu after login', () => {
    useAuthStore.getState().setSession({
      token: 'token',
      expires_in: 86400,
      user: {
        id: 'user-1',
        username: 'admin',
        role: 'super_admin',
        permissions: ['dashboard:view', 'opportunity:view', 'alert:view'],
      },
    });

    render(<App />);

    expect(screen.getByText(/Live trading off/)).toBeTruthy();
    expect(screen.getByLabelText('dashboard summary')).toBeTruthy();
    expect(screen.getByText('套利机会')).toBeTruthy();
    expect(screen.queryByText('风控中心')).toBeNull();
  });
});
