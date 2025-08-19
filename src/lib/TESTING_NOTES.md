This directory contains unit tests for the cache module.

The framework in use is Vitest (as indicated by the test imports). If your repository uses Jest instead, replace the following:
- Replace `import { describe, it, expect, vi } from 'vitest'` with `import { describe, it, expect, jest } from '@jest/globals'`.
- Use `jest` instead of `vi` in mocks and spies.

Tests cover the following:
- Key generation and TTL handling
- Memory vs. storage read paths
- Eviction policy for the memory cache
- Category-specific and full cache clearing
- Star/unstar update behavior across inbox and starred caches
- Robustness to storage errors and cleanup of malformed or expired entries