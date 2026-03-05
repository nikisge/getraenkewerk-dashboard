export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: "Desktop" | "Mobil" | "Tablet";
}

export function parseUserAgent(ua: string): DeviceInfo {
  // Browser detection
  let browser = "Unbekannt";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  // OS detection
  let os = "Unbekannt";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";
  else if (/Mac OS/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  // Device type detection
  let deviceType: DeviceInfo["deviceType"] = "Desktop";
  if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "Tablet";
  } else if (/iPhone|iPod|Android.*Mobile|webOS|BlackBerry/i.test(ua)) {
    deviceType = "Mobil";
  }

  return { browser, os, deviceType };
}
