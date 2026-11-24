/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  collection,
  onSnapshot,
  query,
  where,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  KanjiItem,
  ParsedSprintData,
  parseSprintMarkdown,
  VocabItem,
} from './utils/sprintParser';
import {
  checkAntiBurnoutGate,
  SRS_STAGES,
  SrsStage,
  TARGET_612_REPETITIONS,
  UserItemSrsRecord,
} from './utils/srsEngine';
import { speakJapaneseText, triggerHapticFeedback } from './utils/hapticsAndTts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GrammarCheatSheetDrawer } from './components/GrammarCheatSheetDrawer';
import { QuizEngineView, QuizQueueItem } from './components/QuizEngineView';
import { KanaProView } from './components/KanaProView';
import { SpeakingBridgeView } from './components/SpeakingBridgeView';
import { RoadmapExplorerView } from './components/RoadmapExplorerView';
import { CompetencyAnalyticsView } from './components/CompetencyAnalyticsView';

export type ActivePage =
  | 'DASHBOARD'
  | 'QUIZ_SESSION'
  | 'ROADMAP'
  | 'ANALYTICS'
  | 'KANA_PRO'
  | 'SPEAKING_BRIDGE';

export interface UserSettingsState {
  daily_vocab_quota: number;
  daily_kanji_quota: number;
  daily_review_cap: number;
  always_show_romaji: boolean;
  tts_rate: number;
  current_sprint: number;
  current_day: number;
  total_repetitions: number;
  streak_days: number;
  haptics_enabled: boolean;
}

const DEFAULT_SETTINGS: UserSettingsState = {
  daily_vocab_quota: 8,
  daily_kanji_quota: 2,
  daily_review_cap: 150,
  always_show_romaji: false,
  tts_rate: 0.9,
  current_sprint: 1,
  current_day: 1,
  total_repetitions: 24,
  streak_days: 3,
  haptics_enabled: true,
};

const LOCAL_STORAGE_SRS_KEY = 'nihongo_srs_records_v1';
const LOCAL_STORAGE_SETTINGS_KEY = 'nihongo_user_settings_v1';

const NAV_ITEMS: { id: ActivePage; step: string; label: string; desc: string }[] = [
  { id: 'DASHBOARD', step: '1', label: 'Belajar Harian', desc: 'Alur 4 langkah hari ini' },
  { id: 'KANA_PRO', step: '2', label: 'Hiragana & Katakana', desc: 'Tabel huruf & tes baca' },
  { id: 'SPEAKING_BRIDGE', step: '3', label: 'Latihan Bicara', desc: 'Konjugasi & kalimat lisan' },
  { id: 'ROADMAP', step: '4', label: 'Kurikulum 26 Sprint', desc: 'Daftar materi per hari' },
  { id: 'ANALYTICS', step: '5', label: 'Evaluasi & Skor', desc: 'Progress hafalan & JLPT' },
];

function buildInitialSeedSrsMap(vocabList: VocabItem[], kanjiList: KanjiItem[]): Record<string, UserItemSrsRecord> {
  const now = new Date();
  const pastDue = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const map: Record<string, UserItemSrsRecord> = {};

  vocabList.slice(0, 8).forEach((v, idx) => {
    const isDue = idx < 4;
    const stage: SrsStage = idx < 3 ? 4 : idx < 6 ? 2 : 1;
    const wrongCount = idx === 5 ? 4 : idx === 4 ? 2 : 0;
    map[v.id] = {
      item_id: v.id,
      item_type: 'VOCAB',
      sprint: v.sprint,
      srs_stage: stage,
      next_review_at: isDue ? pastDue : futureDate,
      last_reviewed_at: pastDue,
      correct_count: stage + 1,
      wrong_count: wrongCount,
      total_reps: stage + 1 + wrongCount,
      is_leech: wrongCount >= 4,
    };
  });

  kanjiList.slice(0, 2).forEach((k, idx) => {
    map[k.id] = {
      item_id: k.id,
      item_type: 'KANJI',
      sprint: k.sprint,
      srs_stage: idx === 0 ? 4 : 2,
      next_review_at: idx === 0 ? futureDate : pastDue,
      last_reviewed_at: pastDue,
      correct_count: 3,
      wrong_count: idx === 1 ? 1 : 0,
      total_reps: 4,
      is_leech: false,
    };
  });

  return map;
}

