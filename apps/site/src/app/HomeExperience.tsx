'use client';

import { useEffect, useState } from 'react';

import HomeLanding from '@/components/HomeLanding';
import TerminalGate from '@/components/TerminalGate';

const ENTERED_KEY = 'terminal-entered';

/**
 * 首页体验：每会话首访播放终端启动序列（回车/点击进入），之后直达主页
 * 终端覆盖层挂载在主页之上，避免水合不匹配（SSR 恒输出主页内容）
 */
export default function HomeExperience() {
  const [splash, setSplash] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(ENTERED_KEY) === '1';
    } catch {
      // 隐私模式视为已进入
    }
    // 客户端一次性初始化（sessionStorage 读取只能在挂载后做）

    if (!seen) setSplash(true);
  }, []);

  return (
    <>
      <HomeLanding />
      {splash && <TerminalGate onEnter={() => setSplash(false)} />}
    </>
  );
}
