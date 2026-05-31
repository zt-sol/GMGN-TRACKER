// 运行在 MAIN world（document_start），在 Next.js 加载前 patch pushState
(function() {
  if (window.__gttHookInstalled) return;
  window.__gttHookInstalled = true;

  const origPush = history.pushState;
  const origReplace = history.replaceState;

  history.pushState = function() {
    const url = arguments[2] || '';
    origPush.apply(this, arguments);
    window.postMessage({ __gttNav: true, method: 'pushState', url: String(url) }, '*');
  };

  history.replaceState = function() {
    const url = arguments[2] || '';
    origReplace.apply(this, arguments);
    window.postMessage({ __gttNav: true, method: 'replaceState', url: String(url) }, '*');
  };

  window.addEventListener('popstate', () => {
    window.postMessage({ __gttNav: true, method: 'popstate', url: location.href }, '*');
  });

  // 额外 hook: 监听 Next.js App Router 的 router.push
  // 如果有 __nextAppRouter 或 next.router, 也 hook
  const _observeNext = function() {
    if (window.__NEXT_DATA__ || window.next) {
      // Next.js detected
    }
  };
})();