export function NihongoAppContent() {
  const [activePage, setActivePage] = useState<ActivePage>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGrammarDrawerOpen, setIsGrammarDrawerOpen] = useState(false);
  const [showTodayMaterialList, setShowTodayMaterialList] = useState(false);

  // Batch Study Preview Modal (Batch A: 4 Vocab + 1 Kanji, Batch B: 4 Vocab + 1 Kanji)
  const [previewBatch, setPreviewBatch] = useState<{
    title: string;
    vocabItems: VocabItem[];
    kanjiItems: KanjiItem[];
  } | null>(null);

  // Loaded Sprints Data (SPRINT_01, SPRINT_02, SPRINT_03)
  const [sprintsData, setSprintsData] = useState<ParsedSprintData[]>([]);
  const [isLoadingMarkdown, setIsLoadingMarkdown] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auth & User Settings
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [settings, setSettings] = useState<UserSettingsState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  // SRS Item Records Map
  const [srsMap, setSrsMap] = useState<Record<string, UserItemSrsRecord>>({});

  // Active Quiz Session Configuration
  const [activeQuizConfig, setActiveQuizConfig] = useState<{
    title: string;
    sessionType: 'DAILY_SRS' | 'BATCH_LEARN' | 'JLPT_ASSESSMENT';
    queue: QuizQueueItem[];
  } | null>(null);

  // Recent Session Banner message
  const [lastCompletedSummary, setLastCompletedSummary] = useState<string | null>(null);

  // 1. Fetch & Parse SPRINT_01.md, SPRINT_02.md, SPRINT_03.md
  useEffect(() => {
    let isMounted = true;
    async function loadAllSprintFiles() {
      try {
        setIsLoadingMarkdown(true);
        const files = [
          { num: 1, url: '/assets/aistudio/SPRINT_01_119b197f.md' },
          { num: 2, url: '/assets/aistudio/SPRINT_02_4ec90b1f.md' },
          { num: 3, url: '/assets/aistudio/SPRINT_03_a2069d3d.md' },
        ];

        const parsedResults = await Promise.all(
          files.map(async (f) => {
            const resp = await fetch(f.url);
            if (!resp.ok) {
              throw new Error(`Gagal memuat materi Sprint ${f.num} (${resp.status})`);
            }
            const md = await resp.text();
            return parseSprintMarkdown(md, f.num);
          })
        );

        if (!isMounted) return;
        setSprintsData(parsedResults);

        const allV = parsedResults.flatMap((s) => s.vocabulary);
        const allK = parsedResults.flatMap((s) => s.kanji);

        try {
          const savedSrs = localStorage.getItem(LOCAL_STORAGE_SRS_KEY);
          if (savedSrs) {
            const parsedMap = JSON.parse(savedSrs);
            if (Object.keys(parsedMap).length > 0) {
              setSrsMap(parsedMap);
            } else {
              const seeded = buildInitialSeedSrsMap(allV, allK);
              setSrsMap(seeded);
              localStorage.setItem(LOCAL_STORAGE_SRS_KEY, JSON.stringify(seeded));
            }
          } else {
            const seeded = buildInitialSeedSrsMap(allV, allK);
            setSrsMap(seeded);
            localStorage.setItem(LOCAL_STORAGE_SRS_KEY, JSON.stringify(seeded));
          }
        } catch {
          setSrsMap(buildInitialSeedSrsMap(allV, allK));
        }

        setIsLoadingMarkdown(false);
      } catch (err) {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat kurikulum');
        setIsLoadingMarkdown(false);
      }
    }

    loadAllSprintFiles();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 3. Firestore Real-Time Sync when signed in & email verified
  useEffect(() => {
    if (!isAuthReady || !currentUser || !currentUser.emailVerified) return;

    const uid = currentUser.uid;
    const userDocPath = `users/${uid}`;
    const srsColPath = `users/${uid}/srs_items`;

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const merged: UserSettingsState = {
            daily_vocab_quota: Number(data.daily_vocab_quota ?? DEFAULT_SETTINGS.daily_vocab_quota),
            daily_kanji_quota: Number(data.daily_kanji_quota ?? DEFAULT_SETTINGS.daily_kanji_quota),
            daily_review_cap: Number(data.daily_review_cap ?? DEFAULT_SETTINGS.daily_review_cap),
            always_show_romaji: Boolean(data.always_show_romaji ?? false),
            tts_rate: Number(data.tts_rate ?? 0.9),
            current_sprint: Number(data.current_sprint ?? 1),
            current_day: Number(data.current_day ?? 1),
            total_repetitions: Number(data.total_repetitions ?? 0),
            streak_days: Number(data.streak_days ?? 1),
            haptics_enabled: Boolean(data.haptics_enabled ?? true),
          };
          setSettings(merged);
          localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(merged));
        } else {
          setDoc(doc(db, 'users', uid), {
            userId: uid,
            ...settings,
            updatedAt: serverTimestamp(),
          }).catch((e) => handleFirestoreError(e, OperationType.CREATE, userDocPath));
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, userDocPath)
    );

    const qSrs = query(collection(db, 'users', uid, 'srs_items'), where('userId', '==', uid));
    const unsubSrs = onSnapshot(
      qSrs,
      (snap) => {
        if (!snap.empty) {
          const remoteMap: Record<string, UserItemSrsRecord> = {};
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            remoteMap[d.item_id] = {
              item_id: d.item_id,
              item_type: d.item_type,
              sprint: d.sprint,
              srs_stage: d.srs_stage as SrsStage,
              next_review_at: d.next_review_at,
              last_reviewed_at: d.last_reviewed_at,
              correct_count: d.correct_count,
              wrong_count: d.wrong_count,
              total_reps: d.total_reps,
              is_leech: d.is_leech,
            };
          });
          setSrsMap((prev) => {
            const combined = { ...prev, ...remoteMap };
            localStorage.setItem(LOCAL_STORAGE_SRS_KEY, JSON.stringify(combined));
            return combined;
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, srsColPath)
    );

    return () => {
      unsubUser();
      unsubSrs();
    };
  }, [isAuthReady, currentUser]);

  const allVocab = useMemo(() => sprintsData.flatMap((s) => s.vocabulary), [sprintsData]);
  const allKanji = useMemo(() => sprintsData.flatMap((s) => s.kanji), [sprintsData]);

  // Persist Settings helper
  const updateSettings = (partial: Partial<UserSettingsState>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(next));
      if (currentUser && currentUser.emailVerified) {
        const path = `users/${currentUser.uid}`;
        setDoc(doc(db, 'users', currentUser.uid), {
          userId: currentUser.uid,
          ...next,
          updatedAt: serverTimestamp(),
        }).catch((e) => handleFirestoreError(e, OperationType.UPDATE, path));
      }
      return next;
    });
  };

  // Persist single SRS item update
  const handleUpdateItemSrs = (
    updatedRecord: UserItemSrsRecord,
    _wasFirstAttempt: boolean,
    _isCorrect: boolean
  ) => {
    setSrsMap((prev) => {
      const next = { ...prev, [updatedRecord.item_id]: updatedRecord };
      localStorage.setItem(LOCAL_STORAGE_SRS_KEY, JSON.stringify(next));
      return next;
    });

    updateSettings({
      total_repetitions: settings.total_repetitions + 1,
    });

    if (currentUser && currentUser.emailVerified) {
      const itemPath = `users/${currentUser.uid}/srs_items/${updatedRecord.item_id}`;
      setDoc(doc(db, 'users', currentUser.uid, 'srs_items', updatedRecord.item_id), {
        userId: currentUser.uid,
        ...updatedRecord,
        updatedAt: serverTimestamp(),
      }).catch((e) => handleFirestoreError(e, OperationType.WRITE, itemPath));
    }
  };

  // Compute Due SRS Items & Daily Batches
  const nowIso = new Date().toISOString();
  const dueSrsRecords = Object.values(srsMap).filter(
    (rec) => rec.srs_stage >= 1 && rec.next_review_at <= nowIso
  );

  const antiBurnout = checkAntiBurnoutGate(dueSrsRecords.length);

  // Active Day's 8 Vocab + 2 Kanji
  const activeDayVocab = allVocab.filter(
    (v) => v.sprint === settings.current_sprint && v.dayNumber === settings.current_day
  );
  const activeDayKanji = allKanji.filter(
    (k) => k.sprint === settings.current_sprint && k.dayNumber === settings.current_day
  );

  const batchAVocab = activeDayVocab.slice(0, 4);
  const batchAKanji = activeDayKanji.slice(0, 1);
  const batchBVocab = activeDayVocab.slice(4, 8);
  const batchBKanji = activeDayKanji.slice(1, 2);

  // Helper to build a QuizQueueItem from Vocab or Kanji
  const makeQueueItemFromVocab = (v: VocabItem): QuizQueueItem => {
    const existing = srsMap[v.id] || {
      item_id: v.id,
      item_type: 'VOCAB',
      sprint: v.sprint,
      srs_stage: 0 as SrsStage,
      next_review_at: new Date().toISOString(),
      last_reviewed_at: new Date().toISOString(),
      correct_count: 0,
      wrong_count: 0,
      total_reps: 0,
      is_leech: false,
    };
    return {
      id: v.id,
      itemType: 'VOCAB',
      vocab: v,
      srsRecord: existing,
      isRetryInLoop: false,
    };
  };

  const makeQueueItemFromKanji = (k: KanjiItem): QuizQueueItem => {
    const existing = srsMap[k.id] || {
      item_id: k.id,
      item_type: 'KANJI',
      sprint: k.sprint,
      srs_stage: 0 as SrsStage,
      next_review_at: new Date().toISOString(),
      last_reviewed_at: new Date().toISOString(),
      correct_count: 0,
      wrong_count: 0,
      total_reps: 0,
      is_leech: false,
    };
    return {
      id: k.id,
      itemType: 'KANJI',
      kanji: k,
      srsRecord: existing,
      isRetryInLoop: false,
    };
  };

  // Launch Stage 1: Due SRS Review
  const startDueSrsReviewSession = () => {
    triggerHapticFeedback('STEP', settings.haptics_enabled);
    const dueQueue: QuizQueueItem[] = [];

    for (const rec of dueSrsRecords.slice(0, settings.daily_review_cap)) {
      if (rec.item_type === 'VOCAB') {
        const v = allVocab.find((item) => item.id === rec.item_id);
        if (v) {
          dueQueue.push({
            id: v.id,
            itemType: 'VOCAB',
            vocab: v,
            srsRecord: rec,
            isRetryInLoop: false,
          });
        }
      } else {
        const k = allKanji.find((item) => item.id === rec.item_id);
        if (k) {
          dueQueue.push({
            id: k.id,
            itemType: 'KANJI',
            kanji: k,
            srsRecord: rec,
            isRetryInLoop: false,
          });
        }
      }
    }

    if (dueQueue.length === 0) {
      activeDayVocab.forEach((v) => dueQueue.push(makeQueueItemFromVocab(v)));
      activeDayKanji.forEach((k) => dueQueue.push(makeQueueItemFromKanji(k)));
    }

    setActiveQuizConfig({
      title: `Review Hafalan (${dueQueue.length} Kartu)`,
      sessionType: 'DAILY_SRS',
      queue: dueQueue,
    });
    setActivePage('QUIZ_SESSION');
  };

  // Launch Batch A or Batch B study preview
  const openBatchPreview = (batchLabel: 'A' | 'B') => {
    triggerHapticFeedback('LIGHT', settings.haptics_enabled);
    if (batchLabel === 'A') {
      setPreviewBatch({
        title: `Materi Baru Bagian 1 (Sprint ${settings.current_sprint} · Hari ${settings.current_day})`,
        vocabItems: batchAVocab,
        kanjiItems: batchAKanji,
      });
    } else {
      setPreviewBatch({
        title: `Materi Baru Bagian 2 (Sprint ${settings.current_sprint} · Hari ${settings.current_day})`,
        vocabItems: batchBVocab,
        kanjiItems: batchBKanji,
      });
    }
  };

  const startQuizFromBatchPreview = () => {
    if (!previewBatch) return;
    triggerHapticFeedback('STEP', settings.haptics_enabled);
    const queue: QuizQueueItem[] = [
      ...previewBatch.vocabItems.map(makeQueueItemFromVocab),
      ...previewBatch.kanjiItems.map(makeQueueItemFromKanji),
    ];
    setActiveQuizConfig({
      title: previewBatch.title,
      sessionType: 'BATCH_LEARN',
      queue,
    });
    setPreviewBatch(null);
    setActivePage('QUIZ_SESSION');
  };

  // Launch Specific Sprint & Day Drill (10 items)
  const startDayDrill = (sprint: number, day: number) => {
    const vList = allVocab.filter((v) => v.sprint === sprint && v.dayNumber === day);
    const kList = allKanji.filter((k) => k.sprint === sprint && k.dayNumber === day);
    const queue: QuizQueueItem[] = [
      ...vList.map(makeQueueItemFromVocab),
      ...kList.map(makeQueueItemFromKanji),
    ];
    setActiveQuizConfig({
      title: `Latihan Sprint ${sprint} · Hari ${day} (10 Materi)`,
      sessionType: 'BATCH_LEARN',
      queue,
    });
    setActivePage('QUIZ_SESSION');
  };

  // Launch JLPT / JFT 20-Item Competency Evaluation
  const startJlptAssessment = () => {
    const sampleVocab = allVocab.filter((_, idx) => idx % 22 === 0).slice(0, 15);
    const sampleKanji = allKanji.filter((_, idx) => idx % 16 === 0).slice(0, 5);
    const queue: QuizQueueItem[] = [
      ...sampleVocab.map(makeQueueItemFromVocab),
      ...sampleKanji.map(makeQueueItemFromKanji),
    ];
    setActiveQuizConfig({
      title: 'Simulasi Evaluasi JLPT & JFT (20 Soal)',
      sessionType: 'JLPT_ASSESSMENT',
      queue,
    });
    setActivePage('QUIZ_SESSION');
  };

  // Launch Leech Remedial Drill
  const startLeechDrill = () => {
    const leechRecords = Object.values(srsMap).filter((r) => r.is_leech || r.wrong_count > 0);
    const queue: QuizQueueItem[] = [];
    for (const r of leechRecords) {
      if (r.item_type === 'VOCAB') {
        const v = allVocab.find((i) => i.id === r.item_id);
        if (v) queue.push({ id: v.id, itemType: 'VOCAB', vocab: v, srsRecord: r, isRetryInLoop: false });
      } else {
        const k = allKanji.find((i) => i.id === r.item_id);
        if (k) queue.push({ id: k.id, itemType: 'KANJI', kanji: k, srsRecord: r, isRetryInLoop: false });
      }
    }
    if (queue.length === 0) return;
    setActiveQuizConfig({
      title: `Latihan Kata Sulit (${queue.length} Materi)`,
      sessionType: 'DAILY_SRS',
      queue,
    });
    setActivePage('QUIZ_SESSION');
  };

  // Summary metrics for Dashboard
  const totalLearnedItems = Object.values(srsMap).filter((r) => r.srs_stage >= 1).length;
  const totalMasteredItems = Object.values(srsMap).filter((r) => r.srs_stage >= 4).length;
  const leechItemsCount = Object.values(srsMap).filter((r) => r.is_leech).length;

  const sprintTopicMap: Record<number, string> = {
    1: 'Bab 1–3 Minna no Nihongo · Perkenalan, Benda & Lokasi',
    2: 'Bab 4–5 Minna no Nihongo · Waktu, Jam, Tanggal & Mobilitas',
    3: 'Bab 6–7 Minna no Nihongo · Aktivitas Makan, Objek & Memberi/Menerima',
  };

  if (isLoadingMarkdown) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full border border-neutral-200 p-6 space-y-3">
          <p className="text-xs font-mono-num text-neutral-500">MEMUAT MATERI</p>
          <h1 className="text-sm font-semibold text-neutral-950">
            Menyiapkan kosakata dan kanji...
          </h1>
          <div className="w-full h-1 bg-neutral-100 overflow-hidden">
            <div className="w-1/2 h-full bg-neutral-950" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-white text-neutral-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full border border-red-900 p-6 space-y-3">
          <h1 className="text-sm font-semibold text-neutral-950">{loadError}</h1>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-xs font-medium bg-neutral-950 text-white"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-950 flex flex-col overflow-x-hidden">
      {/* TOP BAR: Frosted Glass Element #1 */}
      <header className="sticky top-0 z-30 h-14 px-3 sm:px-6 bg-white/90 backdrop-blur-md border-b border-neutral-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('LIGHT', settings.haptics_enabled);
              setIsSidebarOpen((prev) => !prev);
            }}
            aria-label="Buka atau tutup menu navigasi"
            className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-950 transition-colors shrink-0"
          >
            Menu
          </button>

          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              triggerHapticFeedback('LIGHT', settings.haptics_enabled);
              setActivePage('DASHBOARD');
            }}
            className="text-sm sm:text-base font-bold tracking-tight text-neutral-950 whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">Nihongo</span>
            <span className="hidden sm:inline">Nihongo SRS</span>
          </a>
        </div>

        {/* Desktop Ordered Navigation (1 to 5) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                setActivePage(nav.id);
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activePage === nav.id
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
              }`}
            >
              {nav.step}. {nav.label}
            </button>
          ))}
        </nav>

        {/* Right Actions: Quick Sprint/Day Selector + Primary Review CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                setIsQuickMenuOpen((prev) => !prev);
              }}
              className="px-2 sm:px-2.5 py-1.5 text-xs font-mono-num font-medium border border-neutral-300 bg-white text-neutral-900 hover:border-neutral-950 transition-colors whitespace-nowrap"
            >
              <span className="sm:hidden">S{settings.current_sprint}·H{settings.current_day} ▾</span>
              <span className="hidden sm:inline">Sprint {settings.current_sprint} · Hari {settings.current_day} ▾</span>
            </button>

            {/* Frosted Glass Dropdown (#2 of max 2 glass elements) */}
            {isQuickMenuOpen && (
              <div className="
                fixed sm:absolute right-4 sm:right-0 left-4 sm:left-auto top-14 sm:top-full sm:mt-1.5 sm:w-72
                z-50 bg-white/95 backdrop-blur-md border border-neutral-950 p-4 space-y-4
              ">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="text-xs font-semibold text-neutral-950">
                    Pilih Sprint & Hari Belajar
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickMenuOpen(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-950"
                  >
                    Tutup
                  </button>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-medium text-neutral-500">
                    Sprint (2 Minggu / Sprint)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                          updateSettings({ current_sprint: sp, current_day: 1 });
                        }}
                        className={`py-1.5 text-xs font-medium border ${
                          settings.current_sprint === sp
                            ? 'border-neutral-950 bg-neutral-950 text-white'
                            : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'
                        }`}
                      >
                        Sprint {sp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[11px] font-medium text-neutral-500">
                    Hari Belajar (1–14)
                  </span>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                          updateSettings({ current_day: d });
                          setIsQuickMenuOpen(false);
                        }}
                        className={`py-1 text-xs font-mono-num border ${
                          settings.current_day === d
                            ? 'border-neutral-950 bg-neutral-950 text-white font-semibold'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startDueSrsReviewSession}
            className="px-3 sm:px-4 py-1.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            Review ({dueSrsRecords.length})
          </button>
        </div>
      </header>

      {/* OFF-CANVAS COLLAPSIBLE SIDEBAR DRAWER (Zero Overlap on Mobile & Desktop) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/30 flex"
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] bg-white h-full border-r border-neutral-200 flex flex-col justify-between p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-sm font-bold text-neutral-950">Menu Utama</span>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="px-2.5 py-1 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                >
                  Tutup
                </button>
              </div>

              {/* Ordered Step-by-Step Navigation */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Urutan Belajar
                </p>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                      setActivePage(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full p-2.5 text-left border transition-colors flex items-start gap-3 ${
                      activePage === item.id
                        ? 'border-neutral-950 bg-neutral-950 text-white'
                        : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                    }`}
                  >
                    <span className="text-xs font-mono-num font-bold mt-0.5">{item.step}.</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{item.label}</p>
                      <p
                        className={`text-[11px] truncate ${
                          activePage === item.id ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Quick Supporting Tools */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-200">
                <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Alat Bantu
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsGrammarDrawerOpen(true);
                  }}
                  className="w-full py-2 px-3 text-xs font-medium border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 text-left"
                >
                  Ringkasan Tata Bahasa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    startJlptAssessment();
                  }}
                  className="w-full py-2 px-3 text-xs font-medium border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 text-left"
                >
                  Simulasi Tes JLPT / JFT (20 Soal)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setIsSettingsModalOpen(true);
                  }}
                  className="w-full py-2 px-3 text-xs font-medium border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 text-left"
                >
                  Pengaturan Romaji & Audio
                </button>
              </div>
            </div>

            {/* Cloud Sync Account Footer */}
            <div className="pt-4 border-t border-neutral-200 space-y-2">
              {currentUser ? (
                <div className="p-3 border border-neutral-200 bg-neutral-50 text-xs space-y-1">
                  <p className="font-medium text-neutral-900 truncate">
                    {currentUser.displayName || currentUser.email}
                  </p>
                  <p className="text-[11px] text-emerald-900">Tersimpan di Cloud</p>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="text-[11px] text-neutral-500 underline hover:text-neutral-950"
                  >
                    Keluar Akun
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    signInWithGoogle().catch(() => {});
                  }}
                  className="w-full py-2 px-3 text-xs font-medium border border-neutral-950 bg-white text-neutral-950 hover:bg-neutral-100 text-center"
                >
                  Simpan Progress ke Google
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT (Full Width, Ultra Responsive, No Side Obstruction) */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full gpu-scroll">
        {lastCompletedSummary && (
          <div className="mb-6 p-3.5 border border-emerald-900 bg-emerald-950/[0.03] flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-emerald-950">{lastCompletedSummary}</p>
            <button
              type="button"
              onClick={() => setLastCompletedSummary(null)}
              className="text-xs text-neutral-500 hover:text-neutral-950 shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {activePage === 'QUIZ_SESSION' && activeQuizConfig && (
          <QuizEngineView
            sessionTitle={activeQuizConfig.title}
            sessionType={activeQuizConfig.sessionType}
            initialQueue={activeQuizConfig.queue}
            allVocab={allVocab}
            allKanji={allKanji}
            alwaysShowRomaji={settings.always_show_romaji}
            ttsRate={settings.tts_rate}
            hapticsEnabled={settings.haptics_enabled}
            onUpdateItemSrs={handleUpdateItemSrs}
            onOpenGrammarDrawer={() => setIsGrammarDrawerOpen(true)}
            onExit={() => setActivePage('DASHBOARD')}
            onCompleteSession={(stats) => {
              const acc =
                stats.totalQuestions > 0
                  ? Math.round((stats.correctFirstTry / stats.totalQuestions) * 100)
                  : 100;
              setLastCompletedSummary(
                `Sesi selesai: ${stats.correctFirstTry}/${stats.totalQuestions} benar (${acc}%) · +${stats.totalRepsAdded} repetisi.`
              );
              if (currentUser && currentUser.emailVerified) {
                const sid = `sess_${Date.now()}`;
                const sPath = `users/${currentUser.uid}/sessions/${sid}`;
                setDoc(doc(db, 'users', currentUser.uid, 'sessions', sid), {
                  userId: currentUser.uid,
                  session_id: sid,
                  session_type: activeQuizConfig.sessionType,
                  sprint: settings.current_sprint,
                  day: settings.current_day,
                  total_questions: stats.totalQuestions,
                  correct_answers: stats.correctFirstTry,
                  accuracy_pct: acc,
                  createdAt: serverTimestamp(),
                }).catch((e) => handleFirestoreError(e, OperationType.CREATE, sPath));
              }
              setActivePage('DASHBOARD');
            }}
          />
        )}

        {activePage === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* Clean Minimal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="text-xs font-mono-num text-neutral-500">
                  Sprint {settings.current_sprint} · Hari {settings.current_day} dari 14
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-950 mt-0.5">
                  Belajar Harian
                </h1>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {sprintTopicMap[settings.current_sprint] || 'Minna no Nihongo & Percakapan Harian'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGrammarDrawerOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition-colors"
                >
                  Tata Bahasa
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition-colors"
                >
                  Pengaturan
                </button>
                <button
                  type="button"
                  onClick={startJlptAssessment}
                  className="px-3.5 py-1.5 text-xs font-medium bg-blue-950 text-white hover:bg-blue-900 transition-colors"
                >
                  Tes JLPT / JFT
                </button>
              </div>
            </div>

            {/* Anti-Burnout Notice if review queue > 130 */}
            {antiBurnout.isNewIntakeLocked && (
              <div className="p-4 border border-red-900 bg-red-950/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-red-900">
                    Antrean Review Penuh ({dueSrsRecords.length} Kartu)
                  </p>
                  <p className="text-xs text-neutral-700 mt-0.5">
                    Selesaikan review terlebih dahulu hingga di bawah {antiBurnout.unlockThreshold} kartu sebelum menambah materi baru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startDueSrsReviewSession}
                  className="px-4 py-2 text-xs font-medium bg-red-900 text-white hover:bg-red-800 shrink-0"
                >
                  Mulai Review
                </button>
              </div>
            )}

            {/* PRIMARY FOCUS: 4 Clear Sequential Steps to Start Today */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h2 className="text-sm font-semibold text-neutral-950">
                  Mulai dari Langkah 1 sampai 4
                </h2>
                <span className="text-xs text-neutral-500">
                  Target hari ini: 8 kosakata + 2 kanji
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Step 1: Review SRS */}
                <div className="border border-neutral-950 bg-white p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono-num font-bold text-neutral-950">LANGKAH 1</span>
                      <span className="font-mono-num font-semibold text-blue-950">
                        {dueSrsRecords.length} Kartu Jatuh Tempo
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-950">
                      Review Hafalan
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Uji ulang kosakata dan kanji yang jadwal review-nya jatuh pada hari ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startDueSrsReviewSession}
                    className="w-full py-2.5 px-4 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                  >
                    Mulai Langkah 1 ({dueSrsRecords.length > 0 ? `${dueSrsRecords.length} Kartu` : 'Latih Hari Ini'})
                  </button>
                </div>

                {/* Step 2: Materi Baru Bagian 1 */}
                <div className="border border-neutral-200 bg-white p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-mono-num font-bold text-neutral-900">LANGKAH 2</span>
                      <span className="font-mono-num">4 Kosakata + 1 Kanji</span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-950">
                      Materi Baru Bagian 1
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Pelajari paruh pertama materi Hari {settings.current_day} lalu langsung uji ingatan.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={antiBurnout.isNewIntakeLocked}
                    onClick={() => openBatchPreview('A')}
                    className="w-full py-2.5 px-4 text-xs font-medium border border-neutral-950 text-neutral-950 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                  >
                    Buka Bagian 1 (5 Materi)
                  </button>
                </div>

                {/* Step 3: Materi Baru Bagian 2 */}
                <div className="border border-neutral-200 bg-white p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-mono-num font-bold text-neutral-900">LANGKAH 3</span>
                      <span className="font-mono-num">4 Kosakata + 1 Kanji</span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-950">
                      Materi Baru Bagian 2
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Pelajari paruh kedua materi Hari {settings.current_day} untuk melengkapi target harian.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={antiBurnout.isNewIntakeLocked}
                    onClick={() => openBatchPreview('B')}
                    className="w-full py-2.5 px-4 text-xs font-medium border border-neutral-950 text-neutral-950 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
                  >
                    Buka Bagian 2 (5 Materi)
                  </button>
                </div>

                {/* Step 4: Latihan Bicara */}
                <div className="border border-neutral-200 bg-white p-4 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-mono-num font-bold text-neutral-900">LANGKAH 4</span>
                      <span className="font-mono-num">8 Kalimat Lisan</span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-950">
                      Latihan Bicara & Konjugasi
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Dengarkan dan ucapkan kalimat contoh hari ini serta latih perubahan kata.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('LIGHT', settings.haptics_enabled);
                      setActivePage('SPEAKING_BRIDGE');
                    }}
                    className="w-full py-2.5 px-4 text-xs font-medium border border-neutral-950 text-neutral-950 hover:bg-neutral-100 transition-colors"
                  >
                    Buka Latihan Bicara
                  </button>
                </div>
              </div>
            </section>

            {/* Compact Progress Summary Strip (Dark Blue/Navy Accent for Analysis) */}
            <section className="border border-blue-950/20 bg-blue-950/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-xs font-semibold text-blue-950 uppercase tracking-wider">
                  Ringkasan Progress Hafalan
                </h2>
                <button
                  type="button"
                  onClick={() => setActivePage('ANALYTICS')}
                  className="text-xs font-medium text-blue-950 underline hover:text-neutral-950"
                >
                  Lihat Detail Evaluasi
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-neutral-200 p-3">
                  <p className="text-[11px] text-neutral-500">Mulai Dipelajari</p>
                  <p className="text-lg font-bold font-mono-num text-neutral-950 mt-0.5">
                    {totalLearnedItems}{' '}
                    <span className="text-xs font-normal text-neutral-400">
                      / {allVocab.length + allKanji.length}
                    </span>
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-3">
                  <p className="text-[11px] text-neutral-500">Benar-Benar Diingat</p>
                  <p className="text-lg font-bold font-mono-num text-emerald-900 mt-0.5">
                    {totalMasteredItems}{' '}
                    <span className="text-xs font-normal text-neutral-400">item</span>
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 p-3">
                  <p className="text-[11px] text-neutral-500">Kata Sulit (Sering Salah)</p>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <p className="text-lg font-bold font-mono-num text-red-900">
                      {leechItemsCount}
                    </p>
                    {leechItemsCount > 0 && (
                      <button
                        type="button"
                        onClick={startLeechDrill}
                        className="text-[11px] font-medium text-red-900 underline"
                      >
                        Latih
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 p-3">
                  <p className="text-[11px] text-neutral-500">Target 612 Repetisi</p>
                  <p className="text-lg font-bold font-mono-num text-blue-950 mt-0.5">
                    {settings.total_repetitions}{' '}
                    <span className="text-xs font-normal text-neutral-400">/ {TARGET_612_REPETITIONS}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Collapsible Today's Material List (Clean, NO Raw IDs) */}
            <section className="border border-neutral-200 bg-white">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-950">
                    Daftar Materi Hari {settings.current_day} (8 Kosakata & 2 Kanji)
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Lihat daftar kata hari ini atau langsung uji 10 materi sekaligus.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTodayMaterialList((prev) => !prev)}
                    className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                  >
                    {showTodayMaterialList ? 'Sembunyikan Daftar' : 'Lihat Daftar (10)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startDayDrill(settings.current_sprint, settings.current_day)}
                    className="px-3.5 py-1.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800"
                  >
                    Uji 10 Materi Ini
                  </button>
                </div>
              </div>

              {showTodayMaterialList && (
                <div className="border-t border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                        <th className="py-2.5 px-4 font-semibold">Kata / Kanji</th>
                        <th className="py-2.5 px-4 font-semibold">Cara Baca</th>
                        <th className="py-2.5 px-4 font-semibold">Arti Indonesia</th>
                        <th className="py-2.5 px-4 font-semibold">Contoh Kalimat</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {activeDayVocab.map((v) => {
                        const rec = srsMap[v.id];
                        const stg = rec ? rec.srs_stage : 0;
                        return (
                          <tr key={v.id} className="hover:bg-neutral-50">
                            <td className="py-2.5 px-4 font-bold font-jp text-sm text-neutral-950">
                              <button
                                type="button"
                                onClick={() => speakJapaneseText(v.kana, settings.tts_rate)}
                                className="hover:underline text-left"
                              >
                                {v.kanji !== '-' ? v.kanji : v.kana}
                              </button>
                            </td>
                            <td className="py-2.5 px-4 font-jp text-neutral-700">
                              {v.kana}
                              {settings.always_show_romaji && (
                                <span className="block text-[11px] font-mono-num text-neutral-400">
                                  {v.romaji}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-neutral-900">{v.artiFull}</td>
                            <td className="py-2.5 px-4 font-jp text-neutral-600">
                              {v.contohJpClean}{' '}
                              <span className="text-neutral-400 font-sans">({v.contohId})</span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 border text-[11px] ${
                                  stg >= 4
                                    ? 'border-emerald-900 text-emerald-900'
                                    : stg >= 1
                                      ? 'border-blue-950 text-blue-950'
                                      : 'border-neutral-300 text-neutral-500'
                                }`}
                              >
                                {SRS_STAGES[stg as SrsStage].labelId}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {activeDayKanji.map((k) => {
                        const rec = srsMap[k.id];
                        const stg = rec ? rec.srs_stage : 0;
                        return (
                          <tr key={k.id} className="bg-neutral-50/40 hover:bg-neutral-100/60">
                            <td className="py-2.5 px-4 font-bold font-jp text-base text-neutral-950">
                              {k.kanji}
                            </td>
                            <td className="py-2.5 px-4 font-jp text-neutral-700">
                              {k.onyomi} / {k.kunyomi}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-neutral-900">
                              {k.artiFull} (Kanji)
                            </td>
                            <td className="py-2.5 px-4 font-jp text-neutral-600">
                              {k.contohKataRaw}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono-num whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 border text-[11px] ${
                                  stg >= 4
                                    ? 'border-emerald-900 text-emerald-900'
                                    : stg >= 1
                                      ? 'border-blue-950 text-blue-950'
                                      : 'border-neutral-300 text-neutral-500'
                                }`}
                              >
                                {SRS_STAGES[stg as SrsStage].labelId}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {activePage === 'ROADMAP' && (
          <RoadmapExplorerView
            allVocab={allVocab}
            allKanji={allKanji}
            srsMap={srsMap}
            currentSprint={settings.current_sprint}
            currentDay={settings.current_day}
            ttsRate={settings.tts_rate}
            hapticsEnabled={settings.haptics_enabled}
            onSelectSprintAndDay={(sp: number, d: number) => {
              updateSettings({ current_sprint: sp, current_day: d });
            }}
            onStartDayDrill={(sp: number, d: number) => startDayDrill(sp, d)}
          />
        )}

        {activePage === 'ANALYTICS' && (
          <CompetencyAnalyticsView
            allVocab={allVocab}
            allKanji={allKanji}
            srsMap={srsMap}
            totalRepetitions={settings.total_repetitions}
            ttsRate={settings.tts_rate}
            hapticsEnabled={settings.haptics_enabled}
            onStartLeechDrill={startLeechDrill}
            onStartJlptAssessment={startJlptAssessment}
          />
        )}

        {activePage === 'KANA_PRO' && (
          <KanaProView
            ttsRate={settings.tts_rate}
            hapticsEnabled={settings.haptics_enabled}
            onRecordKanaRep={() => {
              updateSettings({ total_repetitions: settings.total_repetitions + 1 });
            }}
          />
        )}

        {activePage === 'SPEAKING_BRIDGE' && (
          <SpeakingBridgeView
            allVocab={allVocab}
            srsMap={srsMap}
            currentSprint={settings.current_sprint}
            currentDay={settings.current_day}
            ttsRate={settings.tts_rate}
            hapticsEnabled={settings.haptics_enabled}
            onCompleteSpeakingDrill={(count: number) => {
              updateSettings({ total_repetitions: settings.total_repetitions + count });
            }}
            onOpenGrammarDrawer={() => setIsGrammarDrawerOpen(true)}
          />
        )}
      </main>

      {/* BATCH PREVIEW MODAL (Clean, NO Raw IDs) */}
      {previewBatch && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-neutral-950 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-950">{previewBatch.title}</h2>
                <p className="text-xs text-neutral-500">
                  Pahami 4 kosakata dan 1 kanji berikut sebelum memulai kuis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                className="px-3 py-1 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 gpu-scroll">
              {previewBatch.vocabItems.map((v) => (
                <div key={v.id} className="p-3.5 border border-neutral-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-lg font-bold font-jp text-neutral-950">
                        {v.kanji !== '-' ? v.kanji : v.kana}
                      </span>{' '}
                      <span className="text-sm font-jp text-neutral-600">({v.kana})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakJapaneseText(v.kana, settings.tts_rate)}
                      className="px-2.5 py-1 text-xs border border-neutral-300 hover:bg-neutral-100"
                    >
                      Suara
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-neutral-900">{v.artiFull}</p>
                  <p className="text-xs font-jp text-neutral-600">
                    {v.contohJpClean} —{' '}
                    <span className="font-sans text-neutral-500">{v.contohId}</span>
                  </p>
                </div>
              ))}

              {previewBatch.kanjiItems.map((k) => (
                <div key={k.id} className="p-3.5 border border-neutral-950 bg-neutral-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-950">Kanji Harian</span>
                    <span className="text-xs font-jp text-neutral-600">
                      Onyomi: {k.onyomi} · Kunyomi: {k.kunyomi}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold font-jp text-neutral-950">
                      {k.kanji}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">{k.artiFull}</span>
                  </div>
                  <p className="text-xs font-jp text-neutral-700">
                    Contoh: {k.contohKataRaw}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                className="px-4 py-2 text-xs font-medium border border-neutral-300 bg-white text-neutral-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={startQuizFromBatchPreview}
                className="px-5 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800"
              >
                Mulai Kuis (5 Materi)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-neutral-950/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-neutral-950 max-w-md w-full p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h2 className="text-base font-bold text-neutral-950">
                Pengaturan Belajar
              </h2>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-xs text-neutral-500 hover:text-neutral-950"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">Tampilkan Romaji</p>
                  <p className="text-neutral-500">
                    Matikan jika sudah lancar membaca Hiragana & Katakana.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.always_show_romaji}
                  onChange={(e) => updateSettings({ always_show_romaji: e.target.checked })}
                  className="h-4 w-4 accent-neutral-950"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-900">Getaran Haptic Feedback</p>
                  <p className="text-neutral-500">
                    Respon getar halus saat memilih jawaban.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.haptics_enabled}
                  onChange={(e) => updateSettings({ haptics_enabled: e.target.checked })}
                  className="h-4 w-4 accent-neutral-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 mb-1">
                  Kecepatan Suara Bahasa Jepang: {settings.tts_rate}x
                </label>
                <input
                  type="range"
                  min={0.6}
                  max={1.1}
                  step={0.1}
                  value={settings.tts_rate}
                  onChange={(e) => updateSettings({ tts_rate: Number(e.target.value) })}
                  className="w-full accent-neutral-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-900 mb-1">
                  Batas Maksimal Review Harian: {settings.daily_review_cap} Kartu
                </label>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={25}
                  value={settings.daily_review_cap}
                  onChange={(e) => updateSettings({ daily_review_cap: Number(e.target.value) })}
                  className="w-full accent-neutral-950"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-5 py-2 text-xs font-medium bg-neutral-950 text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRAMMAR CHEAT SHEET SLIDE-OVER DRAWER */}
      <GrammarCheatSheetDrawer
        isOpen={isGrammarDrawerOpen}
        onClose={() => setIsGrammarDrawerOpen(false)}
        ttsRate={settings.tts_rate}
        hapticsEnabled={settings.haptics_enabled}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <NihongoAppContent />
    </ErrorBoundary>
  );
}
