import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadDockerSecrets } from './load-docker-secrets';

describe('loadDockerSecrets', () => {
  const environment = [
    'DB_PASSWORD',
    'DB_PASSWORD_FILE',
    'JWT_SECRET',
    'JWT_SECRET_FILE',
  ] as const;
  const previousValues = new Map<string, string | undefined>();
  let directory: string;

  beforeEach(() => {
    for (const variable of environment) {
      previousValues.set(variable, process.env[variable]);
      delete process.env[variable];
    }
    directory = mkdtempSync(join(tmpdir(), 'smart-recruit-secrets-'));
  });

  afterEach(() => {
    for (const variable of environment) {
      const previousValue = previousValues.get(variable);
      if (previousValue === undefined) {
        delete process.env[variable];
      } else {
        process.env[variable] = previousValue;
      }
    }
    rmSync(directory, { recursive: true, force: true });
  });

  it('loads Docker-mounted secrets and strips the final newline', () => {
    const passwordPath = join(directory, 'db-password');
    const jwtPath = join(directory, 'jwt-secret');
    writeFileSync(passwordPath, 'database-password\n');
    writeFileSync(jwtPath, 'jwt-signing-secret\n');
    process.env.DB_PASSWORD_FILE = passwordPath;
    process.env.JWT_SECRET_FILE = jwtPath;

    loadDockerSecrets();

    expect(process.env.DB_PASSWORD).toBe('database-password');
    expect(process.env.JWT_SECRET).toBe('jwt-signing-secret');
  });

  it('does not replace explicitly configured environment variables', () => {
    const secretPath = join(directory, 'db-password');
    writeFileSync(secretPath, 'mounted-secret');
    process.env.DB_PASSWORD = 'environment-secret';
    process.env.DB_PASSWORD_FILE = secretPath;

    loadDockerSecrets();

    expect(process.env.DB_PASSWORD).toBe('environment-secret');
  });
});
