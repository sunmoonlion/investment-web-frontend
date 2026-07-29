import { describe, expect, it } from 'vitest';
import { createContentSecurityPolicy } from '@/lib/security/content-security-policy';

describe('createContentSecurityPolicy', () => {
  it('builds a production nonce policy without unsafe script execution', () => {
    const policy = createContentSecurityPolicy('YWJjZGVmZ2hpamtsbW5vcA==', false);

    expect(policy).toContain(
      "script-src 'self' 'nonce-YWJjZGVmZ2hpamtsbW5vcA==' 'strict-dynamic'",
    );
    expect(policy).toContain(
      "style-src 'self' 'nonce-YWJjZGVmZ2hpamtsbW5vcA=='",
    );
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("'unsafe-inline'");
  });

  it('rejects a weak or malformed nonce', () => {
    expect(() => createContentSecurityPolicy('short', false)).toThrow(
      'CSP nonce format is invalid',
    );
  });
});
