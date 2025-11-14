const promptSets = [
  {
    dimension: 'Activity',
    prompt: '现在的大概状态更接近哪一种？',
    insights: [
      '随手点开说明你在乎感受本身，这已经是一种行动。',
      '停一停看看「正在做什么」也许会松一点点。',
    ],
  },
  {
    dimension: 'Mood',
    prompt: '能量表大概在哪一段？',
    insights: [
      '能量有波峰也有波谷，我会陪你看完这一段。',
      '不急着修正，先承认它现在的样子。',
    ],
  },
  {
    dimension: 'Intent',
    prompt: '这会儿更想往哪走半步？',
    insights: [
      '方向不需要很大，哪怕是一点点偏向也值得被捕捉。',
      '随意一点回答即可，我会顺着这个线索接住你。',
    ],
  },
];

const buddyLines = [
  '嗨，慢慢来就好。',
  '我在，随时可以停一停。',
  '不用准备，随手点一个也行。',
  '今天的你已经做得够多了。',
];

const radialOptions = [
  { label: '放松一下', key: 'rest', energy: 0.35, warmth: 0.56 },
  { label: '推进一步', key: 'push', energy: 0.72, warmth: 0.52 },
  { label: '整理情绪', key: 'calm', energy: 0.48, warmth: 0.44 },
  { label: '来点灵感', key: 'spark', energy: 0.8, warmth: 0.66 },
  { label: '只是看看', key: 'drift', energy: 0.55, warmth: 0.5 },
];

const radialActions = {
  rest: ['肩颈 + 呼吸两分钟', '泡杯温水慢慢喝'],
  push: ['设一个 15 分钟液态倒计时', '列出下一小步就停'],
  calm: ['写三个此刻的感受词', '去窗边看远处 30 秒'],
  spark: ['随手画几条线看看像什么', '翻一张旧照片找灵感'],
  drift: ['什么也不做，允许这段空白', '只是看着球呼吸也可以'],
};

const promptText = document.getElementById('promptText');
const buddyLine = document.getElementById('buddyLine');
const refreshButton = document.getElementById('refreshQuestion');
const emotionCore = document.getElementById('emotionCore');
const radialMenu = document.getElementById('radialMenu');
const coreStatus = document.getElementById('coreStatus');

let radialMenuActive = false;
let radialSelectedIndex = null;
let holdTimeout = null;
let pointerState = { active: false, pointerId: null, startX: 0, startY: 0, moved: false };

const coreState = {
  energy: 0.6,
  warmth: 0.54,
  turbulence: 0.4,
};

function setStatus(text) {
  coreStatus.innerHTML = `<p>${text}</p>`;
}

function setCoreState({ energy, warmth, turbulence }) {
  if (typeof energy === 'number') coreState.energy = energy;
  if (typeof warmth === 'number') coreState.warmth = warmth;
  if (typeof turbulence === 'number') coreState.turbulence = turbulence;
  updateCoreVisuals();
}

function updateCoreVisuals() {
  const hue = 190 + coreState.warmth * 120;
  const sat = `${60 + coreState.energy * 30}%`;
  const light = `${55 + (coreState.energy - 0.5) * 15}%`;
  const turbulence = `${7 - coreState.energy * 2 + coreState.turbulence * 4}s`;
  emotionCore.style.setProperty('--core-hue', hue);
  emotionCore.style.setProperty('--core-sat', sat);
  emotionCore.style.setProperty('--core-light', light);
  emotionCore.style.setProperty('--core-turbulence', turbulence);
}

function emitCoreRipple() {
  const ripple = document.createElement('span');
  ripple.className = 'core-ripple';
  emotionCore.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function initRadialMenu() {
  radialMenu.innerHTML = '';
  const radius = 145;
  radialOptions.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    const angle = (360 / radialOptions.length) * index - 90;
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    button.style.setProperty('--target-transform', `translate(-50%, -50%) translate(${x}px, ${y}px)`);
    button.addEventListener('click', () => applyRadialSelection(option));
    radialMenu.appendChild(button);
  });
}

