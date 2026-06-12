const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const songs = {
  "中文歌": [
    { title: "告白氣球 - 周杰倫", videoId: "m__VokU_vx0" },
    { title: "平凡之路 - 朴樹", videoId: "Cx7GkrKkBFiI" },
    { title: "年少有為 - 李榮浩", videoId: "_x4GQ-JwzBk" },
    { title: "小幸運 - 田馥甄", videoId: "w3Hn46fAahc" },
    { title: "喜歡你 - 鄧紫棋", videoId: "ef66b63F7aQ" }
  ],
  "西洋歌": [
    { title: "Shape of You - Ed Sheeran", videoId: "JGwWNGJdvx8" },
    { title: "Blinding Lights - The Weeknd", videoId: "4NRXx6U8ABQ" },
    { title: "Levitating - Dua Lipa", videoId: "TUVcZfQe-Kw" },
    { title: "Dance Monkey - Tones and I", videoId: "q0hyYWKXF0Q" },
    { title: "Shallow - Lady Gaga & Bradley Cooper", videoId: "pB-5XG-DBAA" }
  ],
  "日文歌": [
    { title: "Lemon - 米津玄師", videoId: "SX_ViT4Ra7k" },
    { title: "紅蓮華 - LiSA", videoId: "pzkKaFQ7oGc" },
    { title: "Pretender - Official髭男dism", videoId: "TQ8WlA2GXbk" },
    { title: "打上花火 - DAOKO × 米津玄師", videoId: "C7z7~lN9xbo" },
    { title: "夜に駆ける - YOASOBI", videoId: "byCfzMDZ33c" }
  ],
  "韓文歌": [
    { title: "Dynamite - BTS", videoId: "gOL8nUct_tk" },
    { title: "Ice Cream - BLACKPINK & Selena Gomez", videoId: "tt2k8PGm-TI" },
    { title: "Gangnam Style - PSY", videoId: "9bZkp7q19f0" },
    { title: "How You Like That - BLACKPINK", videoId: "ioNng23DkIM" },
    { title: "Love Scenario - iKON", videoId: "7J6jK_Jmft8" }
  ]
};

const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('createRoom', ({ nickname, settings }) => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      id: roomId,
      hostId: socket.id,
      settings: normalizeSettings(settings),
      players: [],
      phase: 'lobby',
      roundIndex: 0,
      votes: {},
      timer: null,
      roundData: null,
      results: []
    };
    socket.join(roomId);
    addPlayerToRoom(roomId, socket.id, nickname, true);
    emitRoomUpdate(roomId);
    socket.emit('roomCreated', { roomId });
  });

  socket.on('joinRoom', ({ nickname, roomId }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('errorMessage', '房間不存在。');
      return;
    }
    if (room.players.length >= 8) {
      socket.emit('errorMessage', '房間已滿，最多 8 人。');
      return;
    }
    socket.join(roomId);
    addPlayerToRoom(roomId, socket.id, nickname, false);
    emitRoomUpdate(roomId);
    io.to(socket.id).emit('joinedRoom', { roomId });
  });

  socket.on('updateSettings', ({ roomId, settings }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    room.settings = normalizeSettings(settings);
    emitRoomUpdate(roomId);
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 3) {
      socket.emit('errorMessage', '至少 3 人才能開始遊戲。');
      return;
    }
    if (room.settings.impostorCount >= room.players.length) {
      socket.emit('errorMessage', '臥底人數必須比玩家少。');
      return;
    }
    room.phase = 'playing';
    room.roundIndex += 1;
    room.votes = {};
    room.roundData = createRoundData(room);
    startRoundTimer(roomId);
    emitGameState(roomId);
    emitRoomUpdate(roomId);
  });

  socket.on('castVote', ({ roomId, votedId }) => {
    const room = rooms[roomId];
    if (!room || room.phase !== 'voting') return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    room.votes[socket.id] = votedId;
    emitGameState(roomId);
    if (Object.keys(room.votes).length === room.players.length) {
      clearTimeout(room.timer);
      processVoting(roomId);
    }
  });

  socket.on('nextRound', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    if (room.roundIndex >= room.settings.rounds) {
      room.phase = 'finished';
      emitGameState(roomId);
      emitRoomUpdate(roomId);
      return;
    }
    room.phase = 'playing';
    room.roundIndex += 1;
    room.votes = {};
    room.roundData = createRoundData(room);
    startRoundTimer(roomId);
    emitGameState(roomId);
    emitRoomUpdate(roomId);
  });

  socket.on('finishGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.hostId !== socket.id) return;
    room.phase = 'finished';
    emitGameState(roomId);
    emitRoomUpdate(roomId);
  });

  socket.on('disconnect', () => {
    removePlayerFromRoom(socket.id);
  });
});

function generateRoomId() {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i += 1) id += letters[Math.floor(Math.random() * letters.length)];
  return rooms[id] ? generateRoomId() : id;
}

function normalizeSettings(settings) {
  return {
    category: settings.category || '中文歌',
    rounds: Math.max(1, Math.min(10, Number(settings.rounds) || 3)),
    impostorCount: Math.max(1, Math.min(3, Number(settings.impostorCount) || 1)),
    roundDuration: 25,
    voteDuration: 15,
    resultDuration: 5
  };
}

