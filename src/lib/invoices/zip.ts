import "server-only";

import { crc32 } from "node:zlib";

/**
 * Minimal ZIP writer using the STORED (uncompressed) method.
 *
 * PDFs are already compressed internally, so STORED gives near-identical size
 * to DEFLATE while being much cheaper on CPU/memory — critical for large
 * multi-hundred-invoice archives on serverless.
 *
 * Uses ZIP64 for archives that overflow 32-bit sizes / offsets so we don't
 * silently corrupt >4 GB downloads or archives with >65,535 files.
 */

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_HEADER_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIR_SIG = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIG = 0x07064b50;
const ZIP64_EXTRA_FIELD_ID = 0x0001;
const VERSION_STORED = 20;
const VERSION_ZIP64 = 45;
const UINT32_MAX = 0xffffffff;
const UINT16_MAX = 0xffff;

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

type CentralEntry = {
  nameBytes: Buffer;
  crc: number;
  size: number;
  offset: number;
  dosTime: number;
  dosDate: number;
};

function toDosDateTime(d: Date): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, d.getFullYear());
  const dosDate = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | Math.max(1, d.getDate());
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  return { dosTime, dosDate };
}

/** Build a STORED (uncompressed) ZIP archive in memory. */
export function buildStoredZip(entries: ZipEntry[]): Buffer {
  const now = new Date();
  const { dosTime, dosDate } = toDosDateTime(now);

  const chunks: Buffer[] = [];
  const central: CentralEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const size = data.byteLength;
    const crc = crc32(data);
    const needsZip64 = size > UINT32_MAX;

    // ZIP64 extra field in local header (holds true 64-bit sizes when required).
    const zip64Local = needsZip64
      ? (() => {
          const buf = Buffer.alloc(4 + 16);
          buf.writeUInt16LE(ZIP64_EXTRA_FIELD_ID, 0);
          buf.writeUInt16LE(16, 2);
          buf.writeBigUInt64LE(BigInt(size), 4); // uncompressed size
          buf.writeBigUInt64LE(BigInt(size), 12); // compressed size (STORED == uncompressed)
          return buf;
        })()
      : Buffer.alloc(0);

    // Local file header.
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0);
    localHeader.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_STORED, 4);
    localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag: bit 11 = UTF-8 filename.
    localHeader.writeUInt16LE(0, 8); // Compression: 0 = STORED.
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc >>> 0, 14);
    localHeader.writeUInt32LE(needsZip64 ? UINT32_MAX : size, 18); // compressed size
    localHeader.writeUInt32LE(needsZip64 ? UINT32_MAX : size, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(zip64Local.length, 28);

    central.push({
      nameBytes,
      crc: crc >>> 0,
      size,
      offset,
      dosTime,
      dosDate,
    });

    chunks.push(localHeader);
    chunks.push(nameBytes);
    if (zip64Local.length > 0) chunks.push(zip64Local);
    chunks.push(Buffer.from(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength));

    offset += localHeader.length + nameBytes.length + zip64Local.length + size;
  }

  const centralStart = offset;

  for (const c of central) {
    const needsZip64 = c.size > UINT32_MAX || c.offset > UINT32_MAX;
    let zip64Extra: Buffer = Buffer.alloc(0);
    if (needsZip64) {
      const fields: Buffer[] = [];
      if (c.size > UINT32_MAX) {
        const b = Buffer.alloc(16);
        b.writeBigUInt64LE(BigInt(c.size), 0);
        b.writeBigUInt64LE(BigInt(c.size), 8);
        fields.push(b);
      }
      if (c.offset > UINT32_MAX) {
        const b = Buffer.alloc(8);
        b.writeBigUInt64LE(BigInt(c.offset), 0);
        fields.push(b);
      }
      const payload = Buffer.concat(fields);
      zip64Extra = Buffer.alloc(4 + payload.length);
      zip64Extra.writeUInt16LE(ZIP64_EXTRA_FIELD_ID, 0);
      zip64Extra.writeUInt16LE(payload.length, 2);
      payload.copy(zip64Extra, 4);
    }

    const header = Buffer.alloc(46);
    header.writeUInt32LE(CENTRAL_DIR_HEADER_SIG, 0);
    header.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_STORED, 4); // version made by
    header.writeUInt16LE(needsZip64 ? VERSION_ZIP64 : VERSION_STORED, 6); // version needed
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(c.dosTime, 12);
    header.writeUInt16LE(c.dosDate, 14);
    header.writeUInt32LE(c.crc, 16);
    header.writeUInt32LE(needsZip64 && c.size > UINT32_MAX ? UINT32_MAX : c.size, 20);
    header.writeUInt32LE(needsZip64 && c.size > UINT32_MAX ? UINT32_MAX : c.size, 24);
    header.writeUInt16LE(c.nameBytes.length, 28);
    header.writeUInt16LE(zip64Extra.length, 30);
    header.writeUInt16LE(0, 32); // file comment length
    header.writeUInt16LE(0, 34); // disk start
    header.writeUInt16LE(0, 36); // internal attrs
    header.writeUInt32LE(0, 38); // external attrs
    header.writeUInt32LE(needsZip64 && c.offset > UINT32_MAX ? UINT32_MAX : c.offset, 42);

    chunks.push(header);
    chunks.push(c.nameBytes);
    if (zip64Extra.length > 0) chunks.push(zip64Extra);
    offset += header.length + c.nameBytes.length + zip64Extra.length;
  }

  const centralSize = offset - centralStart;
  const needsZip64Eocd =
    central.length > UINT16_MAX ||
    centralSize > UINT32_MAX ||
    centralStart > UINT32_MAX;

  if (needsZip64Eocd) {
    // ZIP64 End of Central Directory Record.
    const zip64Eocd = Buffer.alloc(56);
    zip64Eocd.writeUInt32LE(ZIP64_END_OF_CENTRAL_DIR_SIG, 0);
    zip64Eocd.writeBigUInt64LE(BigInt(44), 4); // size of zip64 EOCD record - 12
    zip64Eocd.writeUInt16LE(VERSION_ZIP64, 12);
    zip64Eocd.writeUInt16LE(VERSION_ZIP64, 14);
    zip64Eocd.writeUInt32LE(0, 16);
    zip64Eocd.writeUInt32LE(0, 20);
    zip64Eocd.writeBigUInt64LE(BigInt(central.length), 24);
    zip64Eocd.writeBigUInt64LE(BigInt(central.length), 32);
    zip64Eocd.writeBigUInt64LE(BigInt(centralSize), 40);
    zip64Eocd.writeBigUInt64LE(BigInt(centralStart), 48);
    chunks.push(zip64Eocd);

    // ZIP64 End of Central Directory Locator.
    const locator = Buffer.alloc(20);
    locator.writeUInt32LE(ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIG, 0);
    locator.writeUInt32LE(0, 4);
    locator.writeBigUInt64LE(BigInt(offset), 8);
    locator.writeUInt32LE(1, 16);
    chunks.push(locator);
    offset += zip64Eocd.length + locator.length;
  }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(END_OF_CENTRAL_DIR_SIG, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(central.length > UINT16_MAX ? UINT16_MAX : central.length, 8);
  eocd.writeUInt16LE(central.length > UINT16_MAX ? UINT16_MAX : central.length, 10);
  eocd.writeUInt32LE(centralSize > UINT32_MAX ? UINT32_MAX : centralSize, 12);
  eocd.writeUInt32LE(centralStart > UINT32_MAX ? UINT32_MAX : centralStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length
  chunks.push(eocd);

  return Buffer.concat(chunks);
}
