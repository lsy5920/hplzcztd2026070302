/* ============================================================
   手册页脚本:自动目录、滚动高亮当前章节、顶部阅读进度条
   ============================================================ */
(function () {
  "use strict";

  const body = document.getElementById("manual-body");
  const toc = document.getElementById("manual-toc");
  const film = document.getElementById("progress-film");
  if (!body || !toc) return;

  /* ---------- 1. 从正文自动收集章节,生成目录 ---------- */
  const sections = Array.from(body.querySelectorAll("section[data-toc]"));
  const frag = document.createDocumentFragment();
  sections.forEach(function (sec) {
    const a = document.createElement("a");
    a.href = "#" + sec.id;
    a.textContent = sec.getAttribute("data-toc");
    a.dataset.target = sec.id;
    frag.appendChild(a);
  });
  toc.appendChild(frag);
  const tocLinks = Array.from(toc.querySelectorAll("a"));

  /* ---------- 2. 滚动时高亮目录中的当前章节 ---------- */
  function highlight(id) {
    tocLinks.forEach(function (a) {
      a.classList.toggle("on", a.dataset.target === id);
    });
  }

  if ("IntersectionObserver" in window) {
    // 取视口上半部分作为「正在阅读」的判定区
    const io = new IntersectionObserver(
      function (entries) {
        // 找出当前可见且位置最靠上的章节
        const visible = entries
          .filter(function (e) { return e.isIntersecting; })
          .sort(function (a, b) {
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });
        if (visible.length) highlight(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -60% 0px" }
    );
    sections.forEach(function (sec) { io.observe(sec); });
  }

  /* ---------- 3. 顶部胶片阅读进度条 ---------- */
  if (film) {
    let ticking = false;
    function updateFilm() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, window.scrollY / total) : 0;
      film.style.width = (p * 100).toFixed(2) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateFilm);
      }
    }, { passive: true });
    updateFilm();
  }
})();
