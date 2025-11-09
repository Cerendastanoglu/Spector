#!/usr/bin/env node
/* eslint-env node */

import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const env = { ...process.env }

// Check if we're using PostgreSQL or SQLite
const isPostgres = env.DATABASE_URL && env.DATABASE_URL.startsWith('postgres');

if (!isPostgres) {
  // SQLite setup: place database on volume
  const source = path.resolve('/dev.sqlite')
  const target = '/data/' + path.basename(source)
  if (!fs.existsSync(source) && fs.existsSync('/data')) fs.symlinkSync(target, source)
  const newDb = !fs.existsSync(target)
  if (newDb && process.env.BUCKET_NAME) {
    await exec(`npx litestream restore -config litestream.yml -if-replica-exists ${target}`)
  }
}

// prepare database
// Skip migrations entirely if SKIP_MIGRATIONS is set (emergency bypass for broken migrations)
if (process.env.SKIP_MIGRATIONS === 'true') {
  console.log('⚠️  SKIP_MIGRATIONS enabled - Bypassing database migrations!')
  console.log('⚠️  WARNING: App may not work correctly if schema is out of sync!')
} else if (isPostgres && process.env.FORCE_DB_RESET === 'true') {
  console.log('🔄 FORCE_DB_RESET enabled - Resetting database...')
  await exec('npx prisma migrate reset --force --skip-seed')
} else {
  await exec('npx prisma migrate deploy')
}

// launch application
if (!isPostgres && process.env.BUCKET_NAME) {
  await exec(`npx litestream replicate -config litestream.yml -exec ${JSON.stringify(process.argv.slice(2).join(' '))}`)
} else {
  await exec(process.argv.slice(2).join(' '))
}

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}
