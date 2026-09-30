import { parseDeviceMeta } from '../device-meta';

/** UA → 设备特征解析（四个独立字段的正确性，断言值以 ua-parser-js v2 实际输出为准） */
describe('parseDeviceMeta', () => {
  it('iPhone Safari：mobile / Mobile Safari / iOS / iPhone', () => {
    const meta = parseDeviceMeta(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    );
    expect(meta.deviceType).toBe('mobile');
    expect(meta.browser).toBe('Mobile Safari 17');
    expect(meta.os).toBe('iOS 17.2');
    // iOS 拿不到具体型号，只有 iPhone
    expect(meta.deviceModel).toBe('iPhone');
  });

  it('Android Chrome：能拿到具体机型', () => {
    const meta = parseDeviceMeta(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
    );
    expect(meta.deviceType).toBe('mobile');
    expect(meta.browser).toBe('Mobile Chrome 129');
    expect(meta.os).toBe('Android 14');
    expect(meta.deviceModel).toBe('Pixel 8');
  });

  it('微信内置浏览器：WeChat + Android + 机型', () => {
    const meta = parseDeviceMeta(
      'Mozilla/5.0 (Linux; Android 13; 2210132C) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 XWEB/1160065 MicroMessenger/8.0.47.2560(0x28002F35)',
    );
    expect(meta.deviceType).toBe('mobile');
    expect(meta.browser).toBe('WeChat 8');
    expect(meta.os).toBe('Android 13');
    expect(meta.deviceModel).toBe('2210132C');
  });

  it('桌面 macOS Chrome：desktop / Chrome / macOS / Macintosh', () => {
    const meta = parseDeviceMeta(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    );
    expect(meta.deviceType).toBe('desktop');
    expect(meta.browser).toBe('Chrome 129');
    expect(meta.os).toBe('macOS 10.15.7');
    expect(meta.deviceModel).toBe('Macintosh');
  });

  it('空 UA 返回全 null', () => {
    const meta = parseDeviceMeta(undefined);
    expect(meta).toEqual({
      deviceType: null,
      browser: null,
      os: null,
      deviceModel: null,
    });
  });
});
