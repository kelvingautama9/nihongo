/**
 * 8-Stage Dynamic SRS Engine, Smart Grader, Romaji Scaffolding & Quiz Generator
 * Based on 00_MASTER_LOGIC_SRS.md
 */

import { KanjiItem, VocabItem, stripContextParens } from './sprintParser';

export type SrsStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface SrsStageMetadata {
  stage: SrsStage;
  status: string;
  labelId: string;
  intervalDays: number;
  category: 'NEW' | 'LEARNING' | 'STABLE' | 'MASTERED';
}

export const SRS_STAGES: Record<SrsStage, SrsStageMetadata> = {
  0: { stage: 0, status: 'NEW', labelId: 'Baru (Stage 0)', intervalDays: 0, category: 'NEW' },
  1: { stage: 1, status: 'APPRENTICE_1', labelId: 'Apprentice 1 (+1h)', intervalDays: 1, category: 'LEARNING' },
  2: { stage: 2, status: 'APPRENTICE_2', labelId: 'Apprentice 2 (+2h)', intervalDays: 2, category: 'LEARNING' },
  3: { stage: 3, status: 'APPRENTICE_3', labelId: 'Apprentice 3 (+4h)', intervalDays: 4, category: 'LEARNING' },
  4: { stage: 4, status: 'GURU_1', labelId: 'Guru 1 (+7h)', intervalDays: 7, category: 'STABLE' },
  5: { stage: 5, status: 'GURU_2', labelId: 'Guru 2 (+14h)', intervalDays: 14, category: 'STABLE' },
  6: { stage: 6, status: 'MASTER', labelId: 'Master (+30h)', intervalDays: 30, category: 'MASTERED' },
  7: { stage: 7, status: 'ENLIGHTENED', labelId: 'Enlightened (+60h)', intervalDays: 60, category: 'MASTERED' },
  8: { stage: 8, status: 'BURNED', labelId: 'Burned (+120h)', intervalDays: 120, category: 'MASTERED' },
};

export const TARGET_612_REPETITIONS = 612;

export interface UserItemSrsRecord {
  item_id: string;
  item_type: 'VOCAB' | 'KANJI';
  sprint: number;
  srs_stage: SrsStage;
  next_review_at: string;
  last_reviewed_at: string;
  correct_count: number;
  wrong_count: number;
  total_reps: number;
  is_leech: boolean;
}

/**
 * Calculates the next SRS state following section 2.2 of 00_MASTER_LOGIC_SRS.md
 */
