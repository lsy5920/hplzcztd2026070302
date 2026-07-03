/* ============================================================
   首页专属脚本:开机动画、场记板互动、支柱比例条、今日高亮
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. 开机场记板动画 ----------
     每个浏览器标签页只完整播放一次(sessionStorage 记录),
     刷新或从其他页返回时不再打扰;点击可随时跳过 */
  const boot = document.getElementById("boot");
  if (boot) {
    const played = sessionStorage.getItem("hplz_boot_played");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function endBoot() {
      if (boot.classList.contains("done")) return;
      boot.classList.add("done");
      sessionStorage.setItem("hplz_boot_played", "1");
      // 动画结束后彻底移除,避免遮挡点击
      setTimeout(function () { boot.remove(); }, 700);
    }

    if (played || reduced) {
      boot.remove();
    } else {
      boot.addEventListener("click", endBoot);
      setTimeout(endBoot, 2400); // 完整播放后自动收场
    }
  }

  /* ---------- 2. hero 场记板:点击合板 ---------- */
  const clap = document.getElementById("hero-clap");
  if (clap) {
    let open = false;
    clap.addEventListener("click", function () {
      open = !open;
      clap.classList.toggle("open", open);
      // 合上时轻微抖一下,模拟「啪」的震感
      if (!open) {
        clap.style.animation = "none";
        clap.style.transform = "rotate(1.2deg) scale(.985)";
        setTimeout(function () {
          clap.style.transform = "";
          clap.style.animation = "";
        }, 160);
      }
    });
  }

  /* ---------- 3. 内容支柱比例条:滚动进入视野后再生长 ---------- */
  const bars = document.querySelectorAll("[data-bar]");
  if (bars.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (bar) { io.observe(bar); });
  } else {
    bars.forEach(function (bar) { bar.classList.add("on"); });
  }

  /* ---------- 4. 周流程:高亮今天 ---------- */
  const today = new Date().getDay(); // 0=周日,1=周一 …
  const dayCard = document.querySelector('#week-strip .day-card[data-day="' + today + '"]');
  if (dayCard) dayCard.classList.add("today");
})();
