import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import { PRESET_CHAT_MESSAGES } from './src/data/progression';
import { getTrackById } from './src/data/tracks';
import {
  LeaderboardEntry,
  PlayerProfile,
  RemoteKartNetState,
  RoomPlayer,
  RoomState,
  TimeOfDay,
  WeatherCondition,
} from './src/types/game';

dotenv.config();

const PORT = 3000;
const MAX_ROOM_PLAYERS = 8;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

interface DbSchema {
  profiles: Record<string, PlayerProfile>;
  leaderboards: Record<string, LeaderboardEntry[]>;
}

function loadDb(): DbSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DbSchema;
      return {
        profiles: parsed.profiles || {},
        leaderboards: parsed.leaderboards || {},
      };
    }
  } catch (err) {
    console.error('Failed loading db.json:', err);
  }
  return { profiles: {}, leaderboards: {} };
}

let db: DbSchema = loadDb();

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving db.json:', err);
  }
}

interface InternalRoom {
  state: RoomState;
  kickedPlayerIds: Set<string>;
  latestKartStates: Map<string, RemoteKartNetState>;
  finishedOrder: { playerId: string; name: string; timeMs: number }[];
  broadcastTimer: NodeJS.Timeout | null;
}

interface ClientConn {
  ws: WebSocket;
  playerId: string;
  name: string;
  tag: string;
  roomCode: string | null;
}

const rooms = new Map<string, InternalRoom>();
const connections = new Map<string, ClientConn>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode() : code;
}

