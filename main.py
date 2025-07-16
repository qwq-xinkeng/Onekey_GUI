import os
import sys
import asyncio
import webbrowser
import time
from pathlib import Path
from src.main import main

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    try:
        print("正在启动Onekey GUI...")
        print("=" * 50)
        
        def open_browser():
            time.sleep(2)
            try:
                webbrowser.open('http://localhost:5000')
                print("浏览器已自动打开")
            except:
                print("无法自动打开浏览器，请手动访问: http://localhost:5000")
        
        import threading
        browser_thread = threading.Thread(target=open_browser)
        browser_thread.daemon = True
        browser_thread.start()
        
        # 启动Web应用
        from web.app import app, socketio
        socketio.run(app, host='0.0.0.0', port=5000, debug=False)
        
    except KeyboardInterrupt:
        print("\n程序已退出")
    except Exception as e:
        print(f"启动错误: {e}")
        input("按回车键退出...")

if __name__ == "__main__":
    main()
