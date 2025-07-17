import os
import sys
import asyncio
import webbrowser
import time
import json
import threading
from pathlib import Path
from src.main import main

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def load_config():
    """加载配置文件"""
    config_path = Path("config.json")
    if not config_path.exists():
        return {"Show_Console": True}
    
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {"Show_Console": True}

def hide_console():
    """隐藏控制台窗口"""
    try:
        import ctypes
        import ctypes.wintypes
        
        # 获取当前控制台窗口句柄
        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32
        
        console_window = kernel32.GetConsoleWindow()
        if console_window:
            # 隐藏控制台窗口 (SW_HIDE = 0)
            user32.ShowWindow(console_window, 0)
    except:
        pass  # 如果隐藏失败，继续运行

def create_system_tray():
    """创建系统托盘"""
    try:
        import pystray
        from PIL import Image, ImageDraw
        
        # 获取配置以决定是否显示调试信息
        config = load_config()
        show_console = config.get("Show_Console", True)
        
        # 尝试使用项目中的图标文件
        def create_icon():
            try:
                # 使用脚本文件的目录而不是当前工作目录
                script_dir = Path(__file__).parent
                
                # 优先使用项目中的图标文件
                icon_path = script_dir / "icon.ico"
                if icon_path.exists():
                    if show_console:
                        print(f"使用图标文件: {icon_path}")
                    image = Image.open(icon_path)
                    # 确保图标大小适合系统托盘
                    if image.size != (32, 32):
                        image = image.resize((32, 32), Image.Resampling.LANCZOS)
                    return image
                
                # 如果 icon.ico 不存在，尝试 icon.jpg
                icon_jpg_path = script_dir / "icon.jpg"
                if icon_jpg_path.exists():
                    if show_console:
                        print(f"使用图标文件: {icon_jpg_path}")
                    image = Image.open(icon_jpg_path)
                    # 转换为RGBA模式以支持透明度
                    if image.mode != 'RGBA':
                        image = image.convert('RGBA')
                    # 调整大小
                    if image.size != (32, 32):
                        image = image.resize((32, 32), Image.Resampling.LANCZOS)
                    return image
                
                # 如果都没有图标文件，创建最简单的图标
                if show_console:
                    print("未找到图标文件，使用默认图标")
                return Image.new('RGBA', (32, 32), color=(30, 136, 229, 255))
                
            except Exception as e:
                if show_console:
                    print(f"加载图标失败: {e}")
                # 如果所有方法都失败，创建最简单的图标
                return Image.new('RGBA', (32, 32), color=(0, 0, 255, 255))
        
        def on_quit(icon, item):
            icon.stop()
            os._exit(0)
        
        def on_open_browser(icon, item):
            try:
                webbrowser.open('http://localhost:5000')
            except:
                pass
        
        def on_show_console(icon, item):
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                user32 = ctypes.windll.user32
                console_window = kernel32.GetConsoleWindow()
                if console_window:
                    user32.ShowWindow(console_window, 1)  # SW_NORMAL = 1
            except:
                pass
        
        # 创建托盘菜单
        menu = pystray.Menu(
            pystray.MenuItem("打开浏览器", on_open_browser),
            pystray.MenuItem("显示控制台", on_show_console),
            pystray.MenuItem("退出程序", on_quit)
        )
        
        # 创建托盘图标
        icon = pystray.Icon("Onekey GUI", create_icon(), menu=menu)
        
        # 在单独的线程中运行托盘
        def run_tray():
            icon.run()
        
        tray_thread = threading.Thread(target=run_tray)
        tray_thread.daemon = True
        tray_thread.start()
        
        return True
    except ImportError:
        return False

def main():
    try:
        config = load_config()
        show_console = config.get("Show_Console", True)
        
        if show_console:
            print("正在启动Onekey GUI...")
            print("=" * 50)
        
        # 如果不显示控制台，则隐藏窗口并创建系统托盘
        if not show_console:
            hide_console()
            tray_created = create_system_tray()
            # 注意：这里不再打印信息，因为控制台已经隐藏
        else:
            # 显示控制台模式下也可以创建系统托盘
            tray_created = create_system_tray()
            if tray_created:
                print("系统托盘已创建")
        
        def open_browser():
            time.sleep(2)
            try:
                webbrowser.open('http://localhost:5000')
                if show_console:
                    print("浏览器已自动打开")
            except:
                if show_console:
                    print("无法自动打开浏览器，请手动访问: http://localhost:5000")
        
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # 启动Web应用
        from web.app import app, socketio
        
        # 设置Flask日志级别
        if not show_console:
            import logging
            log = logging.getLogger('werkzeug')
            log.setLevel(logging.ERROR)
        
        socketio.run(app, host='0.0.0.0', port=5000, debug=False)
        
    except KeyboardInterrupt:
        if show_console:
            print("\n程序已退出")
    except Exception as e:
        if show_console:
            print(f"启动错误: {e}")
            input("按回车键退出...")
        else:
            # 如果隐藏控制台模式下出错，创建一个错误日志
            error_log = Path("error.log")
            with open(error_log, "w", encoding="utf-8") as f:
                f.write(f"启动失败: {e}\n")

if __name__ == "__main__":
    main()