export function calculateNextSrsState(
  current: UserItemSrsRecord,
  isCorrect: boolean,
  usedRomajiHint: boolean,
  nowDate: Date = new Date()
): UserItemSrsRecord {
  let nextStage: SrsStage = current.srs_stage;
  let intervalDays = 1;

  if (isCorrect) {
    if (usedRomajiHint && current.srs_stage >= 3) {
      // Answered right with Romaji Hint in Stage >= 3: stage stays unchanged, +1 day review
      nextStage = current.srs_stage;
      intervalDays = 1;
    } else {
      nextStage = Math.min(current.srs_stage + 1, 8) as SrsStage;
      intervalDays = SRS_STAGES[nextStage].intervalDays || 1;
    }
  } else {
    // Wrong answer penalty
    if (current.srs_stage <= 2) {
      nextStage = 1;
    } else {
      nextStage = Math.max(current.srs_stage - 2, 1) as SrsStage;
    }
    intervalDays = SRS_STAGES[nextStage].intervalDays || 1;
  }

  const nextReview = new Date(nowDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const newCorrectCount = isCorrect ? current.correct_count + 1 : current.correct_count;
  const newWrongCount = isCorrect ? current.wrong_count : current.wrong_count + 1;
  const newTotalReps = (current.total_reps || 0) + 1;
  const isLeech = newWrongCount >= 4;

  return {
    ...current,
    srs_stage: nextStage,
    next_review_at: nextReview.toISOString(),
    last_reviewed_at: nowDate.toISOString(),
    correct_count: newCorrectCount,
    wrong_count: newWrongCount,
    total_reps: newTotalReps,
    is_leech: isLeech,
  };
}

/**
 * Anti-Burnout Daily Review Cap Check (Section 2.3)
 * If pending due reviews > 130, lock new item intake until queue < 80
 */
export function checkAntiBurnoutGate(dueReviewCount: number, currentlyLocked: boolean = false): {
  isNewIntakeLocked: boolean;
  capLimit: number;
  lockThreshold: number;
  unlockThreshold: number;
} {
  const capLimit = 150;
  const lockThreshold = 130;
  const unlockThreshold = 80;

  let isNewIntakeLocked = currentlyLocked;
  if (dueReviewCount > lockThreshold) {
    isNewIntakeLocked = true;
  } else if (dueReviewCount < unlockThreshold) {
    isNewIntakeLocked = false;
  }

  return {
    isNewIntakeLocked,
    capLimit,
    lockThreshold,
    unlockThreshold,
  };
}

/**
 * Progressive Romaji Scaffolding (Section 4.1)
 */
export function getRomajiVisibility(stage: SrsStage, alwaysShowRomaji: boolean): {
  showFurigana: boolean;
  showRomajiAuto: boolean;
  canRevealRomajiHint: boolean;
} {
  if (alwaysShowRomaji) {
    return {
      showFurigana: true,
      showRomajiAuto: true,
      canRevealRomajiHint: false,
    };
  }
  if (stage <= 2) {
    return {
      showFurigana: true,
      showRomajiAuto: true,
      canRevealRomajiHint: false,
    };
  }
  if (stage <= 5) {
    return {
      showFurigana: true,
      showRomajiAuto: false,
      canRevealRomajiHint: true,
    };
  }
  return {
    showFurigana: false,
    showRomajiAuto: false,
    canRevealRomajiHint: false,
  };
}

/**
 * Levenshtein distance calculation for Smart Grader typo tolerance
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Normalizes general input and strips prefix affixes `～` and `-` (Section 4.2.1)
 */
export function normalizeAnswerText(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^[～~\-]+/, '')
    .replace(/[.,!?"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Japanese Romaji variations (`si`->`shi`, `ti`->`chi`, `tu`->`tsu`, `hu`->`fu`, `ō`->`ou`, apostrophes)
 */
export function normalizeRomaji(raw: string): string {
  return normalizeAnswerText(raw)
    .replace(/'/g, '')
    .replace(/ō/g, 'ou')
    .replace(/ū/g, 'uu')
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ē/g, 'ee')
    .replace(/\bsi/g, 'shi')
    .replace(/([^s])si/g, '$1shi')
    .replace(/\bti/g, 'chi')
    .replace(/([^c])ti/g, '$1chi')
    .replace(/\btu/g, 'tsu')
    .replace(/([^t])tu/g, '$1tsu')
    .replace(/\bhu/g, 'fu')
    .replace(/([^f])hu/g, '$1fu')
    .replace(/oo/g, 'ou');
}

export interface GradeResult {
  isCorrect: boolean;
  hasMinorTypo: boolean;
  matchedTarget: string;
}

/**
 * Smart Grader for Indonesian Meaning Input (`TYPE_JP_ID`, `KANJI_MEANING`)
 * Strips context parentheses `(...)` and checks fuzzy Levenshtein distance <= 1 for words >= 5 chars
 */
export function gradeIndonesianInput(userInput: string, rawMeaningString: string): GradeResult {
  const normalizedUser = normalizeAnswerText(stripContextParens(userInput));
  if (!normalizedUser) {
    return { isCorrect: false, hasMinorTypo: false, matchedTarget: rawMeaningString };
  }

  const rawOptions = rawMeaningString
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const opt of rawOptions) {
    const cleanTarget = normalizeAnswerText(stripContextParens(opt));
    const fullTarget = normalizeAnswerText(opt);

    if (normalizedUser === cleanTarget || normalizedUser === fullTarget) {
      return { isCorrect: true, hasMinorTypo: false, matchedTarget: opt };
    }
  }

  // Fuzzy Typo Check for words >= 5 characters
  for (const opt of rawOptions) {
    const cleanTarget = normalizeAnswerText(stripContextParens(opt));
    if (cleanTarget.length >= 5 && normalizedUser.length >= 4) {
      const dist = levenshteinDistance(normalizedUser, cleanTarget);
      if (dist <= 1) {
        return { isCorrect: true, hasMinorTypo: true, matchedTarget: opt };
      }
    }
  }

  return { isCorrect: false, hasMinorTypo: false, matchedTarget: rawOptions[0] || rawMeaningString };
}

/**
 * Smart Grader for Japanese Input (`TYPE_ID_JP`, `KANJI_READING`, `CLOZE_CTX`)
 * Accepts Romaji, Kana, or Kanji with prefix stripping (`-kai` == `kai`, `～階` == `階`)
 */
export function gradeJapaneseInput(
  userInput: string,
  validTargets: { kanji?: string; kana: string; romaji: string; clozeTarget?: string }
): GradeResult {
  const cleanUser = normalizeAnswerText(userInput);
  if (!cleanUser) {
    return { isCorrect: false, hasMinorTypo: false, matchedTarget: validTargets.kana };
  }

  const cleanKana = normalizeAnswerText(validTargets.kana);
  const cleanKanji = validTargets.kanji && validTargets.kanji !== '-'
    ? normalizeAnswerText(validTargets.kanji)
    : '';
  const cleanCloze = validTargets.clozeTarget
    ? normalizeAnswerText(validTargets.clozeTarget)
    : '';

  if (
    cleanUser === cleanKana ||
    (cleanKanji && cleanUser === cleanKanji) ||
    (cleanCloze && cleanUser === cleanCloze)
  ) {
    return { isCorrect: true, hasMinorTypo: false, matchedTarget: validTargets.kana };
  }

  const normUserRomaji = normalizeRomaji(userInput);
  const normTargetRomaji = normalizeRomaji(validTargets.romaji);

  if (normUserRomaji === normTargetRomaji) {
    return { isCorrect: true, hasMinorTypo: false, matchedTarget: validTargets.romaji };
  }

  // Fuzzy typo check on Romaji if >= 5 letters
  if (normTargetRomaji.length >= 5 && normUserRomaji.length >= 4) {
    const dist = levenshteinDistance(normUserRomaji, normTargetRomaji);
    if (dist <= 1) {
      return { isCorrect: true, hasMinorTypo: true, matchedTarget: validTargets.romaji };
    }
  }

  return { isCorrect: false, hasMinorTypo: false, matchedTarget: validTargets.romaji };
}

export type VocabQuizMode =
  | 'MC_JP_ID'
  | 'MC_ID_JP'
  | 'TYPE_JP_ID'
  | 'TYPE_ID_JP'
  | 'CLOZE_CTX'
  | 'AUDIO_DICT';

export type KanjiQuizMode = 'KANJI_MEANING' | 'KANJI_READING' | 'KANJI_PICK';

export type QuizMode = VocabQuizMode | KanjiQuizMode;

/**
 * Selects Vocab Quiz Mode based on SRS Stage distribution & Duolingo max-2-identical-in-a-row rule (Section 3.2)
 */
export function selectVocabQuizMode(
  stage: SrsStage,
  isLeech: boolean,
  recentModes: QuizMode[],
  randomSeed: number = Math.random()
): VocabQuizMode {
  // Leech priority: prioritize Context Sentence (`CLOZE_CTX`)
  let distribution: { mode: VocabQuizMode; weight: number }[];

  if (isLeech && stage >= 1) {
    distribution = [
      { mode: 'CLOZE_CTX', weight: 0.45 },
      { mode: 'TYPE_ID_JP', weight: 0.35 },
      { mode: 'TYPE_JP_ID', weight: 0.20 },
    ];
  } else if (stage === 0) {
    distribution = [
      { mode: 'MC_JP_ID', weight: 0.50 },
      { mode: 'MC_ID_JP', weight: 0.30 },
      { mode: 'TYPE_JP_ID', weight: 0.20 },
    ];
  } else if (stage <= 2) {
    distribution = [
      { mode: 'MC_ID_JP', weight: 0.25 },
      { mode: 'TYPE_JP_ID', weight: 0.45 },
      { mode: 'TYPE_ID_JP', weight: 0.30 },
    ];
  } else if (stage <= 5) {
    distribution = [
      { mode: 'TYPE_JP_ID', weight: 0.30 },
      { mode: 'TYPE_ID_JP', weight: 0.40 },
      { mode: 'CLOZE_CTX', weight: 0.20 },
      { mode: 'AUDIO_DICT', weight: 0.10 },
    ];
  } else {
    distribution = [
      { mode: 'TYPE_JP_ID', weight: 0.20 },
      { mode: 'TYPE_ID_JP', weight: 0.40 },
      { mode: 'CLOZE_CTX', weight: 0.25 },
      { mode: 'AUDIO_DICT', weight: 0.15 },
    ];
  }

  // Check if the last 2 modes were identical (forbidden 3 in a row)
  const lastTwoSame =
    recentModes.length >= 2 &&
    recentModes[recentModes.length - 1] === recentModes[recentModes.length - 2];
  const forbiddenMode = lastTwoSame ? recentModes[recentModes.length - 1] : null;

  const filtered = distribution.filter((d) => d.mode !== forbiddenMode);
  const pool = filtered.length > 0 ? filtered : distribution;

  const totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
  let cursor = randomSeed * totalWeight;

  for (const entry of pool) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.mode;
    }
  }
  return pool[pool.length - 1].mode;
}

