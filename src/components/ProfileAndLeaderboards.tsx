import { ArrowLeft, ArrowRight, Award, Check, Coins, Trophy, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../data/progression';
import { TRACKS } from '../data/tracks';
import { getTrackLocalized, TRANSLATIONS } from '../i18n/translations';
import { Language, LeaderboardEntry, PlayerProfile } from '../types/game';
import { formatRaceTime, xpForNextLevel } from '../utils/profileStorage';

interface ProfileAndLeaderboardsProps {
  initialTab: 'profile' | 'leaderboards';
  language: Language;
  profile: PlayerProfile;
  onUpdateName: (name: string) => void;
  onClaimDaily: (challengeId: string) => void;
  onAddFriend: (friend: { playerId: string; name: string; tag: string; online?: boolean }) => void;
  onClose: () => void;
}

const ACHIEVEMENTS_EN: Record<string, { title: string; description: string }> = {
  first_race: { title: 'Lights Out', description: 'Complete your first 3D race.' },
  first_win: { title: 'Gold Podium', description: 'Win 1st place in any race.' },
  drift_master: { title: 'Drift Legend', description: 'Complete 25 turbo drifts.' },
  item_ace: { title: 'Track Tactician', description: 'Use 20 racing items.' },
  garage_tuner: { title: 'Garage Engineer', description: 'Customize your car in the 3D Garage.' },
  online_racer: { title: 'Global Challenger', description: 'Compete in an online multiplayer race.' },
  champ_winner: { title: 'Cup Champion', description: 'Win a 4-round Championship Cup.' },
  collector_10: { title: 'Car Collector', description: 'Unlock 10 cars or drivers.' },
  speed_demon: { title: 'Speed King', description: 'Win 5 races total.' },
  time_breaker: { title: 'Clock Precision', description: 'Finish a Time Trial session.' },
  split_screen: { title: 'Local Rivals', description: 'Play a 2-Player Split-Screen race.' },
  veteran_10: { title: 'Pro Driver', description: 'Complete 10 races.' },
};

const DAILY_EN: Record<string, { title: string; description: string }> = {
  dc_races: { title: 'Daily Warmup', description: 'Complete 2 races in any mode' },
  dc_drifts: { title: 'Drift Specialist', description: 'Execute 10 turbo drifts' },
  dc_win: { title: 'Finish Line Glory', description: 'Win 1st place in a race' },
};

export function ProfileAndLeaderboards({
  initialTab,
  language,
  profile,
  onUpdateName,
  onClaimDaily,
  onAddFriend,
  onClose,
}: ProfileAndLeaderboardsProps) {
  const tr = TRANSLATIONS[language];
  const [tab, setTab] = useState<'profile' | 'challenges' | 'achievements' | 'leaderboards'>(
    initialTab === 'leaderboards' ? 'leaderboards' : 'profile'
  );
  const [nameInput, setNameInput] = useState(profile.name);
  const [friendTagInput, setFriendTagInput] = useState('');
  const [friendMsg, setFriendMsg] = useState<string | null>(null);
  const [friendOnlineMap, setFriendOnlineMap] = useState<Record<string, boolean>>({});

  const [selectedBoardTrack, setSelectedBoardTrack] = useState(TRACKS[0].id);
  const [trackBoards, setTrackBoards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [topRacers, setTopRacers] = useState<
    { playerId: string; name: string; tag: string; level: number; wins: number; racesPlayed: number }[]
  >([]);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    fetch('/api/leaderboards')
      .then((r) => r.json())
      .then((data) => {
        setTrackBoards(data.trackBoards || {});
        setTopRacers(data.topRacers || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (profile.friends.length === 0) return;
    const ids = profile.friends.map((f) => f.playerId).join(',');
    fetch(`/api/friends/status?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((d) => setFriendOnlineMap(d.statuses || {}))
      .catch(() => {});
  }, [profile.friends]);

  const handleAddFriend = async () => {
    if (!friendTagInput.trim()) return;
    setFriendMsg(null);
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: profile.playerId, friendTag: friendTagInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFriendMsg(
          data.error ||
            (language === 'ar' ? 'تعذر العثور على الصديق بهذا الرمز' : 'Could not add friend')
        );
        return;
      }
      onAddFriend(data.friend);
      setFriendTagInput('');
      setFriendMsg(
        language === 'ar'
          ? `تمت إضافة ${data.friend.name} (${data.friend.tag}) بنجاح!`
          : `Added ${data.friend.name} (${data.friend.tag})!`
      );
    } catch {
      setFriendMsg(
        language === 'ar' ? 'خطأ في الاتصال بالخادم أثناء إضافة الصديق.' : 'Network error adding friend.'
      );
    }
  };

  const neededXp = xpForNextLevel(profile.level);
  const boardEntries = trackBoards[selectedBoardTrack] || [];

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/95 flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <BackIcon className="w-4 h-4" />
            {tr.back}
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl text-white">{tr.profileHubTitle}</h1>
            <p className="text-xs text-slate-400">
              <span dir="ltr" className="font-mono-num">{profile.tag}</span> · {tr.level}{' '}
              {profile.level} · {profile.coins} {tr.coins}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['profile', tr.profileTab],
              ['challenges', tr.challengesTab],
              ['achievements', tr.achievementsTab],
              ['leaderboards', tr.leaderboardsTab],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 max-w-5xl mx-auto w-full">
        {tab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-white/15 rounded-xl p-5 space-y-4">
              <h2 className="font-display font-bold text-lg text-white">{tr.menuProfile}</h2>
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block">{tr.displayName}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={18}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => nameInput.trim() && onUpdateName(nameInput.trim())}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 rounded-lg text-xs cursor-pointer"
                  >
                    {tr.save}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  {tr.friendTagLabel}:{' '}
                  <span dir="ltr" className="font-mono-num text-cyan-400">
                    {profile.tag}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    {tr.level} {profile.level}
                  </span>
                  <span dir="ltr" className="font-mono-num text-amber-400">
                    {profile.xp} / {neededXp} XP
                  </span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100, (profile.xp / neededXp) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs pt-2">
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">{tr.winsLabel}</div>
                  <div className="font-mono-num font-bold text-xl text-white mt-0.5">{profile.wins}</div>
                </div>
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">{tr.totalRacesLabel}</div>
                  <div className="font-mono-num font-bold text-xl text-white mt-0.5">
                    {profile.racesPlayed}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">{tr.driftsLabel}</div>
                  <div className="font-mono-num font-bold text-xl text-white mt-0.5">
                    {profile.driftsCompleted}
                  </div>
                </div>
                <div className="bg-slate-950/70 border border-white/10 rounded-lg p-3">
                  <div className="text-slate-400">{tr.coins}</div>
                  <div className="font-mono-num font-bold text-xl text-amber-400 mt-0.5">
                    {profile.coins}
                  </div>
                </div>
              </div>
            </div>

            {/* Friends List */}
            <div className="bg-slate-900 border border-white/15 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h2 className="font-display font-bold text-lg text-white">{tr.friendsListTitle}</h2>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={friendTagInput}
                  onChange={(e) => setFriendTagInput(e.target.value)}
                  placeholder={tr.addFriendPlaceholder}
                  className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddFriend}
                  className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3.5 rounded-lg text-xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {tr.addBtn}
                </button>
              </div>
              {friendMsg && <p className="text-xs text-amber-300">{friendMsg}</p>}

              {profile.friends.length === 0 ? (
                <div className="text-xs text-slate-400 py-8 text-center">{tr.noFriendsYet}</div>
              ) : (
                <div className="space-y-2">
                  {profile.friends.map((f) => {
                    const isOnline = friendOnlineMap[f.playerId];
                    return (
                      <div
                        key={f.playerId}
                        className="flex items-center justify-between bg-slate-950/75 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{f.name}</div>
                          <div dir="ltr" className="text-[11px] text-slate-400 font-mono-num">
                            {f.tag}
                          </div>
                        </div>
                        <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                          {isOnline ? tr.onlineLabel : tr.offlineLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'challenges' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {profile.dailyChallenges.map((dc) => {
              const ready = dc.progress >= dc.target && !dc.claimed;
              const title = language === 'ar' ? dc.title : DAILY_EN[dc.id]?.title || dc.title;
              const desc =
                language === 'ar' ? dc.description : DAILY_EN[dc.id]?.description || dc.description;
              return (
                <div
                  key={dc.id}
                  className="bg-slate-900 border border-white/15 rounded-xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-semibold text-cyan-400">{tr.challengesTab}</div>
                    <h3 className="font-display font-bold text-lg text-white mt-1">{title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{desc}</p>
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-xs font-mono-num">
                        <span className="text-slate-300">{tr.level}</span>
                        <span className="text-white">
                          {Math.min(dc.progress, dc.target)}/{dc.target}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${Math.min(100, (dc.progress / dc.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => ready && onClaimDaily(dc.id)}
                    disabled={!ready}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      dc.claimed
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                        : ready
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {dc.claimed ? (
                      <>
                        <Check className="w-4 h-4" /> {tr.claimedLabel}
                      </>
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        {ready
                          ? `${tr.claimBtn} (+${dc.rewardCoins} ${tr.coins})`
                          : `${dc.rewardCoins} ${tr.coins}`}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = profile.unlockedAchievements.includes(a.id);
              const title = language === 'ar' ? a.title : ACHIEVEMENTS_EN[a.id]?.title || a.title;
              const desc =
                language === 'ar'
                  ? a.description
                  : ACHIEVEMENTS_EN[a.id]?.description || a.description;
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border ${
                    unlocked
                      ? 'bg-slate-900 border-amber-500/40'
                      : 'bg-slate-900/50 border-white/10 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Award className={`w-5 h-5 ${unlocked ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-[11px] font-mono-num text-amber-400">
                      +{a.rewardCoins} {tr.coins}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-base text-white mt-2">{title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'leaderboards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900 border border-white/15 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-bold text-lg text-white">{tr.trackRecordsTitle}</h2>
                <select
                  value={selectedBoardTrack}
                  onChange={(e) => setSelectedBoardTrack(e.target.value)}
                  className="bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  {TRACKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {getTrackLocalized(t, language).name}
                    </option>
                  ))}
                </select>
              </div>

              {boardEntries.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">{tr.noRecordsYet}</div>
              ) : (
                <div className="space-y-1.5">
                  {boardEntries.map((e, idx) => (
                    <div
                      key={`${e.playerId}_${idx}`}
                      className="flex items-center justify-between bg-slate-950/75 border border-white/10 rounded-lg px-3.5 py-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-amber-400 w-5">#{idx + 1}</span>
                        <span className="font-semibold text-white">{e.name}</span>
                        <span dir="ltr" className="text-slate-400 font-mono-num">
                          {e.tag}
                        </span>
                      </div>
                      <span dir="ltr" className="font-mono-num font-bold text-cyan-400">
                        {formatRaceTime(e.timeMs)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-white/15 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="font-display font-bold text-lg text-white">{tr.topWinsTitle}</h2>
              </div>
              {topRacers.length === 0 ? (
                <p className="text-xs text-slate-400">{tr.noRecordsYet}</p>
              ) : (
                <div className="space-y-1.5">
                  {topRacers.slice(0, 10).map((r, i) => (
                    <div
                      key={r.playerId}
                      className="flex items-center justify-between bg-slate-950/75 border border-white/10 rounded-lg px-3 py-2 text-xs"
                    >
                      <span className="text-white truncate">
                        {i + 1}. {r.name}
                      </span>
                      <span className="font-mono-num text-amber-400 font-bold">
                        {r.wins} {tr.winsLabel} · {tr.level} {r.level}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
