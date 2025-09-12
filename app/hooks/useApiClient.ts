/**
 * React hook for authentication-aware API client
 * Provides centralized HTTP client with automatic token management
 * 
 * CLEAN ARCHITECTURE BOUNDARY:
 * - Interface Adapter Layer (React Hook) → External Services (Infrastructure)
 * - Handles authentication, token refresh, and request/response interceptors
 * - Maps between UI data structures and API responses
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ApiRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export interface UseApiClientResult {
  client: ApiClient;
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * API Client class with authentication and request management
 */
export class ApiClient {
  private supabase: SupabaseClient;
  private config: ApiClientConfig;
  private requestInterceptors: Array<(request: ApiRequest) => Promise<ApiRequest>> = [];
  private responseInterceptors: Array<(response: ApiResponse) => Promise<ApiResponse>> = [];

  constructor(supabase: SupabaseClient, config: ApiClientConfig = {}) {
    this.supabase = supabase;
    this.config = {
      baseURL: '',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    // Add default authentication interceptor
    this.addRequestInterceptor(async (request) => {
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (session?.access_token) {
        request.headers = {
          ...request.headers,
          'Authorization': `Bearer ${session.access_token}`
        };
      }
      
      return request;
    });

    // Add default error handling interceptor
    this.addResponseInterceptor(async (response) => {
      if (response.status === 401) {
        // Try to refresh the session
        const { error } = await this.supabase.auth.refreshSession();
        if (error) {
          throw this.createError('Authentication failed', 401, 'AUTH_ERROR');
        }
      }
      
      return response;
    });
  }

  addRequestInterceptor(interceptor: (request: ApiRequest) => Promise<ApiRequest>) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: ApiResponse) => Promise<ApiResponse>) {
    this.responseInterceptors.push(interceptor);
  }

  private async applyRequestInterceptors(request: ApiRequest): Promise<ApiRequest> {
    let processedRequest = request;
    
    for (const interceptor of this.requestInterceptors) {
      processedRequest = await interceptor(processedRequest);
    }
    
    return processedRequest;
  }

  private async applyResponseInterceptors(response: ApiResponse): Promise<ApiResponse> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    
    return processedResponse;
  }

  private createError(message: string, status?: number, code?: string, details?: any): ApiError {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.code = code;
    error.details = details;
    return error;
  }

  private async makeRequest<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const processedRequest = await this.applyRequestInterceptors(request);
    
    const {
      url,
      method = 'GET',
      data,
      headers = {},
      params,
      timeout = this.config.timeout
    } = processedRequest;

    // Build URL with parameters
    let fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}${searchParams}`;
    }

    // Setup request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = JSON.stringify(data);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      const apiResponse: ApiResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      };

      if (!response.ok) {
        throw this.createError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'HTTP_ERROR',
          responseData
        );
      }

      return await this.applyResponseInterceptors(apiResponse);
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createError('Request timeout', 408, 'TIMEOUT_ERROR');
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw this.createError(
        error.message || 'Network error',
        0,
        'NETWORK_ERROR',
        error
      );
    }
  }

  private async makeRequestWithRetry<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        return await this.makeRequest<T>(request);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on authentication errors or client errors
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, this.config.retryDelay! * (attempt + 1))
        );
      }
    }
    
    throw lastError!;
  }

  // Public API methods
  async get<T>(url: string, params?: Record<string, string>, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry<T>({ url, method: 'GET', params, headers });
  }

  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry<T>({ url, method: 'POST', data, headers });
  }

  async put<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry<T>({ url, method: 'PUT', data, headers });
  }

  async patch<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry<T>({ url, method: 'PATCH', data, headers });
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequestWithRetry<T>({ url, method: 'DELETE', headers });
  }

  // Authentication helpers
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }
}

/**
 * Hook for accessing authenticated API client with automatic token management
 */
export function useApiClient(config: ApiClientConfig = {}): UseApiClientResult {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const client = useMemo(() => new ApiClient(supabase, config), [supabase, config]);

  const initializeAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      setSession(session);
      setUser(session?.user || null);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize authentication';
      setError(errorMessage);
      console.error('Auth initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
      setUser(data.user);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [supabase]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      setSession(null);
      setUser(null);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [supabase]);

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }

      setSession(data.session);
      setUser(data.user);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh session';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [supabase]);

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setSession(session);
      setUser(session?.user || null);
      
      if (event === 'SIGNED_OUT') {
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const isAuthenticated = Boolean(session && user);

  return {
    client,
    user,
    session,
    isAuthenticated,
    loading,
    error,
    signIn,
    signOut,
    refreshSession
  };
}