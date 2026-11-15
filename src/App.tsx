import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/SoundEngine';
import { GarageModal, GarageTab } from './components/GarageModal';
import { MainMenu, MenuScreen } from './components/MainMenu';
import { MobileControls } from './components/MobileControls';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { ProfileAndLeaderboards } from './components/ProfileAndLeaderboards';
import { RaceHUD } from './components/RaceHUD';
import { RaceResults } from './components/RaceResults';
import { RaceSetupModal } from './components/RaceSetupModal';
import { SettingsAndTutorial } from './components/SettingsAndTutorial';
import { TrackSelect } from './components/TrackSelect';
import { ACHIEVEMENTS, CupDef } from './data/progression';
import { getTrackById, TRACKS } from './data/tracks';
import { InputState, RaceEngine } from './engine/RaceEngine';
import { getTrackLocalized, TRANSLATIONS } from './i18n/translations';
import { multiplayerClient, WsConnectionStatus } from './net/MultiplayerClient';
import {
  GameMode,
  GameSettings,
  KartLoadout,
  PlayerProfile,
  RaceTelemetryFrame,
  RoomState,
} from './types/game';
import {
  loadLocalProfile,
  loadLocalSettings,
  saveLocalProfile,
  saveLocalSettings,
  syncProfileToServer,
  xpForNextLevel,
} from './utils/profileStorage';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RaceEngine | null>(null);

  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(() => loadLocalProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadLocalSettings());

  const [viewMode, setViewMode] = useState<'menu' | 'racing' | 'results'>('menu');
  const [menuScreen, setMenuScreen] = useState<MenuScreen>('home');
  const [privateLobbyFlag, setPrivateLobbyFlag] = useState(false);
  const [garageInitialTab, setGarageInitialTab] = useState<GarageTab>('chassis');
  const [returnToLobbyAfterGarage, setReturnToLobbyAfterGarage] = useState(false);
  const [returnToPlayHubAfterTracks, setReturnToPlayHubAfterTracks] = useState(false);

  const [selectedTrackId, setSelectedTrackId] = useState('coco_bay');
  const [racerCount, setRacerCount] = useState<number>(8);
  const [activeRaceMode, setActiveRaceMode] = useState<GameMode>('single');
  const [activeTrackId, setActiveTrackId] = useState('coco_bay');

  const [raceFrame, setRaceFrame] = useState<RaceTelemetryFrame | null>(null);
  const [minimapPts, setMinimapPts] = useState<{ x: number; z: number }[]>([]);
  const [paused, setPaused] = useState(false);
  const [showRaceHelp, setShowRaceHelp] = useState(false);
  const [lastRewards, setLastRewards] = useState({ coins: 0, xp: 0 });

  // Championship & Tournament State
  const [championshipState, setChampionshipState] = useState<{
    cup: CupDef;
    roundIdx: number;
    points: number;
  } | null>(null);
  const [tournamentState, setTournamentState] = useState<{
    trackIds: string[];
    roundIdx: number;
  } | null>(null);

  // Multiplayer State
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [mpError, setMpError] = useState<string | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeRaceModeRef = useRef(activeRaceMode);
  activeRaceModeRef.current = activeRaceMode;
  const activeTrackIdRef = useRef(activeTrackId);
  activeTrackIdRef.current = activeTrackId;
  const racerCountRef = useRef(racerCount);
  racerCountRef.current = racerCount;
  const championshipRef = useRef(championshipState);
  championshipRef.current = championshipState;

  const tr = TRANSLATIONS[settings.language];

  // Sync HTML lang, title & RTL/LTR direction dynamically
  useEffect(() => {
    document.documentElement.lang = settings.language;
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.title = TRANSLATIONS[settings.language].gameTitle;
  }, [settings.language]);

  const commitProfile = useCallback((updater: (prev: PlayerProfile) => PlayerProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      saveLocalProfile(next);
      syncProfileToServer(next).catch(() => {});
      return next;
    });
  }, []);

  const awardAchievement = useCallback(
    (p: PlayerProfile, achievementId: string): PlayerProfile => {
      if (p.unlockedAchievements.includes(achievementId)) return p;
      const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (!def) return p;
      return {
        ...p,
        coins: p.coins + def.rewardCoins,
        xp: p.xp + def.rewardXp,
        unlockedAchievements: [...p.unlockedAchievements, achievementId],
      };
    },
    []
  );

  const handleRaceComplete = useCallback(
    (finalFrame: RaceTelemetryFrame) => {
      const p1 = finalFrame.player1;
      const mode = activeRaceModeRef.current;
      const trackId = activeTrackIdRef.current;

      const posBonus = Math.max(80, (9 - p1.position) * 65);
      const coinBonus = p1.coinsCollected * 10;
      const earnedCoins = posBonus + coinBonus;
      const earnedXp = Math.max(75, (9 - p1.position) * 50 + p1.coinsCollected * 5);

      setLastRewards({ coins: earnedCoins, xp: earnedXp });

      commitProfile((prev) => {
        let next: PlayerProfile = {
          ...prev,
          coins: prev.coins + earnedCoins,
          xp: prev.xp + earnedXp,
          racesPlayed: prev.racesPlayed + 1,
          wins: prev.wins + (p1.position === 1 ? 1 : 0),
          driftsCompleted: prev.driftsCompleted + 3,
          powerUpsUsed: prev.powerUpsUsed + 2,
        };

        while (next.xp >= xpForNextLevel(next.level)) {
          next.xp -= xpForNextLevel(next.level);
          next.level += 1;
        }

        if (p1.finishTimeMs > 0) {
          const prevBest = next.bestTrackTimes[trackId];
          if (!prevBest || p1.finishTimeMs < prevBest) {
            next.bestTrackTimes = { ...next.bestTrackTimes, [trackId]: p1.finishTimeMs };
          }
          fetch('/api/leaderboards/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: next.playerId,
              name: next.name,
              tag: next.tag,
              characterId: next.loadout.characterId,
              kartId: next.loadout.kartId,
              trackId,
              timeMs: p1.finishTimeMs,
              updatedAt: Date.now(),
            }),
          }).catch(() => {});
        }

        next.dailyChallenges = next.dailyChallenges.map((dc) => {
          if (dc.metric === 'races') return { ...dc, progress: dc.progress + 1 };
          if (dc.metric === 'wins' && p1.position === 1) return { ...dc, progress: dc.progress + 1 };
          if (dc.metric === 'drifts') return { ...dc, progress: dc.progress + 3 };
          return dc;
        });

        next = awardAchievement(next, 'first_race');
        if (p1.position === 1) next = awardAchievement(next, 'first_win');
        if (mode === 'time_trial') next = awardAchievement(next, 'time_breaker');
        if (mode === 'local_split') next = awardAchievement(next, 'split_screen');
        if (mode === 'online_public' || mode === 'online_private') {
          next = awardAchievement(next, 'online_racer');
        }
        if (next.wins >= 5) next = awardAchievement(next, 'speed_demon');
        if (next.racesPlayed >= 10) next = awardAchievement(next, 'veteran_10');

        const ch = championshipRef.current;
        if (ch && ch.roundIdx + 1 >= ch.cup.trackIds.length) {
          const ptsEarned = Math.max(1, 10 - p1.position);
          if (ch.points + ptsEarned >= 24) {
            next.coins += ch.cup.rewardCoins;
            next = awardAchievement(next, 'champ_winner');
          }
        }

        return next;
      });

      if (championshipRef.current) {
        const pts = Math.max(1, 10 - p1.position);
        setChampionshipState((prev) => (prev ? { ...prev, points: prev.points + pts } : null));
      }

      setViewMode('results');
    },
    [awardAchievement, commitProfile]
  );

  // Initialize Three.js Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initialSettings = settingsRef.current;
    const engine = new RaceEngine(mount, initialSettings);
    engineRef.current = engine;

    engine.setCallbacks({
      onTelemetry: (frame) => setRaceFrame(frame),
      onRaceComplete: handleRaceComplete,
      onPowerUpNetworkEmit: (type, x, y, z, heading, trackT) => {
        if (
          activeRaceModeRef.current === 'online_public' ||
          activeRaceModeRef.current === 'online_private'
        ) {
          multiplayerClient.send('race:powerup', { type, x, y, z, heading, trackT });
        }
      },
      onCrashNetworkEmit: () => {
        if (
          activeRaceModeRef.current === 'online_public' ||
          activeRaceModeRef.current === 'online_private'
        ) {
          multiplayerClient.send('race:crash', {});
        }
      },
    });

    soundEngine.updateSettings(initialSettings);
    setReady(true);

    const unlock = () => {
      soundEngine.unlock();
      soundEngine.setMusicMode('menu');
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleRaceComplete]);

  // WebSocket Multiplayer Client Setup & URL Invite Handling
  useEffect(() => {
    const p = profileRef.current;
    syncProfileToServer(p).catch(() => {});

    multiplayerClient.setCallbacks({
      onStatus: setWsStatus,
      onRoomState: (nextRoom) => setRoom(nextRoom),
      onRoomError: (msg) => setMpError(msg),
      onKicked: (reason) => {
        setRoom(null);
        setMpError(
          settingsRef.current.language === 'ar'
            ? 'تم استبعادك من الغرفة الخاصة بواسطة المضيف.'
            : reason || 'You were removed from the room by the host.'
        );
        setViewMode('menu');
        setMenuScreen('multiplayer');
        soundEngine.setMusicMode('menu');
        engineRef.current?.enterMenuShowcase(profileRef.current.loadout);
      },
      onRaceStart: (startedRoom) => {
        const engine = engineRef.current;
        if (!engine) return;
        const mode: GameMode = startedRoom.isPublic ? 'online_public' : 'online_private';
        setActiveRaceMode(mode);
        setActiveTrackId(startedRoom.trackId);
        setPaused(false);
        setShowRaceHelp(false);
        setViewMode('racing');
        setMenuScreen('home');
        setReturnToLobbyAfterGarage(false);
        engine.startRace({
          mode,
          trackId: startedRoom.trackId,
          playerId: profileRef.current.playerId,
          playerName: profileRef.current.name,
          loadout: profileRef.current.loadout,
          roomPlayers: startedRoom.players,
          fillWithAi: startedRoom.fillWithAi,
          racerCount: startedRoom.maxPlayers,
          laps: startedRoom.laps,
          difficulty: settingsRef.current.difficulty,
          timeOfDay: startedRoom.timeOfDay,
          weather: startedRoom.weather,
        });
        setMinimapPts(engine.getTrackSplineMinimap());
      },
      onRemoteStates: (states) => {
        const engine = engineRef.current;
        if (!engine) return;
        for (const s of states) {
          if (s.playerId !== profileRef.current.playerId) {
            engine.applyRemoteKartState(s);
          }
        }
      },
      onRemotePowerUp: (data) => {
        engineRef.current?.applyRemotePowerUp(
          data.ownerId,
          data.type,
          data.x,
          data.y,
          data.z,
          data.heading,
          data.trackT
        );
      },
      onRemoteCrash: (playerId) => {
        if (playerId !== profileRef.current.playerId) {
          engineRef.current?.applyRemoteCrash(playerId);
        }
      },
    });

    multiplayerClient.connect({
      playerId: p.playerId,
      name: p.name,
      tag: p.tag,
      loadout: p.loadout,
    });

    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('room');
    if (inviteCode) {
      setMenuScreen('multiplayer');
      setPrivateLobbyFlag(true);
      multiplayerClient.send('room:join', {
        code: inviteCode.toUpperCase(),
        loadout: p.loadout,
      });
    }

    return () => {
      multiplayerClient.disconnect();
    };
  }, []);

  // Broadcast local car telemetry at 20Hz during online races
  useEffect(() => {
    if (viewMode !== 'racing') return;
    if (activeRaceMode !== 'online_public' && activeRaceMode !== 'online_private') return;

    const timer = window.setInterval(() => {
      if (!engineRef.current || paused) return;
      const netState = engineRef.current.getLocalPlayerNetState();
      if (netState) {
        multiplayerClient.send('race:state', netState);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [viewMode, activeRaceMode, paused]);

  // Esc key toggles Pause during race
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && viewMode === 'racing') {
        setPaused((prev) => {
          const next = !prev;
          engineRef.current?.setPaused(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode]);

  const launchOfflineRace = useCallback(
    (mode: GameMode, trackId: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      soundEngine.unlock();
      setActiveRaceMode(mode);
      setActiveTrackId(trackId);
      setPaused(false);
      setShowRaceHelp(false);
      setViewMode('racing');
      setMenuScreen('home');

      const p2Loadout: KartLoadout | undefined =
        mode === 'local_split'
          ? {
              ...profile.loadout,
              characterId: profile.loadout.characterId === 'drift_yuki' ? 'blaze_vex' : 'drift_yuki',
              paintColor: '#06B6D4',
            }
          : undefined;

      engine.startRace({
        mode,
        trackId,
        playerId: profile.playerId,
        playerName: profile.name,
        loadout: profile.loadout,
        p2Loadout,
        racerCount: racerCountRef.current,
        difficulty: settingsRef.current.difficulty,
        timeOfDay: settingsRef.current.timeOfDay,
        weather: settingsRef.current.weather,
      });
      setMinimapPts(engine.getTrackSplineMinimap());
    },
    [profile]
  );

  const handleQuickPlay = (mode: GameMode) => {
    soundEngine.playMenuClick();
    if (mode === 'tournament') {
      const tTracks = [TRACKS[0].id, TRACKS[3].id, TRACKS[5].id];
      setTournamentState({ trackIds: tTracks, roundIdx: 0 });
      setChampionshipState(null);
      launchOfflineRace('tournament', tTracks[0]);
      return;
    }
    setChampionshipState(null);
    setTournamentState(null);
    launchOfflineRace(mode, selectedTrackId);
  };

  const handleStartChampionship = (cup: CupDef) => {
    soundEngine.playMenuClick();
    setTournamentState(null);
    setChampionshipState({ cup, roundIdx: 0, points: 0 });
    launchOfflineRace('championship', cup.trackIds[0]);
  };

  const handleNextMultiRound = () => {
    if (championshipState) {
      const nextIdx = championshipState.roundIdx + 1;
      if (nextIdx < championshipState.cup.trackIds.length) {
        setChampionshipState({ ...championshipState, roundIdx: nextIdx });
        launchOfflineRace('championship', championshipState.cup.trackIds[nextIdx]);
      }
    } else if (tournamentState) {
      const nextIdx = tournamentState.roundIdx + 1;
      if (nextIdx < tournamentState.trackIds.length) {
        setTournamentState({ ...tournamentState, roundIdx: nextIdx });
        launchOfflineRace('tournament', tournamentState.trackIds[nextIdx]);
      }
    }
  };

  const handleReturnToMenu = () => {
    soundEngine.playMenuClick();
    setViewMode('menu');
    setMenuScreen('home');
    setPaused(false);
    setReturnToLobbyAfterGarage(false);
    setReturnToPlayHubAfterTracks(false);
    setChampionshipState(null);
    setTournamentState(null);
    soundEngine.setMusicMode('menu');
    engineRef.current?.enterMenuShowcase(profile.loadout);
  };

  const handleNavigateMenu = (screen: MenuScreen) => {
    soundEngine.playMenuClick();
    setPrivateLobbyFlag(false);
    setGarageInitialTab('chassis');
    setReturnToLobbyAfterGarage(false);
    setReturnToPlayHubAfterTracks(false);
    setMenuScreen(screen);
    if (screen === 'garage') {
      engineRef.current?.enterGarage(profile.loadout);
    }
  };

  const handleCloseSubscreen = () => {
    soundEngine.playMenuClick();
    if (menuScreen === 'garage') {
      engineRef.current?.enterMenuShowcase(profile.loadout);
      if (returnToLobbyAfterGarage && room) {
        setReturnToLobbyAfterGarage(false);
        setMenuScreen('multiplayer');
        return;
      }
    }
    if (menuScreen === 'tracks' && returnToPlayHubAfterTracks) {
      setReturnToPlayHubAfterTracks(false);
      setMenuScreen('play_hub');
      return;
    }
    setReturnToLobbyAfterGarage(false);
    setReturnToPlayHubAfterTracks(false);
    setMenuScreen('home');
  };

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    saveLocalSettings(next);
    soundEngine.updateSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const handleToggleMute = () => {
    handleUpdateSettings({ ...settings, muted: !settings.muted });
  };

  const handleToggleLanguage = () => {
    soundEngine.playMenuClick();
    handleUpdateSettings({
      ...settings,
      language: settings.language === 'ar' ? 'en' : 'ar',
    });
  };

  const handleUpdateLoadout = (nextLoadout: KartLoadout) => {
    commitProfile((prev) => {
      const updated = awardAchievement({ ...prev, loadout: nextLoadout }, 'garage_tuner');
      return updated;
    });
    engineRef.current?.updateGarageLoadout(nextLoadout);
    if (room) {
      multiplayerClient.send('room:update_loadout', { loadout: nextLoadout });
    }
  };

  const handleTouchInput = useCallback((partial: Partial<InputState>) => {
    engineRef.current?.setTouchInput(partial);
  }, []);

  const activeTrackName = getTrackLocalized(getTrackById(activeTrackId), settings.language).name;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080B14]">
      {/* Isolated 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full z-0" />

      {/* Initial Loading Overlay */}
      {!ready && (
        <div className="fixed inset-0 z-50 bg-[#080B14] flex flex-col items-center justify-center gap-3">
          <div className="font-display font-bold text-3xl text-amber-400">{tr.loadingTitle}</div>
          <p className="text-xs text-slate-400">{tr.loadingSub}</p>
        </div>
      )}

      {/* Main Menu & Modal Subscreens */}
      {ready && viewMode === 'menu' && menuScreen === 'home' && (
        <MainMenu
          profile={profile}
          language={settings.language}
          selectedTrackId={selectedTrackId}
          racerCount={racerCount}
          muted={settings.muted}
          onToggleMute={handleToggleMute}
          onToggleLanguage={handleToggleLanguage}
          onNavigate={handleNavigateMenu}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'play_hub' && (
        <RaceSetupModal
          language={settings.language}
          selectedTrackId={selectedTrackId}
          racerCount={racerCount}
          settings={settings}
          onChangeRacerCount={(count) => setRacerCount(Math.max(1, Math.min(8, count)))}
          onUpdateEnvironment={(timeOfDay, weather) =>
            handleUpdateSettings({ ...settings, timeOfDay, weather })
          }
          onOpenTracks={() => {
            soundEngine.playMenuClick();
            setReturnToPlayHubAfterTracks(true);
            setMenuScreen('tracks');
          }}
          onLaunchMode={handleQuickPlay}
          onLaunchChampionship={handleStartChampionship}
          onClose={handleCloseSubscreen}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'garage' && (
        <GarageModal
          profile={profile}
          language={settings.language}
          initialTab={garageInitialTab}
          onUpdateLoadout={handleUpdateLoadout}
          onUnlockKart={(kartId, cost) => {
            commitProfile((prev) => {
              if (prev.coins < cost || prev.unlockedKarts.includes(kartId)) return prev;
              let next = {
                ...prev,
                coins: prev.coins - cost,
                unlockedKarts: [...prev.unlockedKarts, kartId],
              };
              if (next.unlockedCharacters.length + next.unlockedKarts.length >= 10) {
                next = awardAchievement(next, 'collector_10');
              }
              return next;
            });
          }}
          onUnlockPart={(partId, cost) => {
            commitProfile((prev) => {
              if (prev.coins < cost || prev.unlockedParts.includes(partId)) return prev;
              return {
                ...prev,
                coins: prev.coins - cost,
                unlockedParts: [...prev.unlockedParts, partId],
              };
            });
          }}
          onUnlockCharacter={(characterId, cost) => {
            commitProfile((prev) => {
              if (prev.coins < cost || prev.unlockedCharacters.includes(characterId)) return prev;
              let next = {
                ...prev,
                coins: prev.coins - cost,
                unlockedCharacters: [...prev.unlockedCharacters, characterId],
              };
              if (next.unlockedCharacters.length + next.unlockedKarts.length >= 10) {
                next = awardAchievement(next, 'collector_10');
              }
              return next;
            });
          }}
          onClose={handleCloseSubscreen}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'tracks' && (
        <TrackSelect
          initialMode="tracks"
          language={settings.language}
          profile={profile}
          selectedTrackId={selectedTrackId}
          racerCount={racerCount}
          onChangeRacerCount={(count) => setRacerCount(Math.max(2, Math.min(8, count)))}
          onSelectTrack={setSelectedTrackId}
          onUnlockTrack={(trackId, cost) => {
            commitProfile((prev) => {
              if (prev.coins < cost || prev.unlockedTracks.includes(trackId)) return prev;
              return {
                ...prev,
                coins: prev.coins - cost,
                unlockedTracks: [...prev.unlockedTracks, trackId],
              };
            });
          }}
          onStartRaceWithTrack={(tid) => {
            setSelectedTrackId(tid);
            setReturnToPlayHubAfterTracks(false);
            launchOfflineRace('single', tid);
          }}
          onStartChampionship={handleStartChampionship}
          onClose={handleCloseSubscreen}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'multiplayer' && (
        <MultiplayerLobby
          profile={profile}
          language={settings.language}
          initialPrivateMode={privateLobbyFlag}
          wsStatus={wsStatus}
          room={room}
          errorMsg={mpError}
          selectedTrackId={selectedTrackId}
          onClearError={() => setMpError(null)}
          onOpenGarage={() => {
            soundEngine.playMenuClick();
            setGarageInitialTab('chassis');
            setReturnToLobbyAfterGarage(Boolean(room));
            setMenuScreen('garage');
            engineRef.current?.enterGarage(profile.loadout);
          }}
          onClose={handleCloseSubscreen}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'profile' && (
        <ProfileAndLeaderboards
          initialTab="profile"
          language={settings.language}
          profile={profile}
          onUpdateName={(name) => {
            commitProfile((prev) => ({ ...prev, name }));
            multiplayerClient.connect({
              playerId: profile.playerId,
              name,
              tag: profile.tag,
              loadout: profile.loadout,
            });
          }}
          onClaimDaily={(challengeId) => {
            commitProfile((prev) => {
              const target = prev.dailyChallenges.find((d) => d.id === challengeId);
              if (!target || target.claimed || target.progress < target.target) return prev;
              return {
                ...prev,
                coins: prev.coins + target.rewardCoins,
                xp: prev.xp + target.rewardXp,
                dailyChallenges: prev.dailyChallenges.map((d) =>
                  d.id === challengeId ? { ...d, claimed: true } : d
                ),
              };
            });
          }}
          onAddFriend={(friend) => {
            commitProfile((prev) => {
              if (prev.friends.some((f) => f.playerId === friend.playerId)) return prev;
              return { ...prev, friends: [...prev.friends, friend] };
            });
          }}
          onClose={handleCloseSubscreen}
        />
      )}

      {ready && viewMode === 'menu' && menuScreen === 'settings' && (
        <SettingsAndTutorial
          initialTab="settings"
          language={settings.language}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={handleCloseSubscreen}
        />
      )}

      {/* Active Race HUD & Mobile Controls */}
      {ready && viewMode === 'racing' && raceFrame && (
        <>
          <RaceHUD
            frame={raceFrame}
            language={settings.language}
            mode={activeRaceMode}
            trackName={activeTrackName}
            minimapPoints={minimapPts}
            showMinimap={settings.showMinimap}
            muted={settings.muted}
            paused={paused}
            showHelp={showRaceHelp}
            onUseItemClick={() => engineRef.current?.triggerLocalUseItem()}
            onRecoverTrack={() => engineRef.current?.triggerLocalRecover()}
            onTogglePause={() => {
              setPaused((prev) => {
                const next = !prev;
                engineRef.current?.setPaused(next);
                return next;
              });
            }}
            onToggleMute={handleToggleMute}
            onToggleHelp={() => setShowRaceHelp((v) => !v)}
            onRestart={() => launchOfflineRace(activeRaceMode, activeTrackId)}
            onQuitToMenu={() => {
              if (activeRaceMode === 'online_public' || activeRaceMode === 'online_private') {
                multiplayerClient.send('room:leave');
              }
              handleReturnToMenu();
            }}
          />

          <MobileControls
            config={settings.mobile}
            language={settings.language}
            hasItem={Boolean(raceFrame.player1.powerUp)}
            onInput={handleTouchInput}
          />
        </>
      )}

      {/* Post-Race Results Podium */}
      {ready && viewMode === 'results' && raceFrame && (
        <RaceResults
          frame={raceFrame}
          language={settings.language}
          mode={activeRaceMode}
          trackName={activeTrackName}
          profile={profile}
          earnedCoins={lastRewards.coins}
          earnedXp={lastRewards.xp}
          championshipRound={
            championshipState
              ? {
                  round: championshipState.roundIdx + 1,
                  total: championshipState.cup.trackIds.length,
                  points: championshipState.points,
                  cupName:
                    settings.language === 'ar'
                      ? championshipState.cup.nameAr
                      : championshipState.cup.name,
                }
              : undefined
          }
          tournamentRound={
            tournamentState
              ? {
                  round: tournamentState.roundIdx + 1,
                  total: tournamentState.trackIds.length,
                }
              : undefined
          }
          onNextRound={handleNextMultiRound}
          onRematch={() => launchOfflineRace(activeRaceMode, activeTrackId)}
          onReturnLobby={() => {
            setViewMode('menu');
            setMenuScreen('multiplayer');
            soundEngine.setMusicMode('menu');
            engineRef.current?.enterMenuShowcase(profile.loadout);
            if (room && room.hostId === profile.playerId) {
              multiplayerClient.send('room:return_lobby');
            }
          }}
          onMainMenu={() => {
            if (activeRaceMode === 'online_public' || activeRaceMode === 'online_private') {
              multiplayerClient.send('room:leave');
            }
            handleReturnToMenu();
          }}
        />
      )}
    </div>
  );
}
