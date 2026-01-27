---
title: 进度保存规则
alwaysApply: true
---

当用户表达“保存进度/记录进度/更新进度/保存工作/保存今日工作”等意图时，必须遵循以下规则：

0) 先读索引
- 在保存前先读取 `docs/index/INDEX.md` 与 `docs/index/INDEX.json`，确认索引结构与已有条目

1) 模块识别
- 依据用户指令或上下文识别模块：UI7 / UI1SO / UI2 / 其他
- 若无法识别，必须先询问“保存到哪个模块？”

2) 文件路径与命名
- 进度文件路径：`docs/progress/<module>-progress-YYYY-MM.md`
- module 取值：
  - UI7 -> ui7
  - UI1SO -> ui1so
  - UI2 -> ui2
  - 其他 -> other

3) 自动创建
- 若当月文件不存在，先创建并写入模板头部：
  - 标题：`# <模块> 月度进度（YYYY-MM）`
  - 记录规范：每次保存追加一条记录

4) 追加记录格式（固定）
```
### YYYY-MM-DD HH:mm
- 完成:
- 阻塞:
- 下一步:
- 备注:
```

5) 索引更新
- 若 `docs/index/INDEX.md` 或 `docs/index/INDEX.json` 缺少对应模块进度文件条目，必须补齐
- 索引条目指向当月进度文件路径

6) 不跑偏约束
- 进度只写入 `docs/progress/`，禁止写到其它目录
- 不创建碎片文件，不拆分为多日文件

7) 自动接续规则
- 当用户表达“开始今天工作/继续任务/开始工作/继续之前的任务”等意图时：
  - 先读取 `docs/index/INDEX.md` 与 `docs/index/INDEX.json`
  - 再读取对应模块当月进度文件
  - 输出：上次记录摘要 + 可继续的下一步建议
