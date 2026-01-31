import path from 'node:path'
import fs from 'node:fs'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load environment variables from .env.local if it exists (local dev only)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const result = config({ path: envPath })
  console.log('Env path:', envPath)
  console.log('Dotenv result:', result.error ? result.error.message : 'loaded')
} else {
  console.log('No .env.local found, using environment variables from platform')
}
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  seed: {
    command: 'npx tsx prisma/seed.ts',
  },
})
