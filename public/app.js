const socket = io();

const entryPage = document.getElementById('entryPage');
const lobbyPage = document.getElementById('lobbyPage');
const gamePage = document.getElementById('gamePage');
const toastEl = document.getElementById('toast');

const nicknameInput = document.getElementById('nicknameInput');
const roomIdInput = document.getElementById('roomIdInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeLabel = document.getElementById('roomCodeLabel');
const playerLabel = document.getElementById('playerLabel');
const playerList = document.getElementById('playerList');
const hostControls = document.getElementById('hostControls');
const categorySelect = document.getElementById('categorySelect');
const impostorCountInput = document.getElementById('impostorCountInput');
const roundCountInput = document.getElementById('roundCountInput');
const updateSettingsBtn = document.getElementById('updateSettingsBtn');
const startGameBtn = document.getElementById('startGameBtn');
const playerStatus = document.getElementById('playerStatus');
const lobbyPhaseLabel = document.getElementById('lobbyPhaseLabel');
const roundLabel = document.getElementById('roundLabel');
const roundTotalLabel = document.getElementById('roundTotalLabel');
const gamePlayerLabel = document.getElementById('gamePlayerLabel');
const playingView = document.getElementById('playingView');
const votingView = document.getElementById('votingView');
const resultView = document.getElementById('resultView');
const finishedView = document.getElementById('finishedView');
const trackTitle = document.getElementById('trackTitle');
const trackCategory = document.getElementById('trackCategory');
const playPrompt = document.getElementById('playPrompt');
const videoContainer = document.getElementById('videoContainer');
const timeLeftLabel = document.getElementById('timeLeftLabel');
const voteTimeLeftLabel = document.getElementById('voteTimeLeftLabel');
const voteList = document.getElementById('voteList');
const resultSummary = document.getElementById('resultSummary');
const finalResult = document.getElementById('finalResult');

let currentRoomId = null;
let currentPlayerId = null;
let selectedVote = null;
let voteButtons = [];
let voteTimer = null;
let voteCountdownTimer = null;
let resultCountdownTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.add('hidden'), 3200);
}

function openPage(page) {
  [entryPage, lobbyPage, gamePage].forEach((el) => el.classList.add('hidden'));
  page.classList.remove('hidden');
}

socket.on('connect', () => {
  currentPlayerId = socket.id;
});

createRoomBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim() || '玩家';
  if (!nickname) {
    showToast('請輸入暱稱');
    return;
  }
  socket.emit('createRoom', {
    nickname,
    settings: {
      category: categorySelect.value,
      impostorCount: Number(impostorCountInput.value),
      rounds: Number(roundCountInput.value)
    }
  });
});

joinRoomBtn.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim() || '玩家';
  const roomId = roomIdInput.value.trim().toUpperCase();
  if (!roomId) {
    showToast('請輸入房號');
    return;
  }
  socket.emit('joinRoom', { nickname, roomId });
});

updateSettingsBtn.addEventListener('click', () => {
  socket.emit('updateSettings', {
    roomId: currentRoomId,
    settings: {
      category: categorySelect.value,
      impostorCount: Number(impostorCountInput.value),
      rounds: Number(roundCountInput.value)
    }
  });
  showToast('設定已更新');
});

startGameBtn.addEventListener('click', () => {
  socket.emit('startGame', { roomId: currentRoomId });
});

socket.on('roomCreated', ({ roomId }) => {
  currentRoomId = roomId;
  roomCodeLabel.textContent = roomId;
  openPage(lobbyPage);
});

socket.on('joinedRoom', ({ roomId }) => {
  currentRoomId = roomId;
  roomCodeLabel.textContent = roomId;
  openPage(lobbyPage);
});

socket.on('roomUpdate', ({ players, settings, phase, roundIndex, rounds, hostId }) => {
  const nickname = nicknameInput.value.trim() || '玩家';
  playerLabel.textContent = nickname;
  const isHost = currentPlayerId === hostId;
  hostControls.classList.toggle('hidden', !isHost || phase !== 'lobby');
  categorySelect.value = settings.category;
  impostorCountInput.value = settings.impostorCount;
  roundCountInput.value = settings.rounds;
  roundLabel.textContent = roundIndex || 0;
  roundTotalLabel.textContent = settings.rounds;
  lobbyPhaseLabel.textContent = phase === 'lobby' ? '等待中' : phase === 'playing' ? '遊戲中' : phase === 'voting' ? '投票中' : phase === 'result' ? '結果中' : '結束';
  gamePlayerLabel.textContent = players.length;
  playerList.innerHTML = players.map((player) => `<li>${player.name}${player.isHost ? ' (主持人)' : ''}</li>`).join('');
  if (phase === 'lobby') {
    playerStatus.textContent = '等待玩家加入，主持人可以更新設定並開始遊戲。';
  } else if (phase === 'playing') {
    playerStatus.textContent = '遊戲已開始，請專心聽音樂，等待投票階段。';
  } else if (phase === 'voting') {
    playerStatus.textContent = '請準備投票，猜出誰是臥底。';
  } else if (phase === 'result') {
    playerStatus.textContent = '本局結果已出，系統將自動進入下一局。';
  } else if (phase === 'finished') {
    playerStatus.textContent = '遊戲已結束，看看最終排名！';
  }
});

