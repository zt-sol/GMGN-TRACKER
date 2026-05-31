(function () {
  'use strict';
  if (window.__gttLoaded) return;
  window.__gttLoaded = true;

  console.log('[GTT] ✅ 已加载，当前URL:', location.href);

  const STORAGE_KEY = 'gtt_records';

  // ===== 链名统一化 =====
  const CHAIN_ALIAS = {
    solana: 'sol', ethereum: 'eth', bnb: 'bsc',
  };
  function normalizeChain(c) {
    const lower = (c || '').toLowerCase();
    return CHAIN_ALIAS[lower] || lower;
  }

  // ===== 多平台 URL 解析 =====
  function extractTokenInfo(url) {
    let m;

    // GMGN: gmgn.ai/{chain}/token/{address}
    m = url.match(/gmgn\.ai\/(\w+)\/token\/(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (m) return { platform: 'gmgn', chain: normalizeChain(m[1]), address: m[2] };

    // Padre: trade.padre.gg/trade/{chain}/{address}
    m = url.match(/trade\.padre\.gg\/trade\/(\w+)\/([1-9A-HJ-NP-Za-km-z]{32,44}|0x[a-fA-F0-9]{40})/);
    if (m) return { platform: 'padre', chain: normalizeChain(m[1]), address: m[2] };

    // Debot: debot.ai/token/{chain}/{id_}{address}
    m = url.match(/debot\.ai\/token\/(\w+)\/(?:\d+_)?(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (m) return { platform: 'debot', chain: normalizeChain(m[1]), address: m[2] };

    return null;
  }

  // ===== 平台名 → 显示缩写 =====
  function platformLabel(p) {
    return { gmgn: 'GMGN', padre: 'Padre', debot: 'Debot' }[p] || p;
  }

  // ===== 已知的非代币标题（跳过这些，继续等真正的代币名） =====
  const SKIP_TITLES = [
    '战壕', 'trenches', 'trades', 'Terminal',
    'Your Edge in Memecoin Trading',
    'GMGN', 'Padre', 'Debot', 'Loading',
  ];

  function isGenericName(name) {
    const n = name.trim().toLowerCase();
    if (!n || n.length < 1) return true;
    if (n.length > 30) return true;  // 太长的不可能是代币名
    if (SKIP_TITLES.includes(n)) return true;
    if (SKIP_TITLES.some(s => n.includes(s))) return true;
    // 纯数字或纯地址的也不是代币名
    if (/^[0-9a-f]{32,}$/i.test(n)) return true;
    return false;
  }

  // ===== 代币名称提取（多平台） =====
  function extractTokenName(platform) {
    let name = '';

    // 通用：页面 title
    const title = document.title;
    if (title && !title.includes('Just a moment') && !title.includes('Attention Required')) {
      const clean = title.replace(/\s*[|–-]\s*(GMGN|Padre|Debot|Terminal).*$/i, '').trim();
      if (clean && !isGenericName(clean)) return clean;
    }

    // GMGN 专用选择器
    if (platform === 'gmgn') {
      // data-sentry-component 内的代币名
      const tokenEl = document.querySelector('[data-sentry-component="TokenHeader"]');
      if (tokenEl) {
        const nameEl = tokenEl.querySelector('a, span');
        if (nameEl) { const t = nameEl.textContent.trim(); if (t && !isGenericName(t)) return t; }
      }
      // h1 标题
      const h1 = document.querySelector('h1');
      if (h1) { const t = h1.textContent.trim(); if (t && !isGenericName(t) && t.length < 30) return t; }
      // 大号加粗文字（代币符号常出现的位置）
      const strong = document.querySelector('.font-semibold.text-\\[22px\\], .font-bold.text-\\[20px\\], [class*="text-"][class*="font-bold"]');
      if (strong) { const t = strong.textContent.trim(); if (t && !isGenericName(t) && t.length < 15) return t; }
    }

    // Padre 专用选择器
    if (platform === 'padre') {
      // 找页面中的代币符号/名称（Padre 渲染后 DOM 中会有）
      const sym = document.querySelector('[class*="token-symbol"], [class*="TokenSymbol"], [data-testid="token-symbol"]');
      if (sym) { const t = sym.textContent.trim(); if (t && !isGenericName(t)) return t; }
      // 找 header 中的标题
      const header = document.querySelector('header h1, header h2');
      if (header) { const t = header.textContent.trim(); if (t && !isGenericName(t)) return t; }
      // 面包屑最后一项
      const bc = document.querySelector('[class*="breadcrumb"] a:last-child, [class*="breadcrumb"] span:last-child');
      if (bc) { const t = bc.textContent.trim(); if (t && !isGenericName(t) && t.length < 20) return t; }
    }

    // Debot 专用选择器
    if (platform === 'debot') {
      const h1 = document.querySelector('h1');
      if (h1) { const t = h1.textContent.trim(); if (t && !isGenericName(t)) return t; }
      const nameEl = document.querySelector('.token-name, [class*="tokenName"], [class*="symbol"]');
      if (nameEl) { const t = nameEl.textContent.trim(); if (t && !isGenericName(t)) return t; }
    }

    return 'Unknown';
  }

  // ===== 延迟获取名称（等待页面渲染，最长 10 秒） =====
  function waitAndExtractName(platform, maxWait = 10000) {
    return new Promise((resolve) => {
      const name = extractTokenName(platform);
      if (name !== 'Unknown') return resolve(name);

      const start = Date.now();
      const iv = setInterval(() => {
        if (Date.now() - start > maxWait) {
          clearInterval(iv);
          return resolve('Unknown');
        }
        const n = extractTokenName(platform);
        if (n !== 'Unknown') {
          clearInterval(iv);
          resolve(n);
        }
      }, 300);
    });
  }

  // ===== 存储操作 =====
  async function getRecords() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  }

  async function saveRecord(tokenInfo, tokenName) {
    const records = await getRecords();
    const now = new Date().toISOString();
    const dedupKey = tokenInfo.address + '|' + tokenInfo.chain;

    const record = {
      name: tokenName,
      address: tokenInfo.address,
      chain: tokenInfo.chain,
      platform: tokenInfo.platform,
      url: tokenInfo.fullUrl,
      visitedAt: now
    };

    // 去重：同一链+同一合约只保留一条
    const idx = records.findIndex(r => (r.address + '|' + r.chain) === dedupKey);
    if (idx >= 0) {
      records[idx] = { ...records[idx], ...record };
    } else {
      records.unshift(record);
    }

    if (records.length > 1000) records.length = 1000;

    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: records }, resolve);
    });
  }

  // ===== 检测并记录 =====
  let _checking = false;
  async function checkAndRecord(source) {
    if (_checking) return;
    _checking = true;
    try {
      const url = location.href;
      const info = extractTokenInfo(url);
      if (!info) return;

      console.log(`[GTT] ✅ ${platformLabel(info.platform)} 代币页:`, info.address.slice(0,10)+'...');

      const tokenName = await waitAndExtractName(info.platform);
      console.log(`[GTT] 📝 名称: ${tokenName}`);

      await saveRecord(info, tokenName);
      console.log('[GTT] ✅ 已保存');
    } finally {
      _checking = false;
    }
  }

  // ===== 初始化：三条腿检测 =====
  function init() {
    console.log('[GTT] 🚀 init 执行');
    checkAndRecord('首次加载');

    let currentUrl = location.href;

    // 1) URL 轮询 200ms
    setInterval(() => {
      try {
        if (location.href !== currentUrl) {
          currentUrl = location.href;
          checkAndRecord('URL轮询');
        }
      } catch(e) {}
    }, 200);

    // 2) 标题变化检测
    let lastTitle = document.title;
    setInterval(() => {
      try {
        if (document.title !== lastTitle) {
          lastTitle = document.title;
          if (location.href !== currentUrl) {
            currentUrl = location.href;
            checkAndRecord('标题变化');
          }
        }
      } catch(e) {}
    }, 200);

    // 3) postMessage 来自 main-hook.js
    window.addEventListener('message', (ev) => {
      if (ev.data && ev.data.__gttNav) {
        setTimeout(() => {
          if (location.href !== currentUrl) {
            currentUrl = location.href;
            checkAndRecord('postMessage');
          }
        }, 50);
      }
    });

    // 4) popstate
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        if (location.href !== currentUrl) {
          currentUrl = location.href;
          checkAndRecord('popstate');
        }
      }, 50);
    });

    console.log('[GTT] ✅ 所有监听已启动');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
