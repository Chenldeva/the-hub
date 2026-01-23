# 结束任务工作流程规则

## 目的
当用户表示结束当天任务时，AI必须提醒用户执行GitHub和DigitalOcean服务器的同步步骤。

## 触发条件

当用户表示以下任何意思时，触发此规则：
- "今天任务完成了"
- "结束今天的工作"
- "任务完成了"
- "今天的工作做完了"
- "结束任务"
- 或其他明确的结束当天工作的表述

## 必须执行的动作

当触发条件满足时，AI必须：

1. **立即提醒用户执行结束任务检查清单**
2. **清晰列出以下两个步骤**：

### 步骤1：更新GitHub

在GitHub Desktop中：
1. 打开GitHub Desktop
2. 填写提交信息（Summary）
3. 点击 "Commit to main"
4. 点击 "Push origin"
5. ✅ 确认显示 "Pushed to origin/main"

### 步骤2：更新DigitalOcean服务器

在终端/SSH中执行：

**快速命令（一行）：**
```bash
ssh root@138.68.8.234
cd ~/ui-system && git pull && cd server && pm2 restart warehouse-server
```

**或分步执行：**
```bash
ssh root@138.68.8.234
cd ~/ui-system
git pull
cd server
pm2 restart warehouse-server
pm2 status  # 验证状态
```

## 提醒格式

AI应该使用友好的语气，例如：

"好的！在结束今天的工作前，请记得执行以下步骤确保代码已同步：

**[步骤1和步骤2的内容]**

执行完这些步骤后，代码就同步到GitHub和服务器了。下次在其他电脑上工作时，记得先执行 `git pull` 获取最新代码！"

## 参考文档

详细步骤请参考：
- `docs/END_OF_DAY_CHECKLIST.md` - 详细的结束任务检查清单
- `docs/END_OF_DAY_REMINDER.md` - 快速提醒文档

## 优先级

此规则为Project Rules，在用户表示结束任务时必须执行。

alwaysApply: true

