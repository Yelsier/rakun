import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { gunzip, gzip } from 'node:zlib'

import type {
  CompressionProvider,
  CryptoProvider,
  FilesystemProvider,
  WorkersProvider,
} from './types'

export const nodeCrypto = (): CryptoProvider => ({
  randomBytes,
  randomUUID,
  hash: (algorithm, value, encoding) => createHash(algorithm).update(value).digest(encoding),
  hmac: (algorithm, secret, value, encoding) =>
    createHmac(algorithm, secret).update(value).digest(encoding),
  timingSafeEqual,
})

export const nodeFilesystem = (): FilesystemProvider => ({
  makeTemporaryDirectory: (prefix) => mkdtemp(path.join(os.tmpdir(), prefix)),
  readFile,
  writeFile,
  remove: rm,
})

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

export const nodeCompression = (): CompressionProvider => ({
  gzip: gzipAsync,
  gunzip: gunzipAsync,
})

export const nodeWorkers = (): WorkersProvider => ({
  runProcess(executable, args, options) {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, [...args], {
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: options?.windowsHide ?? true,
      })
      let stderr = ''
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr = `${stderr}${String(chunk)}`.slice(-16_384)
      })
      child.on('error', reject)
      child.on('close', (exitCode) => resolve({ exitCode, stderr }))
    })
  },
})