/**
 * Selects Kanji Quiz Mode based on SRS Stage distribution (Section 3.3)
 */
export function selectKanjiQuizMode(
  stage: SrsStage,
  recentModes: QuizMode[],
  randomSeed: number = Math.random()
): KanjiQuizMode {
  let distribution: { mode: KanjiQuizMode; weight: number }[];
  if (stage === 0) {
    distribution = [
      { mode: 'KANJI_PICK', weight: 0.50 },
      { mode: 'KANJI_MEANING', weight: 0.50 },
    ];
  } else if (stage <= 2) {
    distribution = [
      { mode: 'KANJI_MEANING', weight: 0.40 },
      { mode: 'KANJI_READING', weight: 0.40 },
      { mode: 'KANJI_PICK', weight: 0.20 },
    ];
  } else {
    distribution = [
      { mode: 'KANJI_MEANING', weight: 0.35 },
      { mode: 'KANJI_READING', weight: 0.65 },
    ];
  }

  const lastTwoSame =
    recentModes.length >= 2 &&
    recentModes[recentModes.length - 1] === recentModes[recentModes.length - 2];
  const forbiddenMode = lastTwoSame ? recentModes[recentModes.length - 1] : null;

  const filtered = distribution.filter((d) => d.mode !== forbiddenMode);
  const pool = filtered.length > 0 ? filtered : distribution;
  const totalWeight = pool.reduce((acc, item) => acc + item.weight, 0);
  let cursor = randomSeed * totalWeight;

  for (const entry of pool) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.mode;
    }
  }
  return pool[pool.length - 1].mode;
}

