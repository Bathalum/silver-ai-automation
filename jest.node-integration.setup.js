// Node integration test setup - for backend-only tests that don't need DOM

// DO NOT MOCK SUPABASE - Let integration tests use real client

// Only mock Next.js router (not browser APIs)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
  redirect: jest.fn()
}))

// No window or DOM mocking for Node environment
// This setup is specifically for backend integration tests