function sendJson(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcastRoom(room: InternalRoom, type: string, payload: unknown, excludePlayerId?: string) {
  for (const p of room.state.players) {
    if (excludePlayerId && p.playerId === excludePlayerId) continue;
    const conn = connections.get(p.playerId);
    if (conn) sendJson(conn.ws, type, payload);
  }
}

function createRoomInstance(
  hostConn: ClientConn,
  hostPlayer: RoomPlayer,
  opts: {
    isPublic: boolean;
    trackId: string;
    laps?: number;
    maxPlayers?: number;
    timeOfDay?: TimeOfDay;
    weather?: WeatherCondition;
    fillWithAi: boolean;
  }
): InternalRoom {
  const code = generateRoomCode();
  const track = getTrackById(opts.trackId);
  const clampedLaps = Math.max(1, Math.min(7, Number(opts.laps) || track.laps));
  const clampedMax = Math.max(2, Math.min(MAX_ROOM_PLAYERS, Number(opts.maxPlayers) || 8));

  const state: RoomState = {
    code,
    isPublic: Boolean(opts.isPublic),
    locked: false,
    hostId: hostConn.playerId,
    trackId: track.id,
    laps: clampedLaps,
    maxPlayers: clampedMax,
    timeOfDay: opts.timeOfDay || 'day',
    weather: opts.weather || 'clear',
    fillWithAi: Boolean(opts.fillWithAi),
    status: 'lobby',
    players: [{ ...hostPlayer, isHost: true, slotIndex: 0, connected: true }],
    chat: [
      {
        id: `sys_${Date.now()}`,
        senderName: 'إدارة السباق',
        text: opts.isPublic
          ? `تم إنشاء الغرفة العامة ${code}.`
          : `تم إنشاء الغرفة الخاصة ${code}. شارك الرمز مع أصدقائك فقط!`,
        timestamp: Date.now(),
      },
    ],
  };

  const room: InternalRoom = {
    state,
    kickedPlayerIds: new Set(),
    latestKartStates: new Map(),
    finishedOrder: [],
    broadcastTimer: null,
  };
  rooms.set(code, room);
  hostConn.roomCode = code;
  return room;
}

function startRoomStateLoop(room: InternalRoom) {
  if (room.broadcastTimer) clearInterval(room.broadcastTimer);
  room.broadcastTimer = setInterval(() => {
    if (room.state.status !== 'racing') return;
    if (room.latestKartStates.size === 0) return;
    const states = Array.from(room.latestKartStates.values());
    broadcastRoom(room, 'race:states', states);
  }, 50); // 20Hz snapshot broadcast
}

function leaveCurrentRoom(conn: ClientConn) {
  if (!conn.roomCode) return;
  const room = rooms.get(conn.roomCode);
  conn.roomCode = null;
  if (!room) return;

  if (room.state.status === 'racing') {
    const target = room.state.players.find((p) => p.playerId === conn.playerId);
    if (target) target.connected = false;
    broadcastRoom(room, 'room:state', room.state);
    if (room.state.players.every((p) => !p.connected)) {
      if (room.broadcastTimer) clearInterval(room.broadcastTimer);
      rooms.delete(room.state.code);
    }
    return;
  }

  room.state.players = room.state.players.filter((p) => p.playerId !== conn.playerId);
  if (room.state.players.length === 0) {
    if (room.broadcastTimer) clearInterval(room.broadcastTimer);
    rooms.delete(room.state.code);
    return;
  }

  room.state.players.forEach((p, idx) => {
    p.slotIndex = idx;
    p.isHost = idx === 0;
  });
  room.state.hostId = room.state.players[0].playerId;
  broadcastRoom(room, 'room:state', room.state);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size, onlinePlayers: connections.size });
  });

  app.post('/api/profile/sync', (req, res) => {
    const profile = req.body as PlayerProfile;
    if (!profile || !profile.playerId) {
      res.status(400).json({ error: 'Invalid profile' });
      return;
    }
    const existing = db.profiles[profile.playerId];
    if (existing) {
      const merged: PlayerProfile = {
        ...profile,
        coins: Math.max(existing.coins, profile.coins),
        xp: Math.max(existing.xp, profile.xp),
        level: Math.max(existing.level, profile.level),
        wins: Math.max(existing.wins, profile.wins),
        racesPlayed: Math.max(existing.racesPlayed, profile.racesPlayed),
        unlockedCharacters: Array.from(new Set([...existing.unlockedCharacters, ...profile.unlockedCharacters])),
        unlockedKarts: Array.from(new Set([...existing.unlockedKarts, ...profile.unlockedKarts])),
        unlockedParts: Array.from(new Set([...existing.unlockedParts, ...profile.unlockedParts])),
        unlockedTracks: Array.from(new Set([...existing.unlockedTracks, ...profile.unlockedTracks])),
        unlockedAchievements: Array.from(new Set([...existing.unlockedAchievements, ...profile.unlockedAchievements])),
      };
      db.profiles[profile.playerId] = merged;
    } else {
      db.profiles[profile.playerId] = profile;
    }
    saveDb();
    res.json({ profile: db.profiles[profile.playerId] });
  });

  app.get('/api/profile/:playerId', (req, res) => {
    const p = db.profiles[req.params.playerId];
    if (!p) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json({ profile: p });
  });

  app.post('/api/friends/add', (req, res) => {
    const { playerId, friendTag } = req.body as { playerId: string; friendTag: string };
    if (!playerId || !friendTag) {
      res.status(400).json({ error: 'Missing playerId or friendTag' });
      return;
    }
    const q = friendTag.trim().toUpperCase();
    const match = Object.values(db.profiles).find(
      (p) => p.playerId !== playerId && (p.tag.toUpperCase() === q || p.name.toUpperCase() === q)
    );
    if (!match) {
      res.status(404).json({ error: 'لم يتم العثور على متسابق بهذا الرمز أو الاسم.' });
      return;
    }
    const online = connections.has(match.playerId);
    res.json({
      friend: {
        playerId: match.playerId,
        name: match.name,
        tag: match.tag,
        online,
      },
    });
  });

  app.get('/api/friends/status', (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter(Boolean);
    const statuses: Record<string, boolean> = {};
    for (const id of ids) statuses[id] = connections.has(id);
    res.json({ statuses });
  });

  app.get('/api/leaderboards', (_req, res) => {
    const topRacers = Object.values(db.profiles)
      .sort((a, b) => b.wins - a.wins || b.xp - a.xp)
      .slice(0, 20)
      .map((p) => ({
        playerId: p.playerId,
        name: p.name,
        tag: p.tag,
        level: p.level,
        wins: p.wins,
        racesPlayed: p.racesPlayed,
      }));
    res.json({
      trackBoards: db.leaderboards,
      topRacers,
    });
  });

  app.post('/api/leaderboards/submit', (req, res) => {
    const entry = req.body as LeaderboardEntry;
    if (!entry || !entry.trackId || !entry.playerId || typeof entry.timeMs !== 'number') {
      res.status(400).json({ error: 'Invalid entry' });
      return;
    }
    if (entry.timeMs < 15000 || entry.timeMs > 1800000) {
      res.status(400).json({ error: 'Time outside valid range' });
      return;
    }
    const list = db.leaderboards[entry.trackId] || [];
    const existingIdx = list.findIndex((e) => e.playerId === entry.playerId);
    if (existingIdx >= 0) {
      if (entry.timeMs < list[existingIdx].timeMs) {
        list[existingIdx] = { ...entry, updatedAt: Date.now() };
      }
    } else {
      list.push({ ...entry, updatedAt: Date.now() });
    }
    list.sort((a, b) => a.timeMs - b.timeMs);
    db.leaderboards[entry.trackId] = list.slice(0, 25);
    saveDb();
    res.json({ board: db.leaderboards[entry.trackId] });
  });

  // Strict Private Room Rule: NEVER expose isPublic === false rooms here
  app.get('/api/rooms/public', (_req, res) => {
    const list = Array.from(rooms.values())
      .filter(
        (r) =>
          r.state.isPublic === true &&
          !r.state.locked &&
          r.state.status === 'lobby' &&
          r.state.players.length < r.state.maxPlayers
      )
      .map((r) => ({
        code: r.state.code,
        trackId: r.state.trackId,
        laps: r.state.laps,
        playerCount: r.state.players.length,
        maxPlayers: r.state.maxPlayers,
        hostName: r.state.players[0]?.name || 'المضيف',
      }));
    res.json({ rooms: list });
  });

  app.post('/api/race-coach', async (req, res) => {
    const { trackName, characterName, kartName, position, timeMs, driftsCompleted, bestLapMs, language } = req.body as {
      trackName: string;
      characterName: string;
      kartName: string;
      position: number;
      timeMs: number;
      driftsCompleted: number;
      bestLapMs: number;
      language?: 'ar' | 'en';
    };

    const isAr = language !== 'en';
    const fallbackAr = `أداء رائع بسيارة ${kartName} على مضمار ${trackName}! ركز على شحن الانجراف البنفسجي عند المنعطفات واستخدام منصات التسريع لتحسين توقيتك البالغ ${(bestLapMs / 1000 || 30).toFixed(1)} ثانية.`;
    const fallbackEn = `Strong run in the ${kartName} on ${trackName}! Chain 3-tier purple drift boosts out of tight hairpins and hit boost ramps to shave seconds off your ${(bestLapMs / 1000 || 30).toFixed(1)}s lap pace.`;

    if (!process.env.GEMINI_API_KEY) {
      res.json({ tip: isAr ? fallbackAr : fallbackEn });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const prompt = isAr
        ? `أنت مهندس سباقات محترف. قدّم نصيحة قصيرة من جملتين باللغة العربية الفصحى لسائق (${characterName}) يقود سيارة (${kartName}) على مضمار "${trackName}". أنهى السباق في المركز ${position} بزمن ${(timeMs / 1000).toFixed(2)} ثانية مع ${driftsCompleted} انجرافاً توربينياً. ركز على توقيت الانجراف والاختصارات وإدارة حالة السيارة.`
        : `You are a professional racing race engineer. Give a punchy 2-sentence post-race telemetry tip for ${characterName} driving ${kartName} on "${trackName}". They finished P${position} in ${(timeMs / 1000).toFixed(2)}s with ${driftsCompleted} turbo drifts completed. Focus on drift boost timing, shortcuts, or vehicle condition.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      });
      res.json({ tip: (response.text || '').trim() || (isAr ? fallbackAr : fallbackEn) });
    } catch (err) {
      console.error('Gemini race-coach error:', err);
      res.json({ tip: isAr ? fallbackAr : fallbackEn });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let conn: ClientConn | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type: string; payload: any };
        const { type, payload } = msg;

        if (type === 'auth') {
          const { playerId, name, tag, loadout } = payload;
          if (!playerId) return;
          conn = { ws, playerId, name: name || 'متسابق', tag: tag || 'APEX#0001', roomCode: null };
          connections.set(playerId, conn);

          for (const [code, room] of rooms.entries()) {
            const existingSlot = room.state.players.find((p) => p.playerId === playerId);
            if (existingSlot) {
              existingSlot.connected = true;
              if (loadout) existingSlot.loadout = loadout;
              conn.roomCode = code;
              sendJson(ws, 'auth:ok', { playerId, reconnectedRoom: room.state });
              broadcastRoom(room, 'room:state', room.state);
              return;
            }
          }
          sendJson(ws, 'auth:ok', { playerId });
          return;
        }

        if (!conn) return;

        if (type === 'room:create') {
          leaveCurrentRoom(conn);
          const { isPublic, trackId, laps, maxPlayers, timeOfDay, weather, fillWithAi, loadout } = payload || {};
          const safeLoadout = loadout || {
            characterId: 'blaze_vex',
            skinId: 'classic',
            kartId: 'apex_classic',
            wheelId: 'alloy',
            tireId: 'slick',
            spoilerId: 'gt',
            paintColor: '#EF4444',
            decalId: 'stripes',
            engineId: 'stock_twin',
            exhaustId: 'standard',
          };
          const player: RoomPlayer = {
            playerId: conn.playerId,
            name: conn.name,
            tag: conn.tag,
            characterId: safeLoadout.characterId || 'blaze_vex',
            loadout: safeLoadout,
            ready: true,
            connected: true,
            isHost: true,
            slotIndex: 0,
          };
          const room = createRoomInstance(conn, player, {
            isPublic: Boolean(isPublic),
            trackId: trackId || 'coco_bay',
            laps,
            maxPlayers,
            timeOfDay,
            weather,
            fillWithAi: fillWithAi ?? true,
          });
          sendJson(ws, 'room:state', room.state);
        } else if (type === 'room:join') {
          const code = String(payload?.code || '').trim().toUpperCase();
          const room = rooms.get(code);
          if (!room) {
            sendJson(ws, 'room:error', { message: `الغرفة "${code}" غير موجودة.` });
            return;
          }
          if (room.kickedPlayerIds.has(conn.playerId)) {
            sendJson(ws, 'room:error', { message: 'تم استبعادك من هذه الغرفة ولا يمكنك العودة إليها.' });
            return;
          }
          if (room.state.locked) {
            sendJson(ws, 'room:error', { message: 'هذه الغرفة مقفلة من قِبل المضيف.' });
            return;
          }
          if (room.state.status !== 'lobby') {
            sendJson(ws, 'room:error', { message: 'السباق قيد التشغيل بالفعل في هذه الغرفة.' });
            return;
          }
          if (room.state.players.length >= room.state.maxPlayers) {
            sendJson(ws, 'room:error', {
              message: `الغرفة ممتلئة (${room.state.players.length}/${room.state.maxPlayers}).`,
            });
            return;
          }

          leaveCurrentRoom(conn);
          conn.roomCode = code;
          const safeLoadout = payload?.loadout || {
            characterId: 'blaze_vex',
            skinId: 'classic',
            kartId: 'apex_classic',
            wheelId: 'alloy',
            tireId: 'slick',
            spoilerId: 'gt',
            paintColor: '#EF4444',
            decalId: 'stripes',
            engineId: 'stock_twin',
            exhaustId: 'standard',
          };
          const player: RoomPlayer = {
            playerId: conn.playerId,
            name: conn.name,
            tag: conn.tag,
            characterId: safeLoadout.characterId || 'blaze_vex',
            loadout: safeLoadout,
            ready: false,
            connected: true,
            isHost: false,
            slotIndex: room.state.players.length,
          };
          room.state.players.push(player);
          room.state.chat.push({
            id: `sys_${Date.now()}_${Math.random()}`,
            senderName: 'إدارة السباق',
            text: `انضم ${conn.name} إلى الغرفة.`,
            timestamp: Date.now(),
          });
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'room:matchmake') {
          leaveCurrentRoom(conn);
          // Strict Private Room Rule: NEVER matchmake into isPublic === false or locked rooms
          const openPublic = Array.from(rooms.values()).find(
            (r) =>
              r.state.isPublic === true &&
              !r.state.locked &&
              !r.kickedPlayerIds.has(conn!.playerId) &&
              r.state.status === 'lobby' &&
              r.state.players.length < r.state.maxPlayers
          );
          const safeLoadout = payload?.loadout || {
            characterId: 'blaze_vex',
            skinId: 'classic',
            kartId: 'apex_classic',
            wheelId: 'alloy',
            tireId: 'slick',
            spoilerId: 'gt',
            paintColor: '#EF4444',
            decalId: 'stripes',
            engineId: 'stock_twin',
            exhaustId: 'standard',
          };
          if (openPublic) {
            conn.roomCode = openPublic.state.code;
            const player: RoomPlayer = {
              playerId: conn.playerId,
              name: conn.name,
              tag: conn.tag,
              characterId: safeLoadout.characterId || 'blaze_vex',
              loadout: safeLoadout,
              ready: true,
              connected: true,
              isHost: false,
              slotIndex: openPublic.state.players.length,
            };
            openPublic.state.players.push(player);
            openPublic.state.chat.push({
              id: `sys_${Date.now()}_${Math.random()}`,
              senderName: 'إدارة السباق',
              text: `انضم ${conn.name} عبر البحث السريع.`,
              timestamp: Date.now(),
            });
            broadcastRoom(openPublic, 'room:state', openPublic.state);
          } else {
            const player: RoomPlayer = {
              playerId: conn.playerId,
              name: conn.name,
              tag: conn.tag,
              characterId: safeLoadout.characterId || 'blaze_vex',
              loadout: safeLoadout,
              ready: true,
              connected: true,
              isHost: true,
              slotIndex: 0,
            };
            const room = createRoomInstance(conn, player, {
              isPublic: true,
              trackId: payload?.trackId || 'coco_bay',
              fillWithAi: true,
            });
            sendJson(ws, 'room:state', room.state);
          }
        } else if (type === 'room:leave') {
          leaveCurrentRoom(conn);
          sendJson(ws, 'room:left', {});
        } else if (type === 'room:update_settings') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.hostId !== conn.playerId) return;
          if (payload.trackId) room.state.trackId = getTrackById(payload.trackId).id;
          if (typeof payload.laps === 'number') {
            room.state.laps = Math.max(1, Math.min(7, Math.floor(payload.laps)));
          }
          if (typeof payload.maxPlayers === 'number') {
            room.state.maxPlayers = Math.max(
              Math.max(2, room.state.players.length),
              Math.min(MAX_ROOM_PLAYERS, Math.floor(payload.maxPlayers))
            );
          }
          if (payload.timeOfDay === 'day' || payload.timeOfDay === 'sunset' || payload.timeOfDay === 'night') {
            room.state.timeOfDay = payload.timeOfDay;
          }
          if (payload.weather === 'clear' || payload.weather === 'rain') {
            room.state.weather = payload.weather;
          }
          if (typeof payload.fillWithAi === 'boolean') room.state.fillWithAi = payload.fillWithAi;
          if (typeof payload.locked === 'boolean') room.state.locked = payload.locked;
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'room:lock') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.hostId !== conn.playerId) return;
          room.state.locked = Boolean(payload.locked);
          room.state.chat.push({
            id: `sys_${Date.now()}_${Math.random()}`,
            senderName: 'إدارة السباق',
            text: room.state.locked ? 'قام المضيف بقفل الغرفة.' : 'قام المضيف بفتح الغرفة.',
            timestamp: Date.now(),
          });
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'room:kick') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.hostId !== conn.playerId) return;
          const targetId = String(payload.targetPlayerId || '');
          if (!targetId || targetId === conn.playerId) return;
          const target = room.state.players.find((p) => p.playerId === targetId);
          if (!target) return;

          room.kickedPlayerIds.add(targetId);
          room.state.players = room.state.players.filter((p) => p.playerId !== targetId);
          room.state.players.forEach((p, idx) => {
            p.slotIndex = idx;
          });
          room.state.chat.push({
            id: `sys_${Date.now()}_${Math.random()}`,
            senderName: 'إدارة السباق',
            text: `تم إخراج ${target.name} من الغرفة.`,
            timestamp: Date.now(),
          });

          const targetConn = connections.get(targetId);
          if (targetConn) {
            targetConn.roomCode = null;
            sendJson(targetConn.ws, 'room:kicked', { reason: 'تم استبعادك من الغرفة من قِبل المضيف.' });
          }
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'room:update_loadout') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room) return;
          const p = room.state.players.find((x) => x.playerId === conn!.playerId);
          if (p && payload.loadout) {
            p.loadout = payload.loadout;
            p.characterId = payload.loadout.characterId;
            broadcastRoom(room, 'room:state', room.state);
          }
        } else if (type === 'room:ready') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room) return;
          const p = room.state.players.find((x) => x.playerId === conn!.playerId);
          if (p) {
            p.ready = Boolean(payload.ready);
            broadcastRoom(room, 'room:state', room.state);
          }
        } else if (type === 'room:chat') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room) return;
          const rawText = String(payload.text || '').trim().slice(0, 80);
          const safeText = PRESET_CHAT_MESSAGES.includes(rawText) ? rawText : rawText.replace(/[<>]/g, '');
          if (!safeText) return;
          room.state.chat.push({
            id: `c_${Date.now()}_${Math.random()}`,
            senderName: conn.name,
            text: safeText,
            timestamp: Date.now(),
          });
          if (room.state.chat.length > 30) room.state.chat.shift();
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'room:start') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.hostId !== conn.playerId) return;
          room.state.status = 'racing';
          room.state.raceStartEpoch = Date.now();
          room.latestKartStates.clear();
          room.finishedOrder = [];
          startRoomStateLoop(room);
          broadcastRoom(room, 'race:start', room.state);
        } else if (type === 'room:return_lobby') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.hostId !== conn.playerId) return;
          if (room.broadcastTimer) clearInterval(room.broadcastTimer);
          room.state.status = 'lobby';
          room.latestKartStates.clear();
          broadcastRoom(room, 'room:state', room.state);
        } else if (type === 'race:state') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.status !== 'racing') return;
          const st = payload as RemoteKartNetState;
          if (!st || st.playerId !== conn.playerId) return;
          if (st.lap > room.state.laps + 1 || st.lap < 1) return;
          room.latestKartStates.set(conn.playerId, st);

          if (st.finished && !room.finishedOrder.some((f) => f.playerId === conn!.playerId)) {
            room.finishedOrder.push({
              playerId: conn.playerId,
              name: conn.name,
              timeMs: st.finishTimeMs,
            });
            broadcastRoom(room, 'race:player_finished', room.finishedOrder);
          }
        } else if (type === 'race:powerup') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.status !== 'racing') return;
          broadcastRoom(room, 'race:powerup', { ...payload, ownerId: conn.playerId }, conn.playerId);
        } else if (type === 'race:crash') {
          const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
          if (!room || room.state.status !== 'racing') return;
          broadcastRoom(room, 'race:crash', { playerId: conn.playerId }, conn.playerId);
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    });

    ws.on('close', () => {
      if (!conn) return;
      const room = conn.roomCode ? rooms.get(conn.roomCode) : null;
      if (room && room.state.status === 'racing') {
        const slot = room.state.players.find((p) => p.playerId === conn!.playerId);
        if (slot) slot.connected = false;
        broadcastRoom(room, 'room:state', room.state);
      } else {
        leaveCurrentRoom(conn);
      }
      connections.delete(conn.playerId);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Nitro Apex Racing server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
