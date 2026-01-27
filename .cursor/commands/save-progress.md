# save-progress

当用户要求保存进度时，执行以下步骤：

1) 识别模块（UI7 / UI1SO / UI2 / 其他）
2) 目标文件：`docs/progress/<module>-progress-YYYY-MM.md`
3) 若文件不存在：创建并写入模板头部（标题+记录规范）
4) 在文件末尾追加一条记录（格式固定）
5) 检查并更新索引：
   - `docs/index/INDEX.md`
   - `docs/index/INDEX.json`

记录格式：
```
### YYYY-MM-DD HH:mm
- 完成:
- 阻塞:
- 下一步:
- 备注:
```
