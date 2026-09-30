'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const BANNER =
  '███████╗██████╗██╗  ██╗██╗     ██████╗██████╗ ██╗  ██╗\n' +
  '██╔════╝██╔══██╗██║  ██║██║     ██╔════╝██╔══██╗██║  ██║\n' +
  '█████╗  ██████╔╝██║  ██║██║     ██║     ██████╔╝███████║\n' +
  '██╔══╝  ██╔══██╗██║  ██║██║     ██║     ██╔══██╗██╔══██║\n' +
  '███████╗██║  ██║███████║███████╗╚██████╗██║  ██║██║  ██║\n' +
  '╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝';

const BOOT_LINES = [
  'establishing encrypted channel ......... [ok]',
  'auth key  ****-****-fdcn  accepted',
  'mounting /home/fidlcn .................. [ok]',
  'loading interface  v2.6.0 .............. [ok]',
];

interface TermLine {
  key: number;
  cls: string;
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lineSeq = 0;

/**
 * 终端启动页 —— 移植自 fidlcn-homepages/04-terminal.html
 * 交互：PC 回车进入 / H5 点击任意处或按钮进入；提示符支持彩蛋指令
 */
export default function TerminalGate({ onEnter }: { onEnter: () => void }) {
  const router = useRouter();
  const [lines, setLines] = useState<TermLine[]>([]);
  const [phase, setPhase] = useState<'typing' | 'ready'>('typing');
  const [showReplay, setShowReplay] = useState(false);
  const [cmd, setCmd] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const runningRef = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const appendLine = (cls = '') => {
    const line = { key: lineSeq++, cls, text: '' };
    setLines((prev) => [...prev, line]);
    return line.key;
  };

  const patchLine = (key: number, text: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, text } : l)));
  };

  /** 打字机：逐字符写入指定行 */
  const typeInto = useCallback(
    async (key: number, text: string, speed = 26) => {
      for (let i = 1; i <= text.length; i++) {
        patchLine(key, text.slice(0, i));
        await sleep(speed + Math.random() * speed * 0.6);
      }
    },
    [],
  );

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase('typing');
    setShowReplay(false);
    setLines([]);

    await sleep(300);
    await typeInto(appendLine(), '$ ssh guest@fidlcn.dev', 24);
    await sleep(180);

    for (const b of BOOT_LINES) {
      const key = appendLine('dim');
      for (let i = 1; i <= b.length; i++) {
        patchLine(key, b.slice(0, i));
        await sleep(5);
      }
      await sleep(90);
    }

    await sleep(260);
    await typeInto(appendLine(), '$ whoami', 24);
    await sleep(320);
    await typeInto(appendLine(), 'fidlcn', 60);
    await sleep(500);

    // 清屏 → ASCII banner
    setLines([]);
    await sleep(160);

    const bannerKey = lineSeq++;
    setLines([{ key: bannerKey, cls: 'term-banner', text: '' }]);
    const rows = BANNER.split('\n');
    let acc = '';
    for (const row of rows) {
      for (let i = 1; i <= row.length; i++) {
        patchLine(bannerKey, acc + row.slice(0, i));
        await sleep(4);
      }
      acc += row + '\n';
      patchLine(bannerKey, acc);
      await sleep(52);
    }

    await sleep(320);
    await typeInto(appendLine('dim'), '> access granted — welcome home.', 18);
    await sleep(420);

    // shell 提示符就绪
    appendLine('term-prompt-line');
    setPhase('ready');
    setShowReplay(true);
    runningRef.current = false;
  }, [typeInto]);

  useEffect(() => {
    void run();
  }, [run]);

  /** 进入主页面（会话内记住，回首页不再播启动序列） */
  const enterHome = useCallback(() => {
    try {
      sessionStorage.setItem('terminal-entered', '1');
    } catch {
      // 隐私模式下忽略
    }
    onEnterRef.current();
  }, []);

  /** 彩蛋指令 */
  const execCommand = useCallback(
    async (raw: string) => {
      const input = raw.trim().toLowerCase();
      const echo = appendLine();
      patchLine(echo, `$ ${raw.trim()}`);

      const say = async (text: string, cls = 'dim') => {
        await typeInto(appendLine(cls), text, 10);
      };

      switch (input) {
        case '':
          break;
        case 'help':
          await say('available commands:', 'dim');
          await say('  home      进入主页（同回车）');
          await say('  blog      去博客');
          await say('  pages     去页面广场');
          await say('  about     去关于');
          await say('  gen       生成一个新页面');
          await say('  whoami    你是谁');
          await say('  clear     清屏');
          await say('  replay    重播启动序列');
          break;
        case 'home':
        case 'enter':
          enterHome();
          return;
        case 'blog':
        case 'pages':
        case 'about':
        case 'gen': {
          const target = `/${input}`;
          await say(`navigating to ${target} ...`);
          try {
            sessionStorage.setItem('terminal-entered', '1');
          } catch {
            // 隐私模式等场景下 sessionStorage 不可用，忽略
          }
          routerRef.current.push(target);
          return;
        }
        case 'whoami':
          await say('guest — but welcome anyway.', '');
          break;
        case 'clear':
          setLines([]);
          break;
        case 'replay':
          setCmd('');
          void run();
          return;
        default:
          await say(`command not found: ${input.trim()}  (try: help)`);
      }
      appendLine('term-prompt-line');
      setCmd('');
    },
    [enterHome, run, typeInto],
  );

  /** PC：回车进入（提示符有输入时执行指令） */
  useEffect(() => {
    if (phase !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (cmd.trim()) {
          void execCommand(cmd);
        } else {
          enterHome();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, cmd, enterHome, execCommand]);

  const handleOverlayPointer = (e: React.PointerEvent) => {
    if (phase !== 'ready') return;
    // 点到提示符输入区则聚焦输入（手机想打指令），其余任意位置=进入
    const target = e.target as HTMLElement;
    if (target.closest('.term-input-zone') || target.closest('.term-replay'))
      return;
    enterHome();
  };

  return (
    <div
      className="terminal-stage fixed inset-0 z-50 bg-[#020803] cursor-text"
      onPointerDown={handleOverlayPointer}
    >
      <div className="terminal-screen">
        {lines.map((l) =>
          l.cls === 'term-prompt-line' ? (
            <span key={l.key} className="term-line term-input-zone">
              <span className="term-prompt">fidlcn@home:~$ </span>
              <input
                ref={inputRef}
                className="term-input"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-label="terminal command"
              />
              <span className="term-caret" />
            </span>
          ) : l.cls === 'term-banner' ? (
            <span key={l.key} className="term-line term-banner">
              {l.text}
            </span>
          ) : (
            <span key={l.key} className={`term-line ${l.cls}`}>
              {l.text}
            </span>
          ),
        )}
      </div>

      <div className="scanlines" />
      <div className="vignette" />
      <div className="glowbar" />

      <button
        className={`term-enter ${phase === 'ready' ? 'show' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          enterHome();
        }}
      >
        ↵ 进入主页
      </button>
      <button
        className={`term-replay ${showReplay ? 'show' : ''}`}
        aria-label="重播启动序列"
        title="重播"
        onClick={(e) => {
          e.stopPropagation();
          setCmd('');
          void run();
        }}
      >
        ↻
      </button>
    </div>
  );
}
