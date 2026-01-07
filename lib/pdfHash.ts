import { createHash } from 'crypto'

// Compute SHA-256 hash of a file buffer
export function computeFileHash(buffer: Buffer): string {
  const hash = createHash('sha256')
  hash.update(buffer)
  return hash.digest('hex')
}

// Compute SHA-256 hash from a stream (for large files)
export async function computeHashFromStream(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const hash = createHash('sha256')
  const reader = stream.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    hash.update(value)
  }

  return hash.digest('hex')
}

// Compute hash from ArrayBuffer
export function computeHashFromArrayBuffer(buffer: ArrayBuffer): string {
  const hash = createHash('sha256')
  hash.update(Buffer.from(buffer))
  return hash.digest('hex')
}
