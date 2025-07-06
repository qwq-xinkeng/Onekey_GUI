class OnekeyWebApp {
    constructor() {
        this.socket = null;
        this.taskStatus = 'idle';
        this.initializeSocket();
        this.initializeEventListeners();
        this.checkConfig();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showSnackbar('已连接到服务器', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showSnackbar('与服务器连接断开', 'error');
        });

        this.socket.on('task_progress', (data) => {
            this.addLogEntry(data.type, data.message);
        });
    }

    initializeEventListeners() {
        // 表单提交
        const unlockForm = document.getElementById('unlockForm');
        unlockForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startUnlockTask();
        });

        // 重置按钮
        const resetBtn = document.getElementById('resetBtn');
        resetBtn.addEventListener('click', () => {
            this.resetForm();
        });

        // 清空日志按钮
        const clearLogBtn = document.getElementById('clearLogBtn');
        clearLogBtn.addEventListener('click', () => {
            this.clearLogs();
        });

        // 工具类型切换
        const toolTypeRadios = document.querySelectorAll('input[name="toolType"]');
        toolTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.toggleVersionLock();
            });
        });

        // Snackbar关闭
        const snackbarClose = document.getElementById('snackbarClose');
        snackbarClose.addEventListener('click', () => {
            this.hideSnackbar();
        });

        // 初始化版本锁定显示
        this.toggleVersionLock();
    }

    async checkConfig() {
        const configStatus = document.getElementById('configStatus');
        
        try {
            const response = await fetch('/api/config');
            const data = await response.json();

            if (data.success) {
                configStatus.innerHTML = this.generateConfigStatusHTML(data.config);
            } else {
                configStatus.innerHTML = `
                    <div class="status-item">
                        <span class="material-icons status-icon error">error</span>
                        <span class="status-text">配置加载失败: ${data.message}</span>
                    </div>
                `;
            }
        } catch (error) {
            configStatus.innerHTML = `
                <div class="status-item">
                    <span class="material-icons status-icon error">error</span>
                    <span class="status-text">无法连接到服务器</span>
                </div>
            `;
        }
    }

    generateConfigStatusHTML(config) {
        const items = [];

        // GitHub Token状态
        if (config.has_token) {
            items.push(`
                <div class="status-item">
                    <span class="material-icons status-icon success">check_circle</span>
                    <span class="status-text">GitHub Token已配置</span>
                </div>
            `);
        } else {
            items.push(`
                <div class="status-item">
                    <span class="material-icons status-icon warning">warning</span>
                    <span class="status-text">GitHub Token未配置（可能影响下载速度）</span>
                </div>
            `);
        }

        // Steam路径状态
        if (config.steam_path) {
            items.push(`
                <div class="status-item">
                    <span class="material-icons status-icon success">check_circle</span>
                    <span class="status-text">Steam路径: ${config.steam_path}</span>
                </div>
            `);
        } else {
            items.push(`
                <div class="status-item">
                    <span class="material-icons status-icon error">error</span>
                    <span class="status-text">Steam路径未找到</span>
                </div>
            `);
        }

        // 调试模式状态
        if (config.debug_mode) {
            items.push(`
                <div class="status-item">
                    <span class="material-icons status-icon warning">bug_report</span>
                    <span class="status-text">调试模式已启用</span>
                </div>
            `);
        }

        return items.join('');
    }

    toggleVersionLock() {
        const selectedTool = document.querySelector('input[name="toolType"]:checked').value;
        const versionLockGroup = document.getElementById('versionLockGroup');
        
        if (selectedTool === 'steamtools') {
            versionLockGroup.classList.add('show');
        } else {
            versionLockGroup.classList.remove('show');
            document.getElementById('versionLock').checked = false;
        }
    }

    async startUnlockTask() {
        if (this.taskStatus === 'running') {
            this.showSnackbar('已有任务正在运行', 'warning');
            return;
        }

        const formData = new FormData(document.getElementById('unlockForm'));
        const appId = formData.get('appId').trim();
        const toolType = formData.get('toolType');
        const versionLock = formData.get('versionLock') === 'on';

        if (!appId) {
            this.showSnackbar('请输入App ID', 'error');
            return;
        }

        // 验证App ID格式
        const appIdPattern = /^[\d-]+$/;
        if (!appIdPattern.test(appId)) {
            this.showSnackbar('App ID格式无效，应为数字或用-分隔的数字', 'error');
            return;
        }

        this.taskStatus = 'running';
        this.updateUIForRunningTask();
        this.clearLogs();
        this.addLogEntry('info', `开始处理游戏 ${appId}...`);

        try {
            const response = await fetch('/api/start_unlock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: appId,
                    tool_type: toolType,
                    version_lock: versionLock
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSnackbar('任务已开始', 'success');
                this.startStatusPolling();
            } else {
                this.taskStatus = 'idle';
                this.updateUIForIdleTask();
                this.showSnackbar(data.message, 'error');
                this.addLogEntry('error', data.message);
            }
        } catch (error) {
            this.taskStatus = 'idle';
            this.updateUIForIdleTask();
            this.showSnackbar('启动任务失败', 'error');
            this.addLogEntry('error', `启动任务失败: ${error.message}`);
        }
    }

    startStatusPolling() {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/task_status');
                const data = await response.json();

                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    this.taskStatus = 'completed';
                    this.updateUIForIdleTask();
                    
                    if (data.result && data.result.success) {
                        this.showSnackbar(data.result.message, 'success');
                        this.addLogEntry('info', data.result.message);
                    } else if (data.result) {
                        this.showSnackbar(data.result.message, 'error');
                        this.addLogEntry('error', data.result.message);
                    }
                } else if (data.status === 'error') {
                    clearInterval(pollInterval);
                    this.taskStatus = 'error';
                    this.updateUIForIdleTask();
                    
                    if (data.result) {
                        this.showSnackbar(data.result.message, 'error');
                        this.addLogEntry('error', data.result.message);
                    }
                }
            } catch (error) {
                console.error('Status polling error:', error);
            }
        }, 1000);
    }

    updateUIForRunningTask() {
        const unlockBtn = document.getElementById('unlockBtn');
        const resetBtn = document.getElementById('resetBtn');
        const appIdInput = document.getElementById('appId');
        const toolTypeRadios = document.querySelectorAll('input[name="toolType"]');
        const versionLockCheckbox = document.getElementById('versionLock');

        unlockBtn.disabled = true;
        unlockBtn.innerHTML = `
            <span class="material-icons">hourglass_empty</span>
            执行中...
        `;

        resetBtn.disabled = true;
        appIdInput.disabled = true;
        toolTypeRadios.forEach(radio => radio.disabled = true);
        versionLockCheckbox.disabled = true;
    }

    updateUIForIdleTask() {
        const unlockBtn = document.getElementById('unlockBtn');
        const resetBtn = document.getElementById('resetBtn');
        const appIdInput = document.getElementById('appId');
        const toolTypeRadios = document.querySelectorAll('input[name="toolType"]');
        const versionLockCheckbox = document.getElementById('versionLock');

        unlockBtn.disabled = false;
        unlockBtn.innerHTML = `
            <span class="material-icons">play_arrow</span>
            开始解锁
        `;

        resetBtn.disabled = false;
        appIdInput.disabled = false;
        toolTypeRadios.forEach(radio => radio.disabled = false);
        versionLockCheckbox.disabled = false;
    }

    resetForm() {
        if (this.taskStatus === 'running') {
            this.showSnackbar('任务运行中，无法重置', 'warning');
            return;
        }

        document.getElementById('unlockForm').reset();
        document.querySelector('input[name="toolType"][value="steamtools"]').checked = true;
        this.toggleVersionLock();
        this.clearLogs();
        this.showSnackbar('表单已重置', 'success');
    }

    addLogEntry(type, message) {
        const progressContainer = document.getElementById('progressContainer');
        const placeholder = progressContainer.querySelector('.progress-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }

        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;

        progressContainer.appendChild(logEntry);
        progressContainer.scrollTop = progressContainer.scrollHeight;
    }

    clearLogs() {
        const progressContainer = document.getElementById('progressContainer');
        progressContainer.innerHTML = `
            <div class="progress-placeholder">
                <span class="material-icons">info</span>
                <p>等待任务开始...</p>
            </div>
        `;
    }

    showSnackbar(message, type = 'info') {
        const snackbar = document.getElementById('snackbar');
        const snackbarMessage = document.getElementById('snackbarMessage');
        
        snackbarMessage.textContent = message;
        snackbar.className = `snackbar ${type}`;
        
        // 强制重新计算样式
        snackbar.offsetHeight;
        
        snackbar.classList.add('show');
        
        // 自动隐藏
        setTimeout(() => {
            this.hideSnackbar();
        }, 4000);
    }

    hideSnackbar() {
        const snackbar = document.getElementById('snackbar');
        snackbar.classList.remove('show');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new OnekeyWebApp();
});
