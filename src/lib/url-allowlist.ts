const BLOCKED_IP_RANGES: RegExp[] = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^ff00:/,
  /^::ffff:127\./,
  /^::ffff:10\./,
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./,
  /^::ffff:192\.168\./,
  /^::ffff:169\.254\./,
];

const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "169.254.169.254",
  "0.0.0.0",
];

export async function isUrlSafe(
  urlString: string
): Promise<{ safe: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { safe: false, reason: `Protocol "${url.protocol}" is not allowed` };
  }

  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { safe: false, reason: `Hostname "${hostname}" is blocked` };
  }

  // Check if hostname is an IP address
  const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (ipRegex.test(hostname)) {
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return {
          safe: false,
          reason: `IP address "${hostname}" is in a blocked range`,
        };
      }
    }
  }

  // Block common cloud metadata endpoints
  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    return {
      safe: false,
      reason: `Hostname "${hostname}" resolves to an internal address`,
    };
  }

  try {
    const { lookup } = await import("dns").then((m) =>
      m.promises ? m.promises : { lookup: m.lookup }
    );
    const { address } = await new Promise<{ address: string }>((resolve, reject) => {
      lookup(hostname, { family: 4 }, (err, addr) => {
        if (err) reject(err);
        else resolve({ address: addr });
      });
    });

    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(address)) {
        return {
          safe: false,
          reason: `Hostname "${hostname}" resolves to blocked IP "${address}"`,
        };
      }
    }
  } catch {
    // DNS resolution failed — block by default
    return {
      safe: false,
      reason: `Could not resolve hostname "${hostname}"`,
    };
  }

  return { safe: true };
}
