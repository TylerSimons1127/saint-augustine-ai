export const MAX_BACKUP_BYTES = 5_000_000;
// The browser app stores its data in localStorage (normally capped at 5 MiB
// per origin). JSON export adds a little structure around those stored values.
export const MAX_WEB_EXPORT_BYTES = 10_000_000;

export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x7f) bytes += 1;
    else if (unit <= 0x7ff) bytes += 2;
    else if (
      unit >= 0xd800 &&
      unit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index++;
    } else bytes += 3;
  }
  return bytes;
}

export function assertBackupSize(value: string, knownByteSize?: number | null) {
  const actualBytes = utf8ByteLength(value);
  const byteSize =
    typeof knownByteSize === "number" && Number.isFinite(knownByteSize)
      ? Math.max(actualBytes, knownByteSize)
      : actualBytes;
  if (byteSize > MAX_BACKUP_BYTES) {
    throw Error(
      "This backup is larger than 5 MB. Remove older conversations or saved reflections, then try again.",
    );
  }
}

export function assertWebExportSize(value: string) {
  if (utf8ByteLength(value) > MAX_WEB_EXPORT_BYTES) {
    throw Error(
      "This export is larger than 10 MB and could not be prepared for sharing.",
    );
  }
}
