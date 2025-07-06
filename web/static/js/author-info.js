// 项目信息增强脚本
class ProjectInfoEnhancer {
    constructor() {
        this.initializeProjectInfo();
    }

    initializeProjectInfo() {
        // 为项目链接添加点击统计（可选）
        this.addProjectLinkTracking();
        
        // 添加版本点击彩蛋
        this.addVersionClickEaster();
        
        // 添加项目Logo点击效果
        this.addLogoClickEffect();
    }

    addProjectLinkTracking() {
        const projectLinks = document.querySelectorAll('.project-link');
        projectLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const linkType = link.classList.contains('github') ? 'GitHub仓库' :
                               link.classList.contains('releases') ? '下载发布版' :
                               link.classList.contains('docs') ? '使用文档' :
                               link.classList.contains('issues') ? '问题反馈' : '未知链接';
                
                console.log(`用户点击了 ${linkType} 链接`);
                
                // 添加点击动画效果
                link.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    link.style.transform = '';
                }, 150);
            });
        });
    }

    addVersionClickEaster() {
        const versionLabels = document.querySelectorAll('.version-label');
        let clickCount = 0;
        
        versionLabels.forEach(label => {
            label.addEventListener('click', () => {
                clickCount++;
                
                if (clickCount === 5) {
                    this.showEasterEgg();
                    clickCount = 0;
                }
                
                // 添加点击效果
                label.style.animation = 'pulse 0.3s ease';
                setTimeout(() => {
                    label.style.animation = '';
                }, 300);
            });
        });
    }

    addLogoClickEffect() {
        const logos = document.querySelectorAll('.project-logo');
        
        logos.forEach(logo => {
            logo.addEventListener('click', () => {
                // 添加旋转动画
                logo.style.transform = 'rotate(360deg)';
                logo.style.transition = 'transform 0.6s ease';
                
                setTimeout(() => {
                    logo.style.transform = '';
                    logo.style.transition = '';
                }, 600);
                
                // 显示一个小提示
                this.showTooltip(logo, '🎮 Onekey - 让Steam解锁变得简单！');
            });
        });
    }

    showEasterEgg() {
        const messages = [
            '🎉 你发现了隐藏彩蛋！',
            '🚀 感谢你使用Onekey工具！',
            '⭐ 别忘了给项目点个Star哦！',
            '🎮 祝你游戏愉快！',
            '💻 开源让世界更美好！',
            '🔓 一键解锁，畅享游戏！'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // 创建彩蛋提示
        const easterEgg = document.createElement('div');
        easterEgg.className = 'easter-egg';
        easterEgg.textContent = randomMessage;
        easterEgg.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #6750a4, #7d5260);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: easterEggBounce 0.6s ease-out;
        `;
        
        // 添加CSS动画
        if (!document.getElementById('easter-egg-styles')) {
            const style = document.createElement('style');
            style.id = 'easter-egg-styles';
            style.textContent = `
                @keyframes easterEggBounce {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(easterEgg);
        
        // 3秒后移除
        setTimeout(() => {
            easterEgg.style.animation = 'easterEggBounce 0.3s ease-in reverse';
            setTimeout(() => {
                if (easterEgg.parentNode) {
                    easterEgg.parentNode.removeChild(easterEgg);
                }
            }, 300);
        }, 3000);
    }

    showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.bottom + 10) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        
        document.body.appendChild(tooltip);
        
        // 显示tooltip
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 10);
        
        // 2秒后隐藏
        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 300);
        }, 2000);
    }
}

// 初始化项目信息增强功能
document.addEventListener('DOMContentLoaded', () => {
    new ProjectInfoEnhancer();
});
