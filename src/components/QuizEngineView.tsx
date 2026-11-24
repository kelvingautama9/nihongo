import React, { useState, useEffect, useRef } from 'react';
import { KanjiItem, VocabItem } from '../utils/sprintParser';
import {
  calculateNextSrsState,
  getRomajiVisibility,
  gradeIndonesianInput,
  gradeJapaneseInput,
  pickKanjiDistractors,
  pickVocabDistractors,
  QuizMode,
  selectKanjiQuizMode,
  selectVocabQuizMode,
  SRS_STAGES,
  UserItemSrsRecord,
} from '../utils/srsEngine';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

export interface QuizQueueItem {
  id: string;
  itemType: 'VOCAB' | 'KANJI';
  vocab?: VocabItem;
  kanji?: KanjiItem;
  srsRecord: UserItemSrsRecord;
  isRetryInLoop: boolean;
}

interface QuizEngineViewProps {
  sessionTitle: string;
  sessionType: 'DAILY_SRS' | 'BATCH_LEARN' | 'JLPT_ASSESSMENT';
  initialQueue: QuizQueueItem[];
  allVocab: VocabItem[];
  allKanji: KanjiItem[];
  alwaysShowRomaji: boolean;
  ttsRate: number;
  hapticsEnabled: boolean;
  onUpdateItemSrs: (updatedRecord: UserItemSrsRecord, wasFirstAttempt: boolean, isCorrect: boolean) => void;
  onCompleteSession: (stats: { totalQuestions: number; correctFirstTry: number; totalRepsAdded: number }) => void;
  onOpenGrammarDrawer: () => void;
  onExit: () => void;
}