socket.on('roundStarted', ({ assignment, timeLeft, players, phase, roundIndex, rounds }) => {
  openPage(gamePage);
  clearInterval(voteTimer);
  selectedVote = null;
  voteButtons = [];
  playingView.classList.remove('hidden');
  votingView.classList.add('hidden');
  resultView.classList.add('hidden');
  finishedView.classList.add('hidden');

  roundLabel.textContent = roundIndex;
  roundTotalLabel.textContent = rounds;
  gamePlayerLabel.textContent = players.length;
  trackTitle.textContent = assignment.song.title;
  trackCategory.textContent = `題目: ${assignment.category}`;
  // Insert a user-gesture play button first to avoid autoplay being blocked
  playPrompt.innerHTML = '';
  const playBtn = document.createElement('button');
  playBtn.className = 'play-audio-btn';
  playBtn.type = 'button';
  playBtn.textContent = '點擊播放音樂';

  playBtn.onclick = () => {
    // Directly insert the YouTube iframe during the user click event;
    // this keeps playback within the user gesture and helps iOS Chrome.
    videoContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${assignment.song.videoId}?autoplay=1&controls=0&rel=0&playsinline=1" width="1" height="1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    playPrompt.innerHTML = '<div class="subtext">音樂已啟動，請保持此頁面開啟。</div>';
  };
  playPrompt.appendChild(playBtn);

  let time = timeLeft;
  timeLeftLabel.textContent = time;
  voteTimer = setInterval(() => {
    time -= 1;
    timeLeftLabel.textContent = time;
    if (time <= 0) {
      clearInterval(voteTimer);
    }
  }, 1000);
});

socket.on('votingStarted', ({ players, settings }) => {
  playingView.classList.add('hidden');
  votingView.classList.remove('hidden');
  resultView.classList.add('hidden');
  finishedView.classList.add('hidden');
  voteList.innerHTML = '';
  selectedVote = null;
  voteTimeLeftLabel.textContent = settings.voteDuration || 15;
  voteButtons = players.map((player) => {
    const button = document.createElement('button');
    button.className = 'vote-button';
    button.type = 'button';
    button.textContent = player.name;
    button.onclick = () => {
      if (selectedVote) return;
      selectedVote = player.id;
      voteButtons.forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      socket.emit('castVote', { roomId: currentRoomId, votedId: player.id });
      showToast(`已投給 ${player.name}`);
    };
    voteList.appendChild(button);
    return button;
  });
  let voteTime = settings.voteDuration || 15;
  clearInterval(voteCountdownTimer);
  voteCountdownTimer = setInterval(() => {
    voteTime -= 1;
    voteTimeLeftLabel.textContent = Math.max(voteTime, 0);
    if (voteTime <= 0) {
      clearInterval(voteCountdownTimer);
    }
  }, 1000);
});

socket.on('roundResult', ({ results, scores, correct, guessedId, players, roundIndex, rounds }) => {
  playingView.classList.add('hidden');
  votingView.classList.add('hidden');
  resultView.classList.remove('hidden');
  finishedView.classList.add('hidden');
  resultSummary.innerHTML = `
    <p>這一局的臥底是 <strong>${results.find((item) => item.isImpostor).name}</strong></p>
    <p>多數人猜的是 <strong>${results.find((item) => item.id === guessedId)?.name || '無人'}</strong></p>
    <p>${correct ? '猜對了！平民獲得加分。' : '猜錯了！臥底獲得分數。'}</p>
    <div>${results
      .map((item) => `<div class="result-line">${item.name} - ${item.votes} 票 ${item.isImpostor ? '<strong>臥底</strong>' : '平民'}</div>`)
      .join('')}</div>
    <div class="result-line"><strong>目前累積分數</strong></div>
    <div>${scores.map((item) => `<div class="result-line">${item.name} - ${item.score} 分</div>`).join('')}</div>
    <div class="result-line"><strong>5 秒後自動進入下一局或結束遊戲</strong></div>
  `;
});

socket.on('gameFinished', ({ scores }) => {
  playingView.classList.add('hidden');
  votingView.classList.add('hidden');
  resultView.classList.add('hidden');
  finishedView.classList.remove('hidden');
  finalResult.innerHTML = `
    <p>遊戲結束，感謝參與！</p>
    <div>${scores
      .map((item) => `<div class="result-line">${item.name} - ${item.score || 0} 分</div>`)
      .join('')}</div>
  `;
});

socket.on('errorMessage', (message) => {
  showToast(message);
});
