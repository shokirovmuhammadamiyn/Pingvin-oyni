// O'YINLAR VA GLOBAL ENGINE
const SoundEngine = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  play(freq = 440, type = "sine", duration = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch(e) {}
  }
};

let activeGame = null;
let activeGameName = "";
let humanPlayersCount = 1;

// O'yin maydoni canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  if (activeGame && activeGame.onResize) {
    activeGame.onResize(canvas.width, canvas.height);
  }
}
window.addEventListener("resize", resizeCanvas);

// Rejim tanlash (1, 2 yoki 4 kishi)
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    humanPlayersCount = parseInt(btn.dataset.players, 10);
    SoundEngine.play(520, "triangle", 0.05);
  };
});

// O'yinni ishga tushirish
function launchGame(name) {
  SoundEngine.init();
  SoundEngine.play(600, "triangle", 0.1);
  activeGameName = name;

  document.getElementById("menuScreen").classList.remove("active");
  document.getElementById("gameScreen").classList.add("active");
  document.getElementById("resultModal").classList.remove("show");

  resizeCanvas();

  if (name === "fishing") {
    activeGame = new FishingGame(canvas, ctx, humanPlayersCount);
  } else if (name === "tank") {
    activeGame = new TankGame(canvas, ctx, humanPlayersCount);
  }

  activeGame.start();
}

function showMenu() {
  if (activeGame) {
    activeGame.stop();
    activeGame = null;
  }
  document.getElementById("gameScreen").classList.remove("active");
  document.getElementById("menuScreen").classList.add("active");
  document.getElementById("resultModal").classList.remove("show");
}

document.getElementById("btnBack").onclick = showMenu;
document.getElementById("btnMenu").onclick = showMenu;
document.getElementById("btnRestart").onclick = () => {
  launchGame(activeGameName);
};

document.getElementById("btnSound").onclick = () => {
  SoundEngine.enabled = !SoundEngine.enabled;
  document.getElementById("btnSound").textContent = SoundEngine.enabled ? "🔊" : "🔇";
};

// 4 Burchak tugmalari bosilishi (Touch/Click)
function setupCornerButtons() {
  const map = [
    { id: "tapP1", idx: 0 },
    { id: "tapP2", idx: 1 },
    { id: "tapP3", idx: 2 },
    { id: "tapP4", idx: 3 }
  ];

  map.forEach(({ id, idx }) => {
    const el = document.getElementById(id);
    const trigger = (e) => {
      e.preventDefault();
      if (activeGame && activeGame.onPlayerAction) {
        activeGame.onPlayerAction(idx);
      }
    };
    el.addEventListener("touchstart", trigger, { passive: false });
    el.addEventListener("mousedown", trigger);
  });
}
setupCornerButtons();

// Klaviatura boshqaruvi
window.addEventListener("keydown", (e) => {
  if (!activeGame) return;
  // P1: Space yoki W
  if (e.code === "Space" || e.key === "w" || e.key === "W") activeGame.onPlayerAction(0);
  // P2: Q
  if (e.key === "q" || e.key === "Q") activeGame.onPlayerAction(1);
  // P3: P yoki ArrowUp
  if (e.key === "p" || e.key === "P" || e.key === "ArrowUp") activeGame.onPlayerAction(2);
  // P4: Enter yoki ArrowDown
  if (e.code === "Enter" || e.key === "ArrowDown") activeGame.onPlayerAction(3);
});

// Natijalar oynasi
function showGameOverModal(title, scoreList) {
  document.getElementById("resTitle").textContent = title;
  const board = document.getElementById("resScores");
  board.innerHTML = "";

  scoreList.forEach(item => {
    const row = document.createElement("div");
    row.className = "score-row";
    row.innerHTML = `
      <span style="color:${item.color}">${item.name}</span>
      <span>${item.score} ochko</span>
    `;
    board.appendChild(row);
  });

  document.getElementById("resultModal").classList.add("show");
  SoundEngine.play(523, "triangle", 0.15);
  setTimeout(() => SoundEngine.play(659, "triangle", 0.25), 140);
}