export const QuizEngineView: React.FC<QuizEngineViewProps> = ({
  sessionTitle,
  initialQueue,
  allVocab,
  allKanji,
  alwaysShowRomaji,
  ttsRate,
  hapticsEnabled,
  onUpdateItemSrs,
  onCompleteSession,
  onOpenGrammarDrawer,
  onExit,
}) => {
  const [queue, setQueue] = useState<QuizQueueItem[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recentModes, setRecentModes] = useState<QuizMode[]>([]);
  const [currentMode, setCurrentMode] = useState<QuizMode>('MC_JP_ID');

  const [typedAnswer, setTypedAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealedRomajiHint, setRevealedRomajiHint] = useState(false);
  const [emptyInputWarning, setEmptyInputWarning] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    isSubmitted: boolean;
    isCorrect: boolean;
    hasMinorTypo: boolean;
    userSubmittedAnswer: string;
    correctDisplayAnswer: string;
    previousStageLabel: string;
    nextStageLabel: string;
    isLeechWarning: boolean;
  } | null>(null);

  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [totalRepsThisSession, setTotalRepsThisSession] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const currentItem = queue[currentIndex];

  useEffect(() => {
    if (!currentItem) return;
    let chosenMode: QuizMode;
    if (currentItem.itemType === 'VOCAB') {
      chosenMode = selectVocabQuizMode(
        currentItem.srsRecord.srs_stage,
        currentItem.srsRecord.is_leech,
        recentModes
      );
    } else {
      chosenMode = selectKanjiQuizMode(currentItem.srsRecord.srs_stage, recentModes);
    }
    setCurrentMode(chosenMode);
    setTypedAnswer('');
    setSelectedOption(null);
    setRevealedRomajiHint(false);
    setEmptyInputWarning(null);
    setFeedback(null);

    if (chosenMode === 'AUDIO_DICT' && currentItem.vocab) {
      speakJapaneseText(currentItem.vocab.kana, ttsRate);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [feedback, currentMode, currentIndex]);

  if (!currentItem) {
    return (
      <div className="max-w-xl mx-auto py-10 px-6 border border-neutral-200 bg-white">
        <h2 className="text-base font-semibold text-neutral-950 mb-2">
          Tidak ada kartu jatuh tempo
        </h2>
        <p className="text-sm text-neutral-600 mb-6">
          Semua kartu pada tahap ini sudah selesai diuji.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
        >
          Kembali ke Belajar Harian
        </button>
      </div>
    );
  }

  const stage = currentItem.srsRecord.srs_stage;
  const romajiConfig = getRomajiVisibility(stage, alwaysShowRomaji);

  const getMultipleChoiceOptions = (): { id: string; label: string; subLabel?: string; isTarget: boolean }[] => {
    if (currentItem.itemType === 'VOCAB' && currentItem.vocab) {
      const target = currentItem.vocab;
      const distractors = pickVocabDistractors(target, allVocab, 3);
      const rawList = [target, ...distractors];

      const options = rawList.map((v) => {
        if (currentMode === 'MC_JP_ID') {
          return {
            id: v.id,
            label: v.artiFull,
            isTarget: v.id === target.id,
          };
        } else {
          const mainJp = v.kanji !== '-' ? `${v.kanji} (${v.kana})` : v.kana;
          return {
            id: v.id,
            label: mainJp,
            subLabel: romajiConfig.showRomajiAuto || revealedRomajiHint ? v.romaji : undefined,
            isTarget: v.id === target.id,
          };
        }
      });

      return options.sort((a, b) => a.id.localeCompare(b.id));
    }

    if (currentItem.itemType === 'KANJI' && currentItem.kanji) {
      const target = currentItem.kanji;
      const distractors = pickKanjiDistractors(target, allKanji, 3);
      const rawList = [target, ...distractors];

      if (currentMode === 'KANJI_PICK') {
        return rawList
          .map((k) => ({
            id: k.id,
            label: k.kanji,
            subLabel: k.onyomi !== '-' ? k.onyomi.split(';')[0] : k.kunyomi.split(';')[0],
            isTarget: k.id === target.id,
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
      }

      const targetEx = target.examples[0];
      return rawList
        .map((k) => {
          const ex = k.examples[0];
          return {
            id: k.id,
            label: ex ? `${ex.kana} (${ex.romaji})` : k.onyomi,
            subLabel: targetEx ? k.kanji : undefined,
            isTarget: k.id === target.id,
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    return [];
  };

  const isMultipleChoiceMode =
    currentMode === 'MC_JP_ID' ||
    currentMode === 'MC_ID_JP' ||
    currentMode === 'KANJI_PICK' ||
    (currentMode === 'KANJI_READING' && stage <= 2);

  const mcOptions = isMultipleChoiceMode ? getMultipleChoiceOptions() : [];

  const handleEvaluateSubmission = (chosenOptionId?: string) => {
    if (feedback?.isSubmitted) return;

    let isCorrect = false;
    let hasMinorTypo = false;
    let correctDisplayAnswer = '';
    let userSubmittedAnswer = typedAnswer.trim();

    if (currentItem.itemType === 'VOCAB' && currentItem.vocab) {
      const v = currentItem.vocab;
      if (currentMode === 'MC_JP_ID' || currentMode === 'MC_ID_JP') {
        const pickedId = chosenOptionId || selectedOption;
        if (!pickedId) return;
        const pickedOpt = mcOptions.find((o) => o.id === pickedId);
        userSubmittedAnswer = pickedOpt ? pickedOpt.label : pickedId;
        isCorrect = pickedId === v.id;
        correctDisplayAnswer =
          currentMode === 'MC_JP_ID'
            ? v.artiFull
            : `${v.kanji !== '-' ? `${v.kanji} · ` : ''}${v.kana} (${v.romaji})`;
      } else if (currentMode === 'TYPE_JP_ID' || currentMode === 'AUDIO_DICT') {
        if (!typedAnswer.trim()) {
          setEmptyInputWarning('Ketik jawaban Anda terlebih dahulu sebelum menekan Periksa.');
          triggerHapticFeedback('WRONG', hapticsEnabled);
          return;
        }
        setEmptyInputWarning(null);
        const grade = gradeIndonesianInput(typedAnswer, v.artiFull);
        isCorrect = grade.isCorrect;
        hasMinorTypo = grade.hasMinorTypo;
        correctDisplayAnswer = v.artiFull;
      } else if (currentMode === 'TYPE_ID_JP') {
        if (!typedAnswer.trim()) {
          setEmptyInputWarning('Ketik jawaban Romaji, Kana, atau Kanji terlebih dahulu.');
          triggerHapticFeedback('WRONG', hapticsEnabled);
          return;
        }
        setEmptyInputWarning(null);
        const grade = gradeJapaneseInput(typedAnswer, {
          kanji: v.kanji,
          kana: v.kana,
          romaji: v.romaji,
        });
        isCorrect = grade.isCorrect;
        hasMinorTypo = grade.hasMinorTypo;
        correctDisplayAnswer = `${v.kanji !== '-' ? `${v.kanji} · ` : ''}${v.kana} (${v.romaji})`;
      } else if (currentMode === 'CLOZE_CTX') {
        if (!typedAnswer.trim()) {
          setEmptyInputWarning('Isi kata yang hilang terlebih dahulu.');
          triggerHapticFeedback('WRONG', hapticsEnabled);
          return;
        }
        setEmptyInputWarning(null);
        const grade = gradeJapaneseInput(typedAnswer, {
          kanji: v.kanji,
          kana: v.kana,
          romaji: v.romaji,
          clozeTarget: v.clozeTargetJp,
        });
        isCorrect = grade.isCorrect;
        hasMinorTypo = grade.hasMinorTypo;
        correctDisplayAnswer = `${v.clozeTargetJp} (${v.kana} / ${v.romaji})`;
      }
    } else if (currentItem.itemType === 'KANJI' && currentItem.kanji) {
      const k = currentItem.kanji;
      const ex = k.examples[0];

      if (currentMode === 'KANJI_PICK' || (currentMode === 'KANJI_READING' && stage <= 2)) {
        const pickedId = chosenOptionId || selectedOption;
        if (!pickedId) return;
        const pickedOpt = mcOptions.find((o) => o.id === pickedId);
        userSubmittedAnswer = pickedOpt ? pickedOpt.label : pickedId;
        isCorrect = pickedId === k.id;
        correctDisplayAnswer =
          currentMode === 'KANJI_PICK'
            ? `${k.kanji} (${k.artiFull})`
            : ex
            ? `${ex.kanjiWord} = ${ex.kana} (${ex.romaji})`
            : k.onyomi;
      } else if (currentMode === 'KANJI_MEANING') {
        if (!typedAnswer.trim()) {
          setEmptyInputWarning('Ketik arti Kanji terlebih dahulu.');
          triggerHapticFeedback('WRONG', hapticsEnabled);
          return;
        }
        setEmptyInputWarning(null);
        const grade = gradeIndonesianInput(typedAnswer, k.artiFull);
        isCorrect = grade.isCorrect;
        hasMinorTypo = grade.hasMinorTypo;
        correctDisplayAnswer = k.artiFull;
      } else if (currentMode === 'KANJI_READING') {
        if (!typedAnswer.trim()) {
          setEmptyInputWarning('Ketik bacaan Kanji terlebih dahulu.');
          triggerHapticFeedback('WRONG', hapticsEnabled);
          return;
        }
        setEmptyInputWarning(null);
        const grade = gradeJapaneseInput(typedAnswer, {
          kanji: ex ? ex.kanjiWord : k.kanji,
          kana: ex ? ex.kana : k.kunyomi,
          romaji: ex ? ex.romaji : k.onyomi,
        });
        isCorrect = grade.isCorrect;
        hasMinorTypo = grade.hasMinorTypo;
        correctDisplayAnswer = ex ? `${ex.kana} (${ex.romaji})` : k.onyomi;
      }
    }

    triggerHapticFeedback(isCorrect ? 'CORRECT' : 'WRONG', hapticsEnabled);

    if (currentItem.vocab) {
      speakJapaneseText(currentItem.vocab.kana, ttsRate);
    } else if (currentItem.kanji && currentItem.kanji.examples[0]) {
      speakJapaneseText(currentItem.kanji.examples[0].kana, ttsRate);
    }

    setTotalRepsThisSession((prev) => prev + 1);

    const prevStageLabel = SRS_STAGES[currentItem.srsRecord.srs_stage].labelId;
    let nextSrsRecord = currentItem.srsRecord;
    if (!currentItem.isRetryInLoop) {
      nextSrsRecord = calculateNextSrsState(
        currentItem.srsRecord,
        isCorrect,
        revealedRomajiHint
      );
      onUpdateItemSrs(nextSrsRecord, true, isCorrect);
      if (isCorrect) {
        setFirstTryCorrectCount((prev) => prev + 1);
      }
    } else {
      nextSrsRecord = {
        ...currentItem.srsRecord,
        total_reps: (currentItem.srsRecord.total_reps || 0) + 1,
      };
      onUpdateItemSrs(nextSrsRecord, false, isCorrect);
    }

    if (!isCorrect) {
      setQueue((prev) => [
        ...prev,
        {
          ...currentItem,
          srsRecord: nextSrsRecord,
          isRetryInLoop: true,
        },
      ]);
    }

    setRecentModes((prev) => [...prev.slice(-4), currentMode]);

    setFeedback({
      isSubmitted: true,
      isCorrect,
      hasMinorTypo,
      userSubmittedAnswer,
      correctDisplayAnswer,
      previousStageLabel: prevStageLabel,
      nextStageLabel: SRS_STAGES[nextSrsRecord.srs_stage].labelId,
      isLeechWarning: nextSrsRecord.is_leech,
    });
  };

  const handleNextQuestion = () => {
    triggerHapticFeedback('STEP', hapticsEnabled);
    if (currentIndex + 1 < queue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onCompleteSession({
        totalQuestions: initialQueue.length,
        correctFirstTry: firstTryCorrectCount,
        totalRepsAdded: totalRepsThisSession,
      });
    }
  };

  const progressPct = Math.round(((currentIndex + (feedback ? 1 : 0)) / queue.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header Kuis */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{sessionTitle}</span>
            <span>·</span>
            <span className="font-mono-num">
              {currentIndex + 1} / {queue.length}
            </span>
            {currentItem.isRetryInLoop && (
              <>
                <span>·</span>
                <span className="px-1.5 py-0.5 bg-red-900 text-white text-[10px] font-semibold">
                  SOAL ULANG
                </span>
              </>
            )}
          </div>
          <h1 className="text-sm font-semibold text-neutral-950 mt-0.5">
            {currentMode === 'MC_JP_ID' && 'Pilih arti Bahasa Indonesia'}
            {currentMode === 'MC_ID_JP' && 'Pilih kosakata Bahasa Jepang'}
            {currentMode === 'TYPE_JP_ID' && 'Ketik arti Bahasa Indonesia'}
            {currentMode === 'TYPE_ID_JP' && 'Ketik dalam Romaji, Kana, atau Kanji'}
            {currentMode === 'CLOZE_CTX' && 'Lengkapi bagian kosong pada kalimat'}
            {currentMode === 'AUDIO_DICT' && 'Dengarkan audio lalu ketik artinya'}
            {currentMode === 'KANJI_MEANING' && 'Ketik arti Kanji'}
            {currentMode === 'KANJI_READING' && 'Bacaan Kanji dalam kata'}
            {currentMode === 'KANJI_PICK' && 'Pilih karakter Kanji yang tepat'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGrammarDrawer}
            className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Tata Bahasa
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-3 py-1.5 text-xs font-medium border border-neutral-200 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-neutral-100 overflow-hidden">
        <div
          className="h-full bg-neutral-950 transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${progressPct / 100})` }}
        />
      </div>

      {/* PROMINENT WRONG / CORRECT ALERT BANNER (Immediately visible on mobile & desktop) */}
      {feedback?.isSubmitted && (
        <div
          ref={feedbackRef}
          role="alert"
          className={`border-2 p-4 space-y-2 ${
            feedback.isCorrect
              ? 'border-emerald-900 bg-emerald-950/[0.06]'
              : 'border-red-900 bg-red-950/[0.06]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white ${
                  feedback.isCorrect ? 'bg-emerald-900' : 'bg-red-900'
                }`}
              >
                {feedback.isCorrect ? 'JAWABAN BENAR' : 'PERINGATAN: JAWABAN SALAH'}
              </span>
              <span className="text-xs font-mono-num font-semibold text-blue-950">
                {feedback.nextStageLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextQuestion}
              className={`px-4 py-1.5 text-xs font-semibold text-white transition-colors ${
                feedback.isCorrect
                  ? 'bg-emerald-900 hover:bg-emerald-800'
                  : 'bg-red-900 hover:bg-red-800'
              }`}
            >
              {currentIndex + 1 < queue.length ? 'Soal Berikutnya →' : 'Selesai Sesi'}
            </button>
          </div>

          {!feedback.isCorrect && (
            <div className="pt-1 space-y-1 text-xs">
              <p className="text-red-950">
                Jawaban Anda:{' '}
                <span className="font-mono-num line-through font-semibold text-red-900">
                  {feedback.userSubmittedAnswer}
                </span>
              </p>
              <p className="text-sm text-neutral-950">
                Jawaban yang benar:{' '}
                <strong className="font-jp font-bold text-emerald-950">
                  {feedback.correctDisplayAnswer}
                </strong>
              </p>
              <p className="text-[11px] text-red-900 font-medium">
                {feedback.isLeechWarning
                  ? 'Perhatian: Kata ini sudah salah >= 4 kali (Kata Sulit / Leech). Soal ini wajib diulang di akhir sesi sampai benar.'
                  : 'Level hafalan kartu turun dan soal ini akan diulang kembali di akhir sesi ini.'}
              </p>
            </div>
          )}

          {feedback.isCorrect && feedback.hasMinorTypo && (
            <p className="text-xs font-medium text-amber-900">
              Terhitung benar (ada sedikit salah ketik). Ejaan yang tepat:{' '}
              <strong className="font-jp">{feedback.correctDisplayAnswer}</strong>
            </p>
          )}
        </div>
      )}

      {/* Main Prompt Card */}
      <div
        className={`border bg-white p-4 sm:p-6 ${
          feedback?.isSubmitted
            ? feedback.isCorrect
              ? 'border-emerald-900'
              : 'border-red-900'
            : 'border-neutral-200'
        }`}
      >
        {/* VOCAB PROMPTS */}
        {currentItem.itemType === 'VOCAB' && currentItem.vocab && (
          <div className="space-y-3">
            {(currentMode === 'MC_JP_ID' || currentMode === 'TYPE_JP_ID') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    Sprint {currentItem.vocab.sprint} · Hari {currentItem.vocab.day}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.kana, ttsRate)}
                    className="px-2.5 py-1 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                  >
                    Audio
                  </button>
                </div>

                <p className="text-3xl sm:text-4xl font-bold font-jp text-neutral-950 tracking-tight break-words">
                  {currentItem.vocab.kanji !== '-' ? currentItem.vocab.kanji : currentItem.vocab.kana}
                </p>

                {romajiConfig.showFurigana && currentItem.vocab.kanji !== '-' && (
                  <p className="text-base sm:text-lg font-jp text-neutral-700">
                    {currentItem.vocab.kana}
                  </p>
                )}

                {(romajiConfig.showRomajiAuto || revealedRomajiHint) && (
                  <p className="text-sm font-mono-num text-neutral-500">
                    {currentItem.vocab.romaji}
                  </p>
                )}

                {romajiConfig.canRevealRomajiHint && !revealedRomajiHint && !feedback && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('LIGHT', hapticsEnabled);
                      setRevealedRomajiHint(true);
                    }}
                    className="text-xs text-blue-950 underline hover:text-neutral-950"
                  >
                    Tampilkan Romaji
                  </button>
                )}
              </div>
            )}

            {(currentMode === 'MC_ID_JP' || currentMode === 'TYPE_ID_JP') && (
              <div className="space-y-2">
                <span className="text-xs text-neutral-500">
                  Terjemahkan ke Bahasa Jepang
                </span>
                <p className="text-xl sm:text-2xl font-bold text-neutral-950 break-words">
                  {currentItem.vocab.artiFull}
                </p>
                <p className="text-xs text-neutral-500">
                  Contoh: &ldquo;{currentItem.vocab.contohId}&rdquo;
                </p>
              </div>
            )}

            {currentMode === 'CLOZE_CTX' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    Isi kata yang hilang
                  </span>
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.contohJpClean, ttsRate)}
                    className="px-2.5 py-1 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
                  >
                    Audio Kalimat
                  </button>
                </div>
                <p className="text-xl sm:text-2xl font-bold font-jp text-neutral-950 break-words">
                  {currentItem.vocab.clozePromptJp}
                </p>
                <p className="text-sm text-neutral-700">
                  &ldquo;{currentItem.vocab.contohId}&rdquo;
                </p>
                <p className="text-xs text-neutral-500">
                  Target: <span className="font-semibold text-neutral-900">{currentItem.vocab.artiFull}</span>
                </p>
              </div>
            )}

            {currentMode === 'AUDIO_DICT' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.kana, ttsRate)}
                    className="px-4 py-2.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                  >
                    Putar Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.kana, 0.65)}
                    className="px-3 py-2.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition-colors"
                  >
                    Lambat (0.65x)
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  Ketik arti Bahasa Indonesia dari kata yang diputar.
                </p>
              </div>
            )}
          </div>
        )}

        {/* KANJI PROMPTS */}
        {currentItem.itemType === 'KANJI' && currentItem.kanji && (
          <div className="space-y-3">
            {currentMode === 'KANJI_MEANING' && (
              <div className="space-y-2">
                <p className="text-5xl font-bold font-jp text-neutral-950">
                  {currentItem.kanji.kanji}
                </p>
                <p className="text-xs text-neutral-500">
                  Ketik arti Bahasa Indonesia dari Kanji di atas.
                </p>
              </div>
            )}

            {currentMode === 'KANJI_READING' && (
              <div className="space-y-2">
                {currentItem.kanji.examples[0] ? (
                  <>
                    <p className="text-3xl font-bold font-jp text-neutral-950">
                      {currentItem.kanji.examples[0].kanjiWord}
                    </p>
                    <p className="text-sm text-neutral-700">
                      Arti: <span className="font-semibold">{currentItem.kanji.examples[0].meaningId}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-4xl font-bold font-jp text-neutral-950">
                    {currentItem.kanji.kanji}
                  </p>
                )}
              </div>
            )}

            {currentMode === 'KANJI_PICK' && (
              <div className="space-y-2">
                <p className="text-xl sm:text-2xl font-bold text-neutral-950">
                  {currentItem.kanji.artiFull}
                </p>
                {currentItem.kanji.examples[0] && (
                  <p className="text-sm font-jp text-neutral-700">
                    Contoh:{' '}
                    {currentItem.kanji.examples[0].kanjiWord.replace(currentItem.kanji.kanji, '___')}{' '}
                    ({currentItem.kanji.examples[0].romaji} = {currentItem.kanji.examples[0].meaningId})
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* INTERACTION ZONE */}
        <div className="mt-5">
          {isMultipleChoiceMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {mcOptions.map((opt, idx) => {
                const isPicked = selectedOption === opt.id;
                let borderStyle = 'border-neutral-300 hover:border-neutral-950 bg-white text-neutral-950';
                if (feedback?.isSubmitted) {
                  if (opt.isTarget) {
                    borderStyle = 'border-2 border-emerald-900 bg-emerald-950/10 text-emerald-950 font-semibold';
                  } else if (isPicked && !opt.isTarget) {
                    borderStyle = 'border-2 border-red-900 bg-red-950/10 text-red-950 font-semibold';
                  } else {
                    borderStyle = 'border-neutral-200 text-neutral-400';
                  }
                } else if (isPicked) {
                  borderStyle = 'border-neutral-950 bg-neutral-950 text-white';
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={Boolean(feedback?.isSubmitted)}
                    onClick={() => {
                      setSelectedOption(opt.id);
                      handleEvaluateSubmission(opt.id);
                    }}
                    className={`p-3.5 border text-left transition-colors flex items-baseline justify-between gap-2 ${borderStyle}`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono-num opacity-60 mr-2">{idx + 1}.</span>
                      <span className="text-sm font-jp break-words">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="block text-xs opacity-70 mt-0.5 ml-5">{opt.subLabel}</span>
                      )}
                    </div>
                    {feedback?.isSubmitted && opt.isTarget && (
                      <span className="text-[11px] font-bold text-emerald-900 shrink-0">BENAR</span>
                    )}
                    {feedback?.isSubmitted && isPicked && !opt.isTarget && (
                      <span className="text-[11px] font-bold text-red-900 shrink-0">SALAH</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!feedback?.isSubmitted) {
                  handleEvaluateSubmission();
                } else {
                  handleNextQuestion();
                }
              }}
              className="space-y-2.5"
            >
              <label htmlFor="quiz-answer-input" className="block text-xs font-medium text-neutral-700">
                {currentMode === 'TYPE_JP_ID' || currentMode === 'KANJI_MEANING' || currentMode === 'AUDIO_DICT'
                  ? 'Jawaban Bahasa Indonesia:'
                  : 'Jawaban Romaji, Kana, atau Kanji:'}
              </label>

              {emptyInputWarning && !feedback?.isSubmitted && (
                <div className="p-2.5 border border-red-900 bg-red-950/[0.04] text-xs font-medium text-red-900">
                  {emptyInputWarning}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  id="quiz-answer-input"
                  ref={inputRef}
                  type="text"
                  value={typedAnswer}
                  disabled={Boolean(feedback?.isSubmitted)}
                  onChange={(e) => {
                    setTypedAnswer(e.target.value);
                    if (emptyInputWarning) setEmptyInputWarning(null);
                  }}
                  placeholder={
                    currentMode === 'TYPE_JP_ID' || currentMode === 'KANJI_MEANING' || currentMode === 'AUDIO_DICT'
                      ? 'Ketik arti Bahasa Indonesia...'
                      : 'Ketik romaji atau kana...'
                  }
                  className={`flex-1 px-3.5 py-2.5 text-sm border focus:outline-none ${
                    feedback?.isSubmitted
                      ? feedback.isCorrect
                        ? 'border-emerald-900 bg-emerald-950/5 text-emerald-950 font-semibold'
                        : 'border-red-900 bg-red-950/5 text-red-950 font-semibold'
                      : 'border-neutral-300 focus:border-neutral-950'
                  }`}
                  autoComplete="off"
                />
                {!feedback?.isSubmitted ? (
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                  >
                    Periksa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className={`px-5 py-2.5 text-xs font-medium text-white transition-colors ${
                      feedback.isCorrect
                        ? 'bg-emerald-900 hover:bg-emerald-800'
                        : 'bg-red-900 hover:bg-red-800'
                    }`}
                  >
                    {currentIndex + 1 < queue.length ? 'Soal Berikutnya →' : 'Selesai'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* DETAILED EXPLANATION CARD AFTER SUBMISSION */}
      {feedback?.isSubmitted && (
        <div className="border border-neutral-200 bg-neutral-50 p-4 sm:p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Penjelasan & Contoh Kalimat
          </p>

          {currentItem.itemType === 'VOCAB' && currentItem.vocab && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-base font-bold font-jp text-neutral-950">
                  {currentItem.vocab.kanji !== '-' ? `${currentItem.vocab.kanji} · ` : ''}
                  {currentItem.vocab.kana}{' '}
                  <span className="font-mono-num font-normal text-neutral-600">
                    ({currentItem.vocab.romaji})
                  </span>
                </p>
                <p className="text-neutral-800 font-medium">{currentItem.vocab.artiFull}</p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.kana, ttsRate)}
                    className="px-2.5 py-1 border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 transition-colors"
                  >
                    Audio Kata
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Contoh Kalimat</span>
                  <button
                    type="button"
                    onClick={() => speakJapaneseText(currentItem.vocab!.contohJpClean, ttsRate)}
                    className="px-2 py-0.5 border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 transition-colors"
                  >
                    Audio Kalimat
                  </button>
                </div>
                <p className="text-sm font-jp font-medium text-neutral-950">
                  {currentItem.vocab.contohJpClean}
                </p>
                <p className="text-neutral-600 font-mono-num">{currentItem.vocab.contohRomaji}</p>
                <p className="text-neutral-800">{currentItem.vocab.contohId}</p>
              </div>
            </div>
          )}

          {currentItem.itemType === 'KANJI' && currentItem.kanji && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-2xl font-bold font-jp text-neutral-950">
                  {currentItem.kanji.kanji} — {currentItem.kanji.artiFull}
                </p>
                <p className="text-neutral-700">
                  Onyomi: <span className="font-jp">{currentItem.kanji.onyomi}</span> · Kunyomi:{' '}
                  <span className="font-jp">{currentItem.kanji.kunyomi}</span>
                </p>
              </div>
              <div className="space-y-1">
                {currentItem.kanji.examples.map((ex) => (
                  <div key={ex.kanjiWord} className="flex items-center justify-between py-0.5 gap-2">
                    <span className="font-jp text-neutral-900">
                      {ex.kanjiWord} ({ex.kana}) = {ex.meaningId}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakJapaneseText(ex.kana, ttsRate)}
                      className="px-2 py-0.5 border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 shrink-0"
                    >
                      Audio
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
