// Minimal ZIP writer (item 8).
//
// WHY NOT A LIBRARY
// -----------------
// The only thing we need is to put already-compressed bytes (JPEG, MP4, MP3)
// into one container. Deflating them again buys ~0% and costs CPU, so every
// entry is written with method 0 (STORE). That makes the format small enough to
// implement directly — no jszip, no new dependency, no bundle weight.
//
// MEMORY
// ------
// The archive is assembled as a Blob built from a list of parts, where each
// file's part is the Blob we fetched from storage. Browsers keep large Blobs on
// disk, so a multi-gigabyte export never has to fit in JS heap. We only ever
// hold one chunk at a time, while computing that entry's CRC.
//
// LIMITS
// ------
// Classic ZIP (no ZIP64): up to 65,535 entries and 4GB per file / per archive.
// buildZip throws if an export would exceed that, and the caller tells the user
// to export a single year instead. A family-year is far below this, especially
// now that videos are transcoded on upload.

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

// CRC32 over a Blob, read in chunks so we never materialize the whole file.
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
    // Safari fallback: no Blob.stream().
    const buf = new Uint8Array(await blob.arrayBuffer())
    for (let i = 0; i < buf.length; i++) {
      crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

// ZIP stores timestamps in MS-DOS format: 2-second resolution, epoch 1980.
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

/**
 * Build a ZIP archive.
 *
 * @param {Array<{path: string, blob: Blob, date?: Date}>} entries
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<Blob>}
 */
export async function buildZip(entries, onProgress) {
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Prea multe fișiere (${entries.length}). Exportă un singur an.`)
  }

  const parts = []          // Blob parts, in file order
  const central = []        // central directory records
  let offset = 0            // running offset of the next local header

  for (let i = 0; i < entries.length; i++) {
    const { path, blob, date } = entries[i]

    const nameBytes = utf8(path)
    const size = blob.size
    const crc = await crc32OfBlob(blob)
    const { time, date: dosDate } = dosDateTime(date)

    if (size > MAX_UINT32) {
      throw new Error(`Fișierul „${path}" depășește 4GB și nu poate fi arhivat.`)
    }

    // Local file header
    const local = new ByteWriter()
    local.u32(0x04034b50)
    local.u16(20)            // version needed
    local.u16(0x0800)        // flags: bit 11 = UTF-8 filenames
    local.u16(0)             // method: 0 = STORE
    local.u16(time)
    local.u16(dosDate)
    local.u32(crc)
    local.u32(size)          // compressed == uncompressed for STORE
    local.u32(size)
    local.u16(nameBytes.length)
    local.u16(0)             // extra field length
    local.raw(nameBytes)

    const localBytes = local.toUint8()
    parts.push(localBytes, blob)

    // Central directory record (written after all files)
    const cd = new ByteWriter()
    cd.u32(0x02014b50)
    cd.u16(20)               // version made by
    cd.u16(20)               // version needed
    cd.u16(0x0800)
    cd.u16(0)
    cd.u16(time)
    cd.u16(dosDate)
    cd.u32(crc)
    cd.u32(size)
    cd.u32(size)
    cd.u16(nameBytes.length)
    cd.u16(0)                // extra
    cd.u16(0)                // comment
    cd.u16(0)                // disk number
    cd.u16(0)                // internal attrs
    cd.u32(0)                // external attrs
    cd.u32(offset)           // offset of local header
    cd.raw(nameBytes)
    central.push(cd.toUint8())

    offset += localBytes.length + size
    if (offset > MAX_UINT32) {
      throw new Error('Arhiva depășește 4GB. Exportă an cu an.')
    }

    onProgress?.(i + 1, entries.length)
  }

  const centralStart = offset
  let centralSize = 0
  for (const rec of central) {
    parts.push(rec)
    centralSize += rec.length
  }

  // End of central directory
  const eocd = new ByteWriter()
  eocd.u32(0x06054b50)
  eocd.u16(0)                    // disk number
  eocd.u16(0)                    // disk with central dir
  eocd.u16(central.length)       // entries on this disk
  eocd.u16(central.length)       // total entries
  eocd.u32(centralSize)
  eocd.u32(centralStart)
  eocd.u16(0)                    // comment length
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
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in some browsers before it has started reading.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
