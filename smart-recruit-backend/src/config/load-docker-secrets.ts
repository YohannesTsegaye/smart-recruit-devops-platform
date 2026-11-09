import { readFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';

const logger = new Logger('DockerSecrets');

const secretFiles: Record<string, string> = {
  DB_PASSWORD: 'DB_PASSWORD_FILE',
  JWT_SECRET: 'JWT_SECRET_FILE',
};

export function loadDockerSecrets(): void {
  for (const [variable, fileVariable] of Object.entries(secretFiles)) {
    const secretPath = process.env[fileVariable];
    if (!secretPath || process.env[variable]) {
      continue;
    }

    try {
      const secret = readFileSync(secretPath, 'utf8').replace(/[\r\n]+$/, '');
      if (!secret) {
        throw new Error(`Secret file ${secretPath} is empty`);
      }
      process.env[variable] = secret;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown file read error';
      logger.error(`Could not load ${variable} from ${fileVariable}: ${message}`);
      throw error;
    }
  }
}