function openRadialMenu() {
  radialMenuActive = true;
  radialMenu.classList.add('active');
  radialMenu.setAttribute('aria-hidden', 'false');
  radialSelectedIndex = null;
  emotionCore.classList.add('menu-open');
  emitCoreRipple();
}

function closeRadialMenu() {
  radialMenuActive = false;
  radialMenu.classList.remove('active');
  radialMenu.setAttribute('aria-hidden', 'true');
  radialMenu.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
  radialSelectedIndex = null;
  emotionCore.classList.remove('menu-open');
}

function updateRadialHover(event) {
  const rect = emotionCore.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = event.clientX - centerX;
  const dy = event.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  radialMenu.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
  if (distance < 70) {
    radialSelectedIndex = null;
    return;
  }
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  angle = (angle + 360) % 360;
  const segment = 360 / radialOptions.length;
  radialSelectedIndex = Math.floor((angle + segment / 2) / segment) % radialOptions.length;
  const buttons = radialMenu.querySelectorAll('button');
  const targetBtn = buttons[radialSelectedIndex];
  if (targetBtn) targetBtn.classList.add('active');
}

function applyRadialSelection(option) {
  const tips = radialActions[option.key]?.join(' · ');
  setStatus(`已标记：${option.label}${tips ? ` ｜ 可以：${tips}` : ''}`);
  buddyLine.textContent = '收到，我会把这个方向放在前排。';
  setCoreState({ energy: option.energy, warmth: option.warmth, turbulence: 0.2 });
  closeRadialMenu();
}

function handleCorePointerDown(event) {
  event.preventDefault();
  emotionCore.focus();
  pointerState = {
    active: true,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  emotionCore.setPointerCapture(event.pointerId);
  holdTimeout = setTimeout(() => {
    if (!pointerState.active || pointerState.moved) return;
    openRadialMenu();
  }, 600);
}

function handleCorePointerMove(event) {
  if (!pointerState.active) return;
  const dx = event.clientX - pointerState.startX;
  const dy = event.clientY - pointerState.startY;
  if (!pointerState.moved && Math.hypot(dx, dy) > 10) {
    pointerState.moved = true;
    clearTimeout(holdTimeout);
  }
  if (radialMenuActive) {
    updateRadialHover(event);
  }
}

function handleCorePointerUp(event) {
  if (!pointerState.active) return;
  emotionCore.releasePointerCapture(event.pointerId);
  clearTimeout(holdTimeout);
  if (radialMenuActive) {
    if (radialSelectedIndex !== null) {
      applyRadialSelection(radialOptions[radialSelectedIndex]);
    } else {
      setStatus('随意滑过也没关系，球会等你。');
      closeRadialMenu();
    }
  } else if (!pointerState.moved) {
    const paused = emotionCore.classList.toggle('paused');
    setStatus(paused ? '已按下暂停，想停多久都行。' : '球重新流动啦。');
    emitCoreRipple();
  } else {
    setStatus('就让它轻轻晃一晃，也是一种陪伴。');
  }
  pointerState = { active: false, pointerId: null, startX: 0, startY: 0, moved: false };
}

function pickPrompt() {
  const choice = promptSets[Math.floor(Math.random() * promptSets.length)];
  promptText.textContent = choice.prompt;
  buddyLine.textContent = buddyLines[Math.floor(Math.random() * buddyLines.length)];
  const line = choice.insights[Math.floor(Math.random() * choice.insights.length)];
  setStatus(line);
}

function handleTilt(event) {
  const ratioX = event.clientX / window.innerWidth - 0.5;
  const ratioY = event.clientY / window.innerHeight - 0.5;
  document.documentElement.style.setProperty('--tilt-x', (ratioX * 20).toFixed(2));
  document.documentElement.style.setProperty('--tilt-y', (ratioY * 20).toFixed(2));
}

refreshButton.addEventListener('click', pickPrompt);
emotionCore.addEventListener('pointerdown', handleCorePointerDown);
emotionCore.addEventListener('pointermove', handleCorePointerMove);
emotionCore.addEventListener('pointerup', handleCorePointerUp);
emotionCore.addEventListener('pointercancel', handleCorePointerUp);
window.addEventListener('pointermove', handleTilt);

initRadialMenu();
updateCoreVisuals();
pickPrompt();
