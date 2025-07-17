class SettingsManager {
    constructor() {
        this.currentConfig = {};
        this.isTokenVisible = false;
        this.initializeEventListeners();
        this.loadConfig();
    }

    initializeEventListeners() {
        // 保存配置按钮
        document.getElementById('saveConfig').addEventListener('click', () => {
            this.saveConfig();
        });

        // 重置配置按钮
        document.getElementById('resetConfig').addEventListener('click', () => {
            this.showConfirmDialog(
                '重置配置',
                '确定要重置所有配置为默认值吗？此操作不可恢复。',
                () => this.resetConfig()
            );
        });

        // 测试配置按钮
        document.getElementById('testConfig').addEventListener('click', () => {
            this.testConfig();
        });

        // Token 可见性切换
        document.getElementById('toggleToken').addEventListener('click', () => {
            this.toggleTokenVisibility();
        });

        // 自动检测 Steam 路径
        document.getElementById('detectSteamPath').addEventListener('click', () => {
            this.detectSteamPath();
        });

        // Steam 路径输入变化
        document.getElementById('steamPath').addEventListener('input', () => {
            this.validateSteamPath();
        });

        // 对话框事件
        document.getElementById('dialogCancel').addEventListener('click', () => {
            this.hideConfirmDialog();
        });

        document.getElementById('dialogConfirm').addEventListener('click', () => {
            this.executeConfirmAction();
        });

        // Snackbar 关闭
        document.getElementById('snackbarClose').addEventListener('click', () => {
            this.hideSnackbar();
        });

        // GitHub Token 输入变化
        document.getElementById('githubToken').addEventListener('input', () => {
            this.validateGitHubToken();
        });
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config/detailed');
            const data = await response.json();

            if (data.success) {
                this.currentConfig = data.config;
                this.populateForm();
                this.updateConfigStatus();
            } else {
                this.showSnackbar('加载配置失败: ' + data.message, 'error');
            }
        } catch (error) {
            this.showSnackbar('无法连接到服务器', 'error');
            console.error('Load config error:', error);
        }
    }

    populateForm() {
        // 填充表单字段
        document.getElementById('githubToken').value = this.currentConfig.github_token || '';
        document.getElementById('steamPath').value = this.currentConfig.steam_path || '';
        document.getElementById('debugMode').checked = this.currentConfig.debug_mode || false;
        document.getElementById('loggingFiles').checked = this.currentConfig.logging_files !== false;
        document.getElementById('showConsole').checked = this.currentConfig.show_console !== false;

        // 验证字段
        this.validateSteamPath();
        this.validateGitHubToken();
    }

    async saveConfig() {
        try {
            const config = {
                github_token: document.getElementById('githubToken').value.trim(),
                steam_path: document.getElementById('steamPath').value.trim(),
                debug_mode: document.getElementById('debugMode').checked,
                logging_files: document.getElementById('loggingFiles').checked,
                show_console: document.getElementById('showConsole').checked
            };

            const response = await fetch('/api/config/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                this.showSnackbar('配置已保存', 'success');
                await this.loadConfig(); // 重新加载配置以更新状态
            } else {
                this.showSnackbar('保存失败: ' + data.message, 'error');
            }
        } catch (error) {
            this.showSnackbar('保存配置时发生错误', 'error');
            console.error('Save config error:', error);
        }
    }

    async resetConfig() {
        try {
            const response = await fetch('/api/config/reset', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.showSnackbar('配置已重置', 'success');
                await this.loadConfig();
            } else {
                this.showSnackbar('重置失败: ' + data.message, 'error');
            }
        } catch (error) {
            this.showSnackbar('重置配置时发生错误', 'error');
            console.error('Reset config error:', error);
        }

        this.hideConfirmDialog();
    }

    async testConfig() {
        this.showSnackbar('正在测试配置...', 'info');

        try {
            // 测试基本配置加载
            const response = await fetch('/api/config');
            const data = await response.json();

            if (data.success) {
                let messages = [];
                
                if (data.config.has_token) {
                    messages.push('✓ GitHub Token 配置正常');
                } else {
                    messages.push('⚠ GitHub Token 未配置');
                }

                if (data.config.steam_path) {
                    messages.push('✓ Steam 路径配置正常');
                } else {
                    messages.push('✗ Steam 路径配置异常');
                }

                this.showSnackbar(`配置测试完成: ${messages.join(', ')}`, 'success');
            } else {
                this.showSnackbar('配置测试失败: ' + data.message, 'error');
            }
        } catch (error) {
            this.showSnackbar('配置测试时发生错误', 'error');
            console.error('Test config error:', error);
        }
    }

    toggleTokenVisibility() {
        const tokenInput = document.getElementById('githubToken');
        const iconElement = document.getElementById('tokenVisibilityIcon');
        const textElement = document.getElementById('tokenVisibilityText');

        this.isTokenVisible = !this.isTokenVisible;

        if (this.isTokenVisible) {
            tokenInput.type = 'text';
            tokenInput.classList.add('token-visible');
            iconElement.textContent = 'visibility_off';
            textElement.textContent = '隐藏Token';
        } else {
            tokenInput.type = 'password';
            tokenInput.classList.remove('token-visible');
            iconElement.textContent = 'visibility';
            textElement.textContent = '显示Token';
        }
    }

    detectSteamPath() {
        // 常见的 Steam 安装路径
        const commonPaths = [
            'C:\\Program Files (x86)\\Steam',
            'C:\\Program Files\\Steam',
            'D:\\Steam',
            'E:\\Steam'
        ];

        // 这里可以扩展为实际的路径检测逻辑
        // 目前使用最常见的路径作为建议
        const suggestedPath = commonPaths[0];
        document.getElementById('steamPath').value = suggestedPath;
        
        this.validateSteamPath();
        this.showSnackbar('已设置为常见路径，请确认是否正确', 'info');
    }

    validateSteamPath() {
        const steamPath = document.getElementById('steamPath').value.trim();
        const statusElement = document.getElementById('steamPathStatus');

        if (!steamPath) {
            statusElement.className = 'status-indicator';
            statusElement.innerHTML = `
                <span class="material-icons status-icon">info</span>
                <span class="status-text">将使用自动检测的路径</span>
            `;
        } else {
            // 基本路径格式验证
            if (steamPath.toLowerCase().includes('steam')) {
                statusElement.className = 'status-indicator success';
                statusElement.innerHTML = `
                    <span class="material-icons status-icon">check_circle</span>
                    <span class="status-text">路径格式看起来正确</span>
                `;
            } else {
                statusElement.className = 'status-indicator warning';
                statusElement.innerHTML = `
                    <span class="material-icons status-icon">warning</span>
                    <span class="status-text">路径可能不正确，请确认</span>
                `;
            }
        }
    }

    validateGitHubToken() {
        const token = document.getElementById('githubToken').value.trim();
        
        // GitHub Personal Access Token 的基本格式验证
        if (token) {
            if (token.startsWith('ghp_') && token.length >= 36) {
                // 新格式的 Token
                return true;
            } else if (token.length === 40 && /^[a-f0-9]+$/i.test(token)) {
                // 旧格式的 Token (40位十六进制)
                return true;
            } else {
                return false;
            }
        }
        return true; // 空值是允许的
    }

    updateConfigStatus() {
        const statusGrid = document.getElementById('configStatusGrid');
        const config = this.currentConfig;

        const statusCards = [];

        // GitHub Token 状态
        if (config.has_token) {
            statusCards.push({
                type: 'success',
                icon: 'check_circle',
                title: 'GitHub Token',
                description: '已配置，可以正常使用GitHub API'
            });
        } else {
            statusCards.push({
                type: 'warning',
                icon: 'warning',
                title: 'GitHub Token',
                description: '未配置，可能影响下载速度和成功率'
            });
        }

        // Steam 路径状态
        if (config.steam_path && config.steam_path_exists) {
            statusCards.push({
                type: 'success',
                icon: 'folder',
                title: 'Steam 路径',
                description: `路径有效: ${config.steam_path}`
            });
        } else if (config.steam_path) {
            statusCards.push({
                type: 'warning',
                icon: 'folder_off',
                title: 'Steam 路径',
                description: '路径已设置但可能无效'
            });
        } else {
            statusCards.push({
                type: 'error',
                icon: 'error',
                title: 'Steam 路径',
                description: '未设置或自动检测失败'
            });
        }

        // 调试模式状态
        if (config.debug_mode) {
            statusCards.push({
                type: 'warning',
                icon: 'bug_report',
                title: '调试模式',
                description: '已启用，会输出详细日志'
            });
        }

        // 日志文件状态
        if (config.logging_files) {
            statusCards.push({
                type: 'success',
                icon: 'description',
                title: '日志文件',
                description: '已启用，日志将保存到文件'
            });
        }

        // 生成HTML
        statusGrid.innerHTML = statusCards.map(card => `
            <div class="status-card ${card.type}">
                <span class="material-icons status-card-icon">${card.icon}</span>
                <div class="status-card-content">
                    <div class="status-card-title">${card.title}</div>
                    <div class="status-card-description">${card.description}</div>
                </div>
            </div>
        `).join('');
    }

    showConfirmDialog(title, message, confirmAction) {
        document.getElementById('dialogTitle').textContent = title;
        document.getElementById('dialogMessage').textContent = message;
        this.confirmAction = confirmAction;
        
        const dialog = document.getElementById('confirmDialog');
        dialog.classList.add('show');
    }

    hideConfirmDialog() {
        const dialog = document.getElementById('confirmDialog');
        dialog.classList.remove('show');
        this.confirmAction = null;
    }

    executeConfirmAction() {
        if (this.confirmAction) {
            this.confirmAction();
        }
        this.hideConfirmDialog();
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
}

// 返回主页功能
function goBack() {
    window.location.href = '/';
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