function addPlayerToRoom(roomId, socketId, nickname, isHost) {
  const room = rooms[roomId];
  if (!room) return;
  if (room.players.some((player) => player.id === socketId)) return;
  room.players.push({ id: socketId, name: sanitizeName(nickname), isHost, score: 0 });
}

function sanitizeName(name) {
  return String(name || '玩家').slice(0, 12);
}

function emitRoomUpdate(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  io.to(roomId).emit('roomUpdate', {
    players: room.players.map((player) => ({ id: player.id, name: player.name, isHost: player.isHost })),
    settings: room.settings,
    phase: room.phase,
    roundIndex: room.roundIndex,
    rounds: room.settings.rounds,
    hostId: room.hostId
  });
}

function emitGameState(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const common = {
    players: room.players.map((player) => ({ id: player.id, name: player.name })),
    phase: room.phase,
    roundIndex: room.roundIndex,
    rounds: room.settings.rounds,
    hostId: room.hostId,
    settings: room.settings
  };
  if (room.phase === 'playing') {
    room.players.forEach((player) => {
      const assignment = room.roundData.assignments[player.id];
      io.to(player.id).emit('roundStarted', {
        ...common,
        assignment,
        timeLeft: room.settings.roundDuration
      });
    });
  } else if (room.phase === 'voting') {
    io.to(roomId).emit('votingStarted', {
      ...common,
      votes: room.votes,
      revealed: false
    });
  } else if (room.phase === 'result') {
    io.to(roomId).emit('roundResult', {
      ...common,
      results: room.results,
      scores: room.results.scores,
      revealed: true
    });
  } else if (room.phase === 'finished') {
    io.to(roomId).emit('gameFinished', {
      ...common,
      results: room.results,
      scores: room.players.map((player) => ({ id: player.id, name: player.name, score: player.score }))
    });
  }
}

function createRoundData(room) {
  const category = room.settings.category;
  const categorySongs = songs[category];
  const playingSong = randomItem(categorySongs);
  const impersonatorSong = randomItem(categorySongs.filter((track) => track.videoId !== playingSong.videoId));
  const assignment = {};
  const indexes = [...room.players.keys()];
  shuffleArray(indexes);
  const impostorIds = indexes.slice(0, room.settings.impostorCount);
  room.players.forEach((player, index) => {
    const isImpostor = impostorIds.includes(index);
    assignment[player.id] = {
      isImpostor,
      song: isImpostor ? impersonatorSong : playingSong,
      category
    };
  });
  return { assignments: assignment, category, playingSong, impersonatorSong };
}

function startRoundTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.phase = 'voting';
    room.votes = {};
    emitGameState(roomId);
    emitRoomUpdate(roomId);
    startVotingTimer(roomId);
  }, room.settings.roundDuration * 1000);
}

function startVotingTimer(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    processVoting(roomId);
  }, room.settings.voteDuration * 1000);
}

function processVoting(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const impostorIds = room.players
    .filter((player) => room.roundData.assignments[player.id].isImpostor)
    .map((player) => player.id);
  const voteTally = {};
  Object.values(room.votes).forEach((targetId) => {
    voteTally[targetId] = (voteTally[targetId] || 0) + 1;
  });
  const topVote = Object.entries(voteTally).sort((a, b) => b[1] - a[1])[0] || [];
  const guessedId = topVote[0] || null;
  const correct = impostorIds.includes(guessedId);
  const details = room.players.map((player) => ({
    id: player.id,
    name: player.name,
    isImpostor: impostorIds.includes(player.id),
    votes: Object.values(room.votes).filter((vote) => vote === player.id).length
  }));
  if (correct) {
    room.players.forEach((player) => {
      if (!room.roundData.assignments[player.id].isImpostor) {
        player.score += 1;
      }
    });
  } else {
    room.players.forEach((player) => {
      if (room.roundData.assignments[player.id].isImpostor) {
        player.score += 1;
      }
    });
  }
  room.results = {
    round: room.roundIndex,
    guessedId,
    correct,
    details,
    scores: room.players.map((player) => ({ id: player.id, name: player.name, score: player.score }))
  };
  room.phase = 'result';
  emitGameState(roomId);
  emitRoomUpdate(roomId);
  scheduleNextRound(roomId);
}

function scheduleNextRound(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    if (room.roundIndex >= room.settings.rounds) {
      room.phase = 'finished';
      emitGameState(roomId);
      emitRoomUpdate(roomId);
      return;
    }
    room.phase = 'playing';
    room.roundIndex += 1;
    room.votes = {};
    room.roundData = createRoundData(room);
    emitGameState(roomId);
    emitRoomUpdate(roomId);
    startRoundTimer(roomId);
  }, room.settings.resultDuration * 1000);
}

function removePlayerFromRoom(socketId) {
  Object.values(rooms).forEach((room) => {
    const index = room.players.findIndex((player) => player.id === socketId);
    if (index !== -1) {
      room.players.splice(index, 1);
      if (room.hostId === socketId && room.players.length > 0) {
        room.hostId = room.players[0].id;
        room.players[0].isHost = true;
      }
      if (room.players.length === 0) {
        delete rooms[room.id];
      } else {
        emitRoomUpdate(room.id);
      }
    }
  });
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

server.listen(PORT, () => {
  console.log(`Music Impostor server listening on http://localhost:${PORT}`);
});
