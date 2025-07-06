# Onekey GUI 使用说明

## 简介

此项目基于原项目[Onekey](https://github.com/ikunshare/Onekey/ "Onekey项目地址")添加GUI制作 UI由Flask驱动

## 功能特性

- 🎨 **Material Design 3.0** - 现代化的界面设计
- 🌐 **Web 界面** - 支持任何现代浏览器访问
- 📱 **响应式设计** - 完美适配桌面和移动设备
- 🔄 **实时进度** - WebSocket 实时显示任务执行进度
- ⚙️ **配置检查** - 自动检查配置状态
- 📊 **日志显示** - 实时显示详细的操作日志


## 安装依赖

在进行开发之前，请确保安装了所有必要的依赖：

```bash
pip install -r requirements.txt
```

## 使用方法

1. 启动程序后，浏览器会自动打开 `http://localhost:5000`
2. 检查配置状态，确保 Steam 路径等配置正确
3. 输入要解锁的游戏 App ID
4. 选择解锁工具（SteamTools 或 GreenLuma）
5. 如果选择 SteamTools，可以选择是否锁定版本
6. 点击"开始解锁"按钮
7. 在日志区域实时查看任务执行进度
8. 任务完成后，重启 Steam 使配置生效

## 浏览器兼容性

支持所有现代浏览器：
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 端口配置

默认运行在 `http://localhost:5000`，如需更改端口，请修改 `web/app.py` 文件中的端口设置。

## 故障排除

### 常见问题

1. **无法访问 Web 界面**
   - 检查防火墙设置
   - 确认端口 5000 未被占用
   - 尝试使用 `http://127.0.0.1:5000`

2. **依赖安装失败**
   - 检查网络连接
   - 尝试使用国内 pip 镜像源
   - 确认 Python 版本 >= 3.8

3. **配置错误**
   - 检查 `config.json` 文件格式
   - 确认 Steam 安装路径正确
   - 检查 GitHub Token 配置

## 开发说明

项目结构：
```
web/
├── app.py              # Flask 应用主文件
├── templates/
│   └── index.html      # HTML 模板
└── static/
    ├── css/
    │   └── style.css   # 样式文件
    └── js/
        └── app.js      # 前端 JavaScript
```
## 说明
此项目没有对Onekey功能性代码做出任何更改 原项目的所有文件都在这个项目里 除了main.py被改名为main_o.py外连名字都没有改 所以如有功能性问题请先尝试在原版Onekey复现 如复现失败再与我反馈 谢谢

## 免责声明
本项目部分代码和此README的大部分使用AI编写 若存在侵权请与我联系
