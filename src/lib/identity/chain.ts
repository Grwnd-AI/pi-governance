import type { IdentityProvider, ResolvedIdentity } from './provider.js';
import type { AuthConfigType } from '../config/schema.js';
import { EnvIdentityProvider } from './env-provider.js';
import { LocalIdentityProvider } from './local-provider.js';

export class IdentityChain {
  private providers: IdentityProvider[];

  constructor(providers: IdentityProvider[]) {
    this.providers = providers;
  }

  async resolve(): Promise<ResolvedIdentity> {
    for (const provider of this.providers) {
      const identity = await provider.resolve();
      if (identity) return identity;
    }

    // Fallback: default restricted identity
    return {
      userId: 'unknown',
      role: 'analyst', // most restrictive role by default
      orgUnit: 'default',
      source: 'fallback',
    };
  }
}

export function createIdentityChain(config?: AuthConfigType): IdentityChain {
  const providers: IdentityProvider[] = [];

  // Always try env first (fastest, works in CI)
  providers.push(
    new EnvIdentityProvider(
      config?.env?.user_var,
      config?.env?.role_var,
      config?.env?.org_unit_var,
    ),
  );

  // Then try local file if configured
  if (config?.provider === 'local' && config.local?.users_file) {
    try {
      providers.push(new LocalIdentityProvider(config.local.users_file));
    } catch {
      // users file not found — skip this provider
    }
  }

  return new IdentityChain(providers);
}
