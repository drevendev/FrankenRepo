import { z } from 'zod';
import type { ModelConfig } from '@frankenrepo/adapters';
const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3001),
  HOST: z.string().default('127.0.0.1'),
  API_ALLOWED_ORIGINS: z
    .string()
    .default(
      'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3001,http://localhost:3001',
    ),
  MODEL_PROVIDER: z
    .enum(['disabled', 'cloudflare', 'ollama'])
    .default('disabled'),
  GITHUB_CACHE_TTL_SEC: z.coerce
    .number()
    .int()
    .min(0)
    .max(86400)
    .default(43200),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().min(1).max(3600).default(900),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(3).default(3),
  MAX_PARALLEL_RITUALS: z.coerce.number().int().min(1).max(2).default(1),
  MODEL_CALLS_PER_DAY: z.coerce.number().int().min(1).max(100).default(20),
  CF_ACCOUNT_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),
  CF_GEMMA_MODEL: z.string().default('@cf/google/gemma-4-26b-a4b-it'),
  OLLAMA_BASE_URL: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('gemma3:4b'),
  GITHUB_READ_TOKEN: z.string().optional(),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const c = configSchema.parse(env);
  const origins = c.API_ALLOWED_ORIGINS.split(',').map(
    (s) => new URL(s.trim()).origin,
  );
  const model: ModelConfig = {
    provider: c.MODEL_PROVIDER,
    cfAccountId: c.CF_ACCOUNT_ID,
    cfApiToken: c.CF_API_TOKEN,
    cfModel: c.CF_GEMMA_MODEL,
    ollamaBaseUrl: c.OLLAMA_BASE_URL,
    ollamaModel: c.OLLAMA_MODEL,
    maxCallsPerDay: c.MODEL_CALLS_PER_DAY,
  };
  return { ...c, origins, model };
}
export type Config = ReturnType<typeof readConfig>;
