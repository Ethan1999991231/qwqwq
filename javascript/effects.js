/**
 * EarthMC UI Effects - 交互效果脚本
 * 包含: 打字震动 + 涟漪效果 + 加载动画 + 输入发光 + 导航效果
 */

(function() {
  'use strict';

  // ===== 打字震动效果 =====
  function initShakeEffect() {
    document.querySelectorAll('input[type="text"]').forEach(input => {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') return;
        this.classList.add('input-shake');
        setTimeout(() => this.classList.remove('input-shake'), 200);
      });
    });
  }

  // ===== 涟漪效果 =====
  function initRippleEffect() {
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,0.4);transform:scale(0);animation:ripple-effect 0.5s ease-out;pointer-events:none;width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // ===== 加载动画 =====
  window.showLoading = function(text) {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      const txt = overlay.querySelector('.loading-text');
      if (txt && text) txt.textContent = text;
      overlay.classList.add('active');
    }
  };

  window.hideLoading = function() {
    const overlay = document.getElementById('loadingOverlay') || document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  // ===== 输入框焦点发光效果 =====
  function initInputGlow() {
    document.querySelectorAll('input[type="text"]').forEach(input => {
      input.addEventListener('focus', () => input.classList.add('input-glow'));
      input.addEventListener('blur',  () => input.classList.remove('input-glow'));
    });
  }

  // ===== 导航悬停效果 =====
  function initNavEffects() {
    document.querySelectorAll('#mainNav a').forEach(link => {
      link.addEventListener('mouseenter', () => link.style.transform = 'translateY(-1px)');
      link.addEventListener('mouseleave', () => link.style.transform = '');
    });
  }

  // ===== 初始化 =====
  function init() {
    initShakeEffect();
    initRippleEffect();
    initInputGlow();
    initNavEffects();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
