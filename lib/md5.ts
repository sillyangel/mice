const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];

const MD5_K: number[] = (() => {
  const K = new Array<number>(64);
  for (let i = 0; i < 64; i++) {
    K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  }
  return K;
})();

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i) as number;
    if (code > 0xffff) {
      i++;
    }
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
}

export function md5(input: string): string {
  const msg = toUtf8Bytes(input);
  const bitLen = msg.length * 8;

  msg.push(0x80);
  while (msg.length % 64 !== 56) {
    msg.push(0);
  }
  msg.push(0, 0, 0, 0, 0, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    msg.push((bitLen >>> (i * 8)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < msg.length; offset += 64) {
    const M = new Array<number>(16);
    for (let i = 0; i < 16; i++) {
      M[i] =
        msg[offset + i * 4] |
        (msg[offset + i * 4 + 1] << 8) |
        (msg[offset + i * 4 + 2] << 16) |
        (msg[offset + i * 4 + 3] << 24);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + MD5_K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, MD5_S[i])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const toHex = (n: number): string => {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
    }
    return hex;
  };

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

export function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buffer);
  } else {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}