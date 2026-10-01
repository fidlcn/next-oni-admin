import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // react-hooks/set-state-in-effect 豁免清单：这些文件需要"挂载后同步客户端
    // 状态"的既有模式（localStorage/sessionStorage 恢复、轮询前置 loading、
    // 终端开演），重构代价大于收益；规则对其余文件保持开启。
    // 注意用配置而非行内 eslint-disable：根目录 lint-staged 的 eslint 配置
    // 未启用该规则，行内注释会被当作未使用指令自动删除。
    files: [
      "src/app/HomeExperience.tsx",
      "src/app/gen/GenForm.tsx",
      "src/app/pages/DirectoryBrowser.tsx",
      "src/components/TerminalGate.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
