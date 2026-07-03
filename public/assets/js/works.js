/* ============================================================
   系列与选题页脚本:24 个选题渲染 + 脑洞抽签机
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 手册 3.3 首批 24 个选题方向(唯一数据源) ---------- */
  const TOPICS = [
    "如果你的拖延症是一个项目经理",
    "四个人同时假装自己没看见群消息",
    "下班前最后五分钟突然变成动作片",
    "当 ENFP 被要求「简单说两句」",
    "朋友说「随便吃」之后的决策灾难",
    "如果尴尬能像游戏一样扣血",
    "一个人脑内有四个编剧争夺控制权",
    "把普通道歉拍成法庭辩论",
    "如果成年人也有课间十分钟",
    "同事说「这个很简单」时的内心灾难片",
    "四个人用不同电影类型理解同一句话",
    "当生活弹出「重新选择」按钮",
    "拍短视频前的自信与开机后的现实",
    "摄影师眼里的演员与演员眼里的自己",
    "如果朋友圈文案有诚实字幕",
    "一个普通人突然拥有三秒预知能力",
    "周日结束前,四个人想留住一天",
    "丢失的一条语音,连接两个误会",
    "没有说出口的「我其实很累」",
    "朋友替你完成了你放弃的小梦想",
    "一个道具在四条视频里扮演不同角色",
    "同一个场景拍出喜剧、悬疑、治愈三版",
    "观众评论决定下一集角色选择",
    "我们第一次认真拍微电影,结果最好的镜头是 NG",
  ];

  /* ---------- 渲染选题网格 ---------- */
  const grid = document.getElementById("topic-grid");
  if (grid) {
    grid.innerHTML = TOPICS.map(function (topic, i) {
      const no = String(i + 1).padStart(2, "0");
      return (
        '<div class="topic-cell" data-i="' + i + '">' +
        '<span class="mono" style="color:var(--rec);font-size:11px;">#' + no + "</span><br>" +
        topic +
        "</div>"
      );
    }).join("");
  }

  /* ---------- 脑洞抽签机 ---------- */
  const btn = document.getElementById("lottery-btn");
  const display = document.getElementById("lottery-topic");
  let rolling = false;

  if (btn && display) {
    btn.addEventListener("click", function () {
      if (rolling) return;
      rolling = true;
      btn.disabled = true;
      display.classList.add("rolling");

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finalIndex = Math.floor(Math.random() * TOPICS.length);

      // 清除上一次的高亮
      document.querySelectorAll(".topic-cell.hit").forEach(function (c) {
        c.classList.remove("hit");
      });

      if (reduced) {
        finish(finalIndex);
        return;
      }

      // 快速滚动闪现候选选题,逐渐减速后定格
      let ticks = 0;
      const totalTicks = 18;
      function spin() {
        ticks++;
        const idx = ticks >= totalTicks ? finalIndex : Math.floor(Math.random() * TOPICS.length);
        display.textContent = TOPICS[idx];
        if (ticks < totalTicks) {
          // 减速曲线:间隔从 60ms 逐渐拉长到 260ms
          const delay = 60 + Math.pow(ticks / totalTicks, 2) * 200;
          setTimeout(spin, delay);
        } else {
          finish(finalIndex);
        }
      }
      spin();

      function finish(idx) {
        display.classList.remove("rolling");
        display.innerHTML =
          "「" + TOPICS[idx] + "」" +
          ' <span class="stamp ok stamp-in" style="font-size:15px;margin-left:8px;">就拍这个</span>';
        // 联动:网格里对应选题亮起并滚动到可见位置
        const cell = document.querySelector('.topic-cell[data-i="' + idx + '"]');
        if (cell) {
          cell.classList.add("hit");
          cell.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        rolling = false;
        btn.disabled = false;
        btn.textContent = "不满意?再抽一次";
      }
    });
  }
})();
