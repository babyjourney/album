const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

const MAX_UINT32 = 0xffffffff
const MAX_ENTRIES = 0xffff

async function crc32OfBlob(blob) {
  let crc = 0xffffffff

  if (typeof blob.stream === 'function') {
    const reader = blob.stream().getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      for (let i = 0; i < value.length; i++) {
        crc = CRC_TABLE[(crc ^ value[i]) & 0xff] ^ (crc >>> 8)
      }
    }
  } else {
    const buf = new Uint8Array(await blob.arrayBuffer())
    for (let i = 0; i < buf.length; i++) {
      crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date()
  const year = Math.max(1980, d.getFullYear())
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

class ByteWriter {
  constructor() { this.bytes = [] }
  u16(v) { this.bytes.push(v & 0xff, (v >>> 8) & 0xff) }
  u32(v) { this.bytes.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff) }
  raw(arr) { for (const b of arr) this.bytes.push(b) }
  toUint8() { return new Uint8Array(this.bytes) }
}

const utf8 = (str) => new TextEncoder().encode(str)

const fillVars = (key, fallback, vars = {}) =>
  Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), fallback)

export async function buildZip(entries, onProgress, translate = fillVars) {
  if (entries.length > MAX_ENTRIES) {
    throw new Error(translate('exportErrTooManyFiles', 'Prea multe fișiere ({count}). Exportă un singur an.', { count: entries.length }))
  }

  const parts = []
  const central = []
  let offset = 0

  for (let i = 0; i < entries.length; i++) {
    const { path, blob, date } = entries[i]

    const nameBytes = utf8(path)
    const size = blob.size
    const crc = await crc32OfBlob(blob)
    const { time, date: dosDate } = dosDateTime(date)

    if (size > MAX_UINT32) {
      throw new Error(translate('exportErrFileTooLarge', 'Fișierul „{path}” depășește 4 GB și nu poate fi arhivat.', { path }))
    }

    const local = new ByteWriter()
    local.u32(0x04034b50)
    local.u16(20)
    local.u16(0x0800)
    local.u16(0)
    local.u16(time)
    local.u16(dosDate)
    local.u32(crc)
    local.u32(size)
    local.u32(size)
    local.u16(nameBytes.length)
    local.u16(0)
    local.raw(nameBytes)

    const localBytes = local.toUint8()
    parts.push(localBytes, blob)

    const cd = new ByteWriter()
    cd.u32(0x02014b50)
    cd.u16(20)
    cd.u16(20)
    cd.u16(0x0800)
    cd.u16(0)
    cd.u16(time)
    cd.u16(dosDate)
    cd.u32(crc)
    cd.u32(size)
    cd.u32(size)
    cd.u16(nameBytes.length)
    cd.u16(0)
    cd.u16(0)
    cd.u16(0)
    cd.u16(0)
    cd.u32(0)
    cd.u32(offset)
    cd.raw(nameBytes)
    central.push(cd.toUint8())

    offset += localBytes.length + size
    if (offset > MAX_UINT32) {
      throw new Error(translate('exportErrArchiveTooLarge', 'Arhiva depășește 4 GB. Exportă an cu an.'))
    }

    onProgress?.(i + 1, entries.length)
  }

  const centralStart = offset
  let centralSize = 0
  for (const rec of central) {
    parts.push(rec)
    centralSize += rec.length
  }

  const eocd = new ByteWriter()
  eocd.u32(0x06054b50)
  eocd.u16(0)
  eocd.u16(0)
  eocd.u16(central.length)
  eocd.u16(central.length)
  eocd.u32(centralSize)
  eocd.u32(centralStart)
  eocd.u16(0)
  parts.push(eocd.toUint8())

  return new Blob(parts, { type: 'application/zip' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
