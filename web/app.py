import asyncio
import os
import sys
import threading
import time
from typing import List, Dict, Optional
from pathlib import Path

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from src.main import OnekeyApp
    from src.config import ConfigManager
except ImportError as e:
    print(f"导入错误: {e}")
    print("请确保在项目根目录中运行此程序")
    sys.exit(1)


class WebOnekeyApp:
    """Web版本的Onekey应用"""
    
    def __init__(self):
        self.onekey_app = None
        self.current_task = None
        self.task_status = "idle"  # idle, running, completed, error
        self.task_progress = []
        self.task_result = None
        
    def init_app(self):
        """初始化Onekey应用"""
        try:
            self.onekey_app = OnekeyApp()
            return True
        except Exception as e:
            return False, str(e)
    
    async def run_unlock_task(self, app_id: str, tool_type: str, version_lock: bool = False):
        """运行解锁任务"""
        try:
            self.task_status = "running"
            self.task_progress = []
            
            # 重新初始化应用以确保新的任务状态
            self.onekey_app = OnekeyApp()
            
            # 添加自定义日志处理器来捕获进度
            self._add_progress_handler()
            
            # 执行解锁任务
            result = await self.onekey_app.run_with_tool(app_id, tool_type, version_lock)
            
            if result:
                self.task_status = "completed"
                self.task_result = {"success": True, "message": "游戏解锁配置成功！重启Steam后生效"}
            else:
                self.task_status = "error"
                self.task_result = {"success": False, "message": "配置失败"}
            
        except Exception as e:
            self.task_status = "error"
            self.task_result = {"success": False, "message": f"配置失败: {str(e)}"}
        finally:
            # 确保应用资源被清理
            if hasattr(self, 'onekey_app') and self.onekey_app:
                try:
                    if hasattr(self.onekey_app, 'client'):
                        await self.onekey_app.client.close()
                except:
                    pass
            self.onekey_app = None
    
    def _add_progress_handler(self):
        """添加进度处理器"""
        if self.onekey_app and self.onekey_app.logger:
            original_info = self.onekey_app.logger.info
            original_warning = self.onekey_app.logger.warning
            original_error = self.onekey_app.logger.error
            
            def info_with_progress(msg):
                self.task_progress.append({"type": "info", "message": str(msg), "timestamp": time.time()})
                socketio.emit('task_progress', {"type": "info", "message": str(msg)})
                return original_info(msg)
            
            def warning_with_progress(msg):
                self.task_progress.append({"type": "warning", "message": str(msg), "timestamp": time.time()})
                socketio.emit('task_progress', {"type": "warning", "message": str(msg)})
                return original_warning(msg)
                
            def error_with_progress(msg):
                self.task_progress.append({"type": "error", "message": str(msg), "timestamp": time.time()})
                socketio.emit('task_progress', {"type": "error", "message": str(msg)})
                return original_error(msg)
            
            self.onekey_app.logger.info = info_with_progress
            self.onekey_app.logger.warning = warning_with_progress
            self.onekey_app.logger.error = error_with_progress


# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'onekey-gui-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# 创建Web应用实例
web_app = WebOnekeyApp()


@app.route('/')
def index():
    """主页"""
    return render_template('index.html')


@app.route('/api/init', methods=['POST'])
def init_app():
    """初始化应用"""
    result = web_app.init_app()
    if isinstance(result, tuple):
        return jsonify({"success": False, "message": result[1]})
    return jsonify({"success": True})


