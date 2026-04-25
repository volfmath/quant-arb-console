# Quick Start for Quant Arb Console

本文件是给“**未来的自己** 和 Claude / 其他模型”看的快速说明。

---

## 1. 如何在本地初始化并推送到 GitHub

假设你已经把这个仓库 clone 下来了：

```bash
# 如果你是新建的空仓库，把文档放好后再执行
git add .
git commit -m "Initial commit: docs"
git branch -M main
git remote add origin https://github.com/volfmath/quant-arb-console.git
git push -u origin main
```

---

## 2. 让 Claude 读取这个仓库

给 Claude 的推荐提示词：

```text
请访问并完整阅读这个 GitHub 仓库：
https://github.com/volfmath/quant-arb-console

从 README.md 开始阅读，然后依次阅读：
1. doc/product/01-product-overview.md
2. doc/architecture/01-system-architecture.md
3. doc/testing/01-verification-plan.md
（如果后续补了其他文档，也一并阅读）

在开始写任何代码之前，请先用你自己的话输出：
1. 你理解的系统目标和业务边界
2. 模块划分（前端、后端服务、数据层、风控等）
3. 当前文档中已经定义好的核心数据结构（只列出关键表/对象）
4. 页面结构（左侧菜单 + 核心页面）
5. 你认为还不清晰、需要我补充的地方

确认理解一致之前，不要生成代码。
```

---

## 3. 推荐阅读顺序（给人和模型都适用）

1. `README.md` — 总览，知道这仓库是干什么的  
2. `doc/product/01-product-overview.md` — 产品目标 / MVP 范围 / 角色  
3. `doc/architecture/01-system-architecture.md` — 系统整体结构和服务划分  
4. `doc/testing/01-verification-plan.md` — 每一步如何验证  
5. `doc/prompts/01-master-prompt.md` — 如何使用整个仓库去驱动 Claude 写方案/代码  

之后你可以按需扩展：

- 需要设计页面 → 补 `doc/frontend/*`  
- 需要设计表结构 → 补 `doc/database/*`  
- 需要设计接口 → 补 `doc/api/*`  
- 需要拆任务和排期 → 补 `doc/planning/*`
- 需要定义验收 → 补 `doc/testing/*`

---

## 4. 后续维护约定

- 所有文档统一使用 Markdown + 中文。
- 涉及字段/表/接口时尽量具体到字段名，而不是只写概念。
- 更新逻辑或结构时，优先更新：
  - `README.md`
  - `doc/product/01-product-overview.md`
  - `doc/architecture/01-system-architecture.md`
  - `doc/prompts/01-master-prompt.md`
  - `doc/testing/01-verification-plan.md`

这样 Claude 只要重新读一遍，就能对齐最新的系统设计。
