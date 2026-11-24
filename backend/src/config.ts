import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
  OTP_RESEND_SECONDS: z.coerce.number().int().min(1).max(600).default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  OTP_PEPPER: z.string().min(32),
  WEB_ORIGIN: z.string().default('http://localhost:8081'),
  MAIL_FROM: z.string().optional(),
  MAIL_API_KEY: z.string().optional(),
});

export const config = schema.parse(process.env);
if (config.NODE_ENV === 'production' && (!config.MAIL_FROM || !config.MAIL_API_KEY)) {
  throw new Error('MAIL_FROM and MAIL_API_KEY are required in production');
}
