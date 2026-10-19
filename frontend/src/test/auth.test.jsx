import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    getHealth: vi.fn(),
    listNotifications: vi.fn(),
  },
}));

function TestConsumer() {
  const { user, isAuthenticated, isClient, isSupplier, storeClientId } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
      <div data-testid="user-role">{user?.role || 'NONE'}</div>
      <div data-testid="is-client">{isClient ? 'YES' : 'NO'}</div>
      <div data-testid="is-supplier">{isSupplier ? 'YES' : 'NO'}</div>
      <div data-testid="store-id">{storeClientId || 'NONE'}</div>
    </div>
  );
}

describe('AuthContext & Tenant Claims Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('ANONYMOUS');
    expect(screen.getByTestId('user-role').textContent).toBe('NONE');
    expect(screen.getByTestId('is-client').textContent).toBe('NO');
  });

  it('correctly sets client role and store_client_id from stored session', async () => {
    const mockClient = {
      uid: 'client-1',
      email: 'client1@store.com',
      role: 'client',
      store_client_id: 'STORE-001',
    };
    api.getMe.mockResolvedValue(mockClient);
    localStorage.setItem('user', JSON.stringify(mockClient));
    localStorage.setItem('token', 'mock-client-jwt');

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('AUTHENTICATED');
    expect(screen.getByTestId('user-role').textContent).toBe('client');
    expect(screen.getByTestId('is-client').textContent).toBe('YES');
    expect(screen.getByTestId('is-supplier').textContent).toBe('NO');
    expect(screen.getByTestId('store-id').textContent).toBe('STORE-001');
  });

  it('correctly sets supplier role from stored session without store restriction', async () => {
    const mockSupplier = {
      uid: 'supplier-1',
      email: 'supplier@vendor.com',
      role: 'supplier',
    };
    api.getMe.mockResolvedValue(mockSupplier);
    localStorage.setItem('user', JSON.stringify(mockSupplier));
    localStorage.setItem('token', 'mock-supplier-jwt');

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('AUTHENTICATED');
    expect(screen.getByTestId('user-role').textContent).toBe('supplier');
    expect(screen.getByTestId('is-client').textContent).toBe('NO');
    expect(screen.getByTestId('is-supplier').textContent).toBe('YES');
  });

  it('updates state and localStorage upon successful login', async () => {
    function LoginConsumer() {
      const { login, user, isAuthenticated } = useAuth();
      return (
        <div>
          <div data-testid="login-auth-status">{isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}</div>
          <div data-testid="login-user-email">{user?.email || 'NONE'}</div>
          <button
            data-testid="do-login-btn"
            onClick={() => login('client1@store.com', 'demo1234')}
          >
            Login
          </button>
        </div>
      );
    }

    const mockUser = {
      uid: 'client-1',
      email: 'client1@store.com',
      role: 'client',
      store_client_id: 'STORE-001',
    };
    api.login.mockResolvedValue({
      access_token: 'new-jwt-token-123',
      user: mockUser,
    });
    api.getMe.mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('login-auth-status').textContent).toBe('ANONYMOUS');

    await act(async () => {
      screen.getByTestId('do-login-btn').click();
    });

    expect(screen.getByTestId('login-auth-status').textContent).toBe('AUTHENTICATED');
    expect(screen.getByTestId('login-user-email').textContent).toBe('client1@store.com');
    expect(localStorage.getItem('token')).toBe('new-jwt-token-123');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser);
  });
});