@app.route('/api/config')
def get_config():
    """获取配置信息"""
    try:
        config = ConfigManager()
        return jsonify({
            "success": True,
            "config": {
                "has_token": bool(config.app_config.github_token),
                "steam_path": str(config.steam_path) if config.steam_path else "",
                "debug_mode": config.app_config.debug_mode
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


@app.route('/api/start_unlock', methods=['POST'])
def start_unlock():
    """开始解锁任务"""
    data = request.get_json()
    app_id = data.get('app_id', '').strip()
    tool_type = data.get('tool_type', 'steamtools')
    version_lock = data.get('version_lock', False)
    
    if not app_id:
        return jsonify({"success": False, "message": "请输入有效的App ID"})
    
    # 验证App ID格式
    app_id_list = [id for id in app_id.split("-") if id.isdigit()]
    if not app_id_list:
        return jsonify({"success": False, "message": "App ID格式无效"})
    
    if web_app.task_status == "running":
        return jsonify({"success": False, "message": "已有任务正在运行"})
    
    # 在新线程中运行异步任务
    def run_task():
        try:
            # 使用 asyncio.run() 更安全地运行异步任务
            asyncio.run(web_app.run_unlock_task(app_id_list[0], tool_type, version_lock))
        except Exception as e:
            # 如果任务执行失败，更新状态
            web_app.task_status = "error"
            web_app.task_result = {"success": False, "message": f"任务执行失败: {str(e)}"}
    
    thread = threading.Thread(target=run_task)
    thread.daemon = True
    thread.start()
    
    return jsonify({"success": True, "message": "任务已开始"})


@app.route('/api/task_status')
def get_task_status():
    """获取任务状态"""
    return jsonify({
        "status": web_app.task_status,
        "progress": web_app.task_progress[-10:] if web_app.task_progress else [],  # 只返回最近10条
        "result": web_app.task_result
    })


@app.route('/settings')
def settings_page():
    """设置页面"""
    return render_template('settings.html')


@app.route('/api/config/update', methods=['POST'])
def update_config():
    """更新配置"""
    try:
        data = request.get_json()
        
        # 验证必需的字段
        if not isinstance(data, dict):
            return jsonify({"success": False, "message": "无效的配置数据"})
        
        # 加载当前配置
        config_manager = ConfigManager()
        
        # 准备新的配置数据
        new_config = {
            "Github_Personal_Token": data.get('github_token', ''),
            "Custom_Steam_Path": data.get('steam_path', ''),
            "Debug_Mode": data.get('debug_mode', False),
            "Logging_Files": data.get('logging_files', True),
            "Show_Console": data.get('show_console', True),
            "Help": "Github Personal Token可在GitHub设置的Developer settings中生成"
        }
        
        # 保存配置
        import json
        config_path = config_manager.config_path
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)
        
        return jsonify({"success": True, "message": "配置已保存"})
        
    except Exception as e:
        return jsonify({"success": False, "message": f"保存配置失败: {str(e)}"})


@app.route('/api/config/reset', methods=['POST'])
def reset_config():
    """重置配置为默认值"""
    try:
        from src.config import DEFAULT_CONFIG
        import json
        
        config_manager = ConfigManager()
        config_path = config_manager.config_path
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
        
        return jsonify({"success": True, "message": "配置已重置为默认值"})
        
    except Exception as e:
        return jsonify({"success": False, "message": f"重置配置失败: {str(e)}"})


@app.route('/api/config/detailed')
def get_detailed_config():
    """获取详细配置信息"""
    try:
        config = ConfigManager()
        return jsonify({
            "success": True,
            "config": {
                "github_token": config.app_config.github_token,
                "steam_path": str(config.steam_path) if config.steam_path else "",
                "debug_mode": config.app_config.debug_mode,
                "logging_files": config.app_config.logging_files,
                "show_console": config.app_config.show_console,
                "has_token": bool(config.app_config.github_token),
                "steam_path_exists": config.steam_path.exists() if config.steam_path else False
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})


@app.route('/author-preview')
def author_preview():
    """作者信息预览页面"""
    return render_template('author_preview.html')


@socketio.on('connect')
def handle_connect():
    """WebSocket连接"""
    emit('connected', {"message": "已连接到服务器"})


@socketio.on('disconnect')
def handle_disconnect():
    """WebSocket断开连接"""
    print('客户端断开连接')


if __name__ == '__main__':
    print("启动Onekey Web GUI...")
    print("请在浏览器中访问: http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
