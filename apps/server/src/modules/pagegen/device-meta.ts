import { UAParser } from 'ua-parser-js';

export interface DeviceMeta {
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  deviceModel: string | null;
}

/**
 * UA 解析为设备特征（四个独立字段，管理端分列展示）
 * - deviceType：mobile / tablet / desktop（UA 未声明移动设备视为桌面）
 * - browser：名称+主版本，如 "Chrome 129"；微信内置为 "MicroMessenger"
 * - os：如 "iOS 17" / "Android 14" / "Windows"
 * - deviceModel：Android 可精确到型号；iOS 只能得到 "iPhone"（苹果不给具体型号）
 */
export function parseDeviceMeta(ua?: string): DeviceMeta {
  if (!ua) {
    return { deviceType: null, browser: null, os: null, deviceModel: null };
  }

  const r = new UAParser(ua).getResult();

  return {
    deviceType: r.device.type || 'desktop',
    browser:
      [r.browser.name, r.browser.major].filter(Boolean).join(' ') || null,
    os: [r.os.name, r.os.version].filter(Boolean).join(' ') || null,
    deviceModel: r.device.model || null,
  };
}