/**
 * Selects 3 Distractors from the exact same `Jenis_Kata` (Section 3.2 Rule 2)
 */
export function pickVocabDistractors(target: VocabItem, allVocab: VocabItem[], count: number = 3): VocabItem[] {
  const sameClass = allVocab.filter(
    (v) => v.id !== target.id && v.jenisKata === target.jenisKata
  );
  const fallbackPool = allVocab.filter((v) => v.id !== target.id);
  const sourcePool = sameClass.length >= count ? sameClass : fallbackPool;

  // Deterministic/shuffled pick
  const shuffled = [...sourcePool].sort((a, b) => {
    const hashA = (a.id.charCodeAt(3) * 31 + target.id.charCodeAt(4)) % 97;
    const hashB = (b.id.charCodeAt(3) * 31 + target.id.charCodeAt(4)) % 97;
    return hashA - hashB;
  });

  return shuffled.slice(0, count);
}

/**
 * Selects 3 Kanji Distractors
 */
export function pickKanjiDistractors(target: KanjiItem, allKanji: KanjiItem[], count: number = 3): KanjiItem[] {
  const pool = allKanji.filter((k) => k.id !== target.id);
  const shuffled = [...pool].sort((a, b) => {
    const hashA = (a.id.charCodeAt(3) * 29 + target.id.charCodeAt(4)) % 89;
    const hashB = (b.id.charCodeAt(3) * 29 + target.id.charCodeAt(4)) % 89;
    return hashA - hashB;
  });
  return shuffled.slice(0, count);
}
