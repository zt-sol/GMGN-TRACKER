(function () {
  'use strict';

  const STORAGE_KEY = 'gtt_records';

  const searchInput = document.getElementById('searchInput');
  const tokenList = document.getElementById('tokenList');
  const recordCount = document.getElementById('recordCount');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusText = document.getElementById('statusText');

  let records = [];
  let currentChain = 'all';

  // ===== 读取数据 =====
  function loadRecords() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        records = result[STORAGE_KEY] || [];
        resolve(records);
      });
    });
  }

  // ===== 保存数据 =====
  function saveRecords() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: records }, resolve);
    });
  }

  // ===== 格式工具 =====
  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function formatTime(isoStr) {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return '刚刚';
      if (diffMin < 60) return `${diffMin}分钟前`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `${diffH}小时前`;
      const diffD = Math.floor(diffH / 24);
      if (diffD < 7) return `${diffD}天前`;
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  // ===== 渲染列表 =====
  function renderList(filter = '') {
    const q = filter.toLowerCase().trim();
    let filtered = records;

    if (currentChain !== 'all') {
      filtered = filtered.filter(r => r.chain === currentChain);
    }
    if (q) {
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
      );
    }

    recordCount.textContent = records.length;

    if (filtered.length === 0) {
      if (records.length === 0) {
        tokenList.innerHTML = `
          <div class="empty-state">
            <div class="emoji">👀</div>
            <p>还没有记录<br/>打开 GMGN / Padre / Debot 的代币详情页就会自动记录</p>
          </div>
        `;
      } else {
        tokenList.innerHTML = `
          <div class="empty-state">
            <div class="emoji">🔍</div>
            <p>没有匹配的记录</p>
          </div>
        `;
      }
      return;
    }

    tokenList.innerHTML = filtered.map(r => {
      const chainClass = `chain-${r.chain}`;
      const shortAddr = r.address.slice(0, 6) + '...' + r.address.slice(-4);
      const timeStr = r.visitedAt ? formatTime(r.visitedAt) : '';
      const platLabel = r.platform ? r.platform.toUpperCase() : '';

      return `
        <div class="token-item" data-address="${escHtml(r.address)}" data-url="${escHtml(r.url || '')}">
          <div class="info">
            <div class="name">${escHtml(r.name)}</div>
            <div class="address" style="font-size:9px;color:#666;font-family:monospace;margin-top:1px">${escHtml(shortAddr)}${timeStr ? `<span style="color:#555;font-family:sans-serif"> · ${timeStr}</span>` : ''}</div>
          </div>
          ${platLabel ? `<span class="platform-tag">${escHtml(platLabel)}</span>` : ''}
          <span class="chain-tag ${chainClass}">${escHtml(r.chain.toUpperCase())}</span>
          <button class="delete-btn" title="删除">×</button>
        </div>
      `;
    }).join('');

    // 点击复制
    tokenList.querySelectorAll('.token-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return;
        const addr = item.dataset.address;
        if (!addr) return;
        navigator.clipboard.writeText(addr).catch(() => {});
        const nameEl = item.querySelector('.name');
        const orig = nameEl.textContent;
        nameEl.textContent = '✅ 已复制';
        setTimeout(() => { nameEl.textContent = orig; }, 800);
      });
    });

    // 删除
    tokenList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.token-item');
        const addr = item.dataset.address;
        records = records.filter(r => r.address !== addr);
        await saveRecords();
        renderList(searchInput.value);
      });
    });
  }

  // ===== 导出 CSV =====
  function exportCSV() {
    if (records.length === 0) { alert('没有记录可导出'); return; }
    const bom = '\uFEFF';
    const header = '代币名称,合约地址,链,访问时间\n';
    const rows = records.map(r => {
      const name = `"${r.name.replace(/"/g, '""')}"`;
      const addr = `"${r.address}"`;
      const time = r.visitedAt ? new Date(r.visitedAt).toLocaleString('zh-CN') : '';
      return `${name},${addr},${r.chain.toUpperCase()},${time}`;
    }).join('\n');
    const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmgn_tokens_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== 清空 =====
  async function clearAll() {
    if (records.length === 0) return;
    if (!confirm(`确定要删除全部 ${records.length} 条记录吗？`)) return;
    records = [];
    await saveRecords();
    renderList('');
  }

  // ===== 初始化 =====
  async function init() {
    await loadRecords();
    renderList('');

    searchInput.addEventListener('input', () => {
      renderList(searchInput.value);
    });

    exportBtn.addEventListener('click', exportCSV);
    clearBtn.addEventListener('click', clearAll);

    const chainFilter = document.getElementById('chainFilter');
    if (chainFilter) {
      chainFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          chainFilter.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentChain = btn.dataset.chain;
          renderList(searchInput.value);
        });
      });
    }
  }

  init();
})();
