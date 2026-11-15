import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  Copy,
  Globe,
  KeyRound,
  Lock,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Unlock,
  Users,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCharacterById } from '../data/characters';
import { getKartById } from '../data/karts';
import { getTrackById, TRACKS } from '../data/tracks';
import { getCharacterLocalized, getKartLocalized } from '../i18n/catalogAr';
import { getTrackLocalized, PRESET_CHAT_AR, TRANSLATIONS } from '../i18n/translations';
import { multiplayerClient, WsConnectionStatus } from '../net/MultiplayerClient';
import { Language, PlayerProfile, RoomState, TimeOfDay, WeatherCondition } from '../types/game';

interface PublicRoomSummary {
  code: string;
  trackId: string;
  laps: number;
  playerCount: number;
  maxPlayers: number;
  hostName: string;
}

interface MultiplayerLobbyProps {
  profile: PlayerProfile;
  language: Language;
  initialPrivateMode?: boolean;
  wsStatus: WsConnectionStatus;
  room: RoomState | null;
  errorMsg: string | null;
  selectedTrackId: string;
  onClearError: () => void;
  onOpenGarage: () => void;
  onClose: () => void;
}

export function MultiplayerLobby({
  profile,
  language,
  initialPrivateMode,
  wsStatus,
  room,
  errorMsg,
  selectedTrackId,
  onClearError,
  onOpenGarage,
  onClose,
}: MultiplayerLobbyProps) {
  const tr = TRANSLATIONS[language];
  const [lobbyTab, setLobbyTab] = useState<'private' | 'public'>(
    initialPrivateMode ? 'private' : 'public'
  );
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [copied, setCopied] = useState(false);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const loadPublicRooms = async () => {
    try {
      const res = await fetch('/api/rooms/public');
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data.rooms || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!room) loadPublicRooms();
  }, [room, lobbyTab]);

  const isHost = room?.hostId === profile.playerId;
  const meInRoom = room?.players.find((p) => p.playerId === profile.playerId);

  const handleCopyInvite = () => {
    if (!room) return;
    const inviteUrl = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#050811]/95 flex flex-col p-4 md:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              if (room) multiplayerClient.send('room:leave');
              onClose();
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-white/10"
          >
            <BackIcon className="w-4 h-4" />
            {room ? tr.leaveRoom : tr.back}
          </button>

          <div>
            <h1 className="font-display font-bold text-2xl text-white">
              {room && !room.isPublic ? tr.privateRoomTitle : tr.mpTitle}
            </h1>
            <p className="text-xs text-slate-400">
              <span className={wsStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                {wsStatus === 'connected'
                  ? tr.connected
                  : wsStatus === 'connecting'
                  ? tr.connecting
                  : tr.reconnecting}
              </span>
            </p>
          </div>

          {!room && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 ms-2">
              <button
                onClick={() => setLobbyTab('public')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  lobbyTab === 'public'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                {tr.publicPlayTab}
              </button>
              <button
                onClick={() => setLobbyTab('private')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  lobbyTab === 'private'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {tr.privatePlayTab}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onOpenGarage}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/15 text-cyan-300 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        >
          <Car className="w-4 h-4" />
          {tr.selectCarBtn}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-4 bg-red-950/80 border border-red-500/40 text-red-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={onClearError} className="underline ms-4 cursor-pointer">
            ×
          </button>
        </div>
      )}

      {!room ? (
        lobbyTab === 'private' ? (
          /* Private Rooms Section */
          <div className="max-w-3xl mx-auto w-full mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="apex-surface apex-stripe-top rounded-2xl p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-display font-bold text-lg">
                  <KeyRound className="w-5 h-5" />
                  {tr.createPrivateRoom}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'ar'
                    ? 'تبقى غرفتك الخاصة مخفية عن البحث العام ولا يدخلها سوى الأصدقاء عبر الرمز أو رابط الدعوة.'
                    : 'Your private room stays hidden from public matchmaking and is accessible only via code or invite link.'}
                </p>
              </div>
              <button
                onClick={() =>
                  multiplayerClient.send('room:create', {
                    isPublic: false,
                    trackId: selectedTrackId,
                    fillWithAi: true,
                    maxPlayers: 8,
                    loadout: profile.loadout,
                  })
                }
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold py-3.5 rounded-xl cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                {tr.createPrivateRoom}
              </button>
            </div>

            <div className="apex-surface apex-stripe-top rounded-2xl p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <label className="text-lg font-display font-bold text-white block">
                  {tr.joinByCode}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={tr.enterCodePlaceholder}
                  maxLength={8}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-base font-mono-num text-white uppercase outline-none focus:border-amber-400"
                />
              </div>
              <button
                onClick={() =>
                  multiplayerClient.send('room:join', {
                    code: joinCode,
                    loadout: profile.loadout,
                  })
                }
                disabled={!joinCode.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display font-bold py-3.5 rounded-xl cursor-pointer"
              >
                {tr.join}
              </button>
            </div>
          </div>
        ) : (
          /* Public Multiplayer Section */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 max-w-6xl mx-auto w-full">
            <div className="apex-surface apex-stripe-top rounded-2xl p-5 flex flex-col gap-3.5">
              <h2 className="font-display font-bold text-lg text-white">{tr.publicPlayTab}</h2>
              <button
                onClick={() =>
                  multiplayerClient.send('room:matchmake', {
                    trackId: selectedTrackId,
                    loadout: profile.loadout,
                  })
                }
                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold py-3 rounded-xl cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                {tr.quickPublicMatch}
              </button>

              <button
                onClick={() =>
                  multiplayerClient.send('room:create', {
                    isPublic: true,
                    trackId: selectedTrackId,
                    fillWithAi: true,
                    maxPlayers: 8,
                    loadout: profile.loadout,
                  })
                }
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-xs cursor-pointer border border-white/10"
              >
                {tr.createPublicRoom}
              </button>
            </div>

            <div className="lg:col-span-2 apex-surface rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-white">{tr.openPublicLobbies}</h2>
                <button
                  onClick={loadPublicRooms}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {tr.refresh}
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p>{tr.noPublicLobbies}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {publicRooms.map((r) => {
                    const trackInfo = getTrackLocalized(getTrackById(r.trackId), language);
                    return (
                      <div
                        key={r.code}
                        className="apex-card rounded-xl p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-mono-num font-bold text-sm text-amber-400">
                            {r.code}
                          </div>
                          <div className="text-xs text-white font-semibold mt-0.5">{trackInfo.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.hostName} · {r.playerCount}/{r.maxPlayers} · {r.laps} {tr.lapsLabel}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            multiplayerClient.send('room:join', {
                              code: r.code,
                              loadout: profile.loadout,
                            })
                          }
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs cursor-pointer"
                        >
                          {tr.join}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        /* Active Room Lobby */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5 max-w-6xl mx-auto w-full flex-1 min-h-0">
          <div className="lg:col-span-2 apex-surface apex-stripe-top rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{room.isPublic ? tr.mpTitle : tr.roomCodeLabel}</span>
                  {room.locked && (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {tr.roomLockedLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span dir="ltr" className="font-mono-num font-bold text-2xl text-amber-400">
                    {room.code}
                  </span>
                  <button
                    onClick={handleCopyInvite}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? tr.copiedInvite : tr.copyInvite}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isHost && (
                  <button
                    onClick={() => multiplayerClient.send('room:lock', { locked: !room.locked })}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      room.locked
                        ? 'bg-red-950/70 border-red-500/40 text-red-200'
                        : 'bg-slate-800 border-white/15 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {room.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {room.locked ? tr.unlockRoom : tr.lockRoom}
                  </button>
                )}

                {isHost ? (
                  <button
                    onClick={() => multiplayerClient.send('room:start')}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    {tr.startRaceBtn}
                  </button>
                ) : (
                  <button
                    onClick={() => multiplayerClient.send('room:ready', { ready: !meInRoom?.ready })}
                    className={`px-5 py-2.5 rounded-xl font-display font-bold cursor-pointer ${
                      meInRoom?.ready ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {meInRoom?.ready ? tr.readyState : tr.readyUp}
                  </button>
                )}
              </div>
            </div>

            {/* Host Room Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-950/70 border border-white/10 rounded-xl p-3 text-xs">
              <div>
                <div className="text-slate-400 mb-1">{tr.selectTrackLabel}</div>
                {isHost ? (
                  <select
                    value={room.trackId}
                    onChange={(e) =>
                      multiplayerClient.send('room:update_settings', { trackId: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {TRACKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {getTrackLocalized(t, language).name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-semibold text-white">
                    {getTrackLocalized(getTrackById(room.trackId), language).name}
                  </div>
                )}
              </div>

              <div>
                <div className="text-slate-400 mb-1">{tr.lapsLabel}</div>
                {isHost ? (
                  <select
                    value={room.laps}
                    onChange={(e) =>
                      multiplayerClient.send('room:update_settings', { laps: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono-num"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} {tr.lapsLabel}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-semibold text-white font-mono-num">
                    {room.laps} {tr.lapsLabel}
                  </div>
                )}
              </div>

              <div>
                <div className="text-slate-400 mb-1">{tr.maxPlayersLabel}</div>
                {isHost ? (
                  <select
                    value={room.maxPlayers}
                    onChange={(e) =>
                      multiplayerClient.send('room:update_settings', {
                        maxPlayers: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white font-mono-num"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n} disabled={n < room.players.length}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-semibold text-white font-mono-num">{room.maxPlayers}</div>
                )}
              </div>

              <div>
                <div className="text-slate-400 mb-1">{tr.timeOfDayLabel}</div>
                {isHost ? (
                  <select
                    value={room.timeOfDay}
                    onChange={(e) =>
                      multiplayerClient.send('room:update_settings', {
                        timeOfDay: e.target.value as TimeOfDay,
                      })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {(['day', 'sunset', 'night'] as TimeOfDay[]).map((tod) => (
                      <option key={tod} value={tod}>
                        {tr.timesOfDay[tod]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-semibold text-white">{tr.timesOfDay[room.timeOfDay]}</div>
                )}
              </div>

              <div>
                <div className="text-slate-400 mb-1">{tr.weatherLabel}</div>
                {isHost ? (
                  <select
                    value={room.weather}
                    onChange={(e) =>
                      multiplayerClient.send('room:update_settings', {
                        weather: e.target.value as WeatherCondition,
                      })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {(['clear', 'rain'] as WeatherCondition[]).map((w) => (
                      <option key={w} value={w}>
                        {tr.weathers[w]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="font-semibold text-white">{tr.weathers[room.weather]}</div>
                )}
              </div>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer self-end pb-1">
                <input
                  type="checkbox"
                  checked={room.fillWithAi}
                  disabled={!isHost}
                  onChange={(e) =>
                    multiplayerClient.send('room:update_settings', { fillWithAi: e.target.checked })
                  }
                  className="accent-amber-500"
                />
                <span className="truncate">{tr.fillAiLabel}</span>
              </label>
            </div>

            {/* Players Grid */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2">{tr.playersList}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Array.from({ length: room.maxPlayers }).map((_, idx) => {
                  const p = room.players[idx];
                  if (!p) {
                    return (
                      <div
                        key={idx}
                        className="border border-dashed border-white/10 rounded-xl p-3 text-xs text-slate-500 flex items-center justify-between"
                      >
                        <span>#{idx + 1}</span>
                        <span>{room.fillWithAi ? tr.aiSlot : tr.openSlot}</span>
                      </div>
                    );
                  }
                  const ch = getCharacterLocalized(getCharacterById(p.characterId), language);
                  const kt = getKartLocalized(getKartById(p.loadout.kartId), language);
                  return (
                    <div
                      key={p.playerId}
                      className="apex-card rounded-xl p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white truncate">{p.name}</span>
                          {p.isHost && (
                            <span className="text-[10px] font-bold text-amber-400">{tr.hostLabel}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {ch.name} · {kt.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold whitespace-nowrap ${
                            !p.connected
                              ? 'text-red-400'
                              : p.ready || p.isHost
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {!p.connected
                            ? tr.reconnecting
                            : p.ready || p.isHost
                            ? tr.readyState
                            : tr.waitingState}
                        </span>
                        {isHost && p.playerId !== profile.playerId && (
                          <button
                            onClick={() =>
                              multiplayerClient.send('room:kick', { targetPlayerId: p.playerId })
                            }
                            title={tr.kickPlayer}
                            className="p-1.5 rounded bg-red-950/70 hover:bg-red-800 text-red-300 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Preset Lobby Chat */}
          <div className="apex-surface rounded-2xl p-4 flex flex-col justify-between gap-3 max-h-[560px]">
            <div className="flex items-center gap-2 text-sm font-display font-bold text-white pb-2 border-b border-white/10">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              {tr.lobbyChat}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pe-1 text-xs">
              {room.chat.map((c) => (
                <div key={c.id} className="bg-slate-950/70 rounded-lg px-3 py-2 border border-white/5">
                  <span className="font-semibold text-amber-400">{c.senderName}: </span>
                  <span className="text-slate-200">{c.text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-2.5">
              <div className="text-[11px] text-slate-400 mb-1.5">{tr.presetChatLabel}</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CHAT_AR.map((msg) => (
                  <button
                    key={msg}
                    onClick={() => multiplayerClient.send('room:chat', { text: msg })}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded text-[11px] cursor-pointer"
                  >
                    <Send className="w-2.5 h-2.5 text-cyan-400" />
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
