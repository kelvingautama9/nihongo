import React, { useState } from 'react';
import { VocabItem } from '../utils/sprintParser';
import {
  buildPatternSubstitution,
  conjugateVerbFromMasu,
  SWISS_ARMY_PATTERNS,
} from '../utils/speakingBridge';
import { gradeJapaneseInput, UserItemSrsRecord } from '../utils/srsEngine';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

interface SpeakingBridgeViewProps {
  allVocab: VocabItem[];
  srsMap: Record<string, UserItemSrsRecord>;
  currentSprint: number;
  currentDay: number;
  ttsRate: number;
  hapticsEnabled: boolean;
  onCompleteSpeakingDrill: (completedCount: number) => void;
  onOpenGrammarDrawer: () => void;
}

export const SpeakingBridgeView: React.FC<SpeakingBridgeViewProps> = ({
  allVocab,
  srsMap,
  currentSprint,
  currentDay,
  ttsRate,
  hapticsEnabled,
  onCompleteSpeakingDrill,
  onOpenGrammarDrawer,
}) => {
  const [activeMode, setActiveMode] = useState<'SHADOWING' | 'SLOT_DRILL'>('SHADOWING');

  const dailyVocab = allVocab.filter(
    (v) => v.sprint === currentSprint && v.dayNumber === currentDay
  );
  const [shadowedIds, setShadowedIds] = useState<Record<string, boolean>>({});

  const [selectedPatternIndex, setSelectedPatternIndex] = useState(0);
  const currentPattern = SWISS_ARMY_PATTERNS[selectedPatternIndex];

  const allVerbs = allVocab.filter(
    (v) => v.jenisKata === 'VERB_G1' || v.jenisKata === 'VERB_G2' || v.jenisKata === 'VERB_G3'
  );
  const learnedVerbs = allVerbs.filter((v) => (srsMap[v.id]?.srs_stage || 0) >= 2);
  const drillVerbs = (learnedVerbs.length >= 5 ? learnedVerbs : allVerbs).slice(0, 6);

  const [drillInputs, setDrillInputs] = useState<Record<string, string>>({});
  const [drillResults, setDrillResults] = useState<
    Record<string, { isCorrect: boolean; targetJp: string; targetRomaji: string }>
  >({});

  const handleToggleShadow = (v: VocabItem) => {
    triggerHapticFeedback('STEP', hapticsEnabled);
    speakJapaneseText(v.contohJpClean, ttsRate);
    setShadowedIds((prev) => ({ ...prev, [v.id]: true }));
  };

  const handleCheckSlotVerb = (v: VocabItem) => {
    const userText = drillInputs[v.id] || '';
    if (!userText.trim()) return;

    const conj = conjugateVerbFromMasu(v.kanji, v.kana, v.romaji, v.jenisKata);
    const { targetJp, targetRomaji } = buildPatternSubstitution(conj, currentPattern);
    const conjKana = conjugateVerbFromMasu('-', v.kana, v.romaji, v.jenisKata);
    const { targetJp: targetKana } = buildPatternSubstitution(conjKana, currentPattern);

    const grade = gradeJapaneseInput(userText, {
      kanji: targetJp,
      kana: targetKana,
      romaji: targetRomaji,
    });

    triggerHapticFeedback(grade.isCorrect ? 'CORRECT' : 'WRONG', hapticsEnabled);
    speakJapaneseText(targetKana, ttsRate);

    setDrillResults((prev) => ({
      ...prev,
      [v.id]: {
        isCorrect: grade.isCorrect,
        targetJp,
        targetRomaji,
      },
    }));
  };

  const shadowedCount = Object.keys(shadowedIds).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-950">
            Latihan Bicara & Pola Kalimat
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Lafalkan kalimat contoh harian (Shadowing) atau latih perubahan kata kerja pada 15 pola kalimat.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-neutral-300 bg-neutral-50 p-0.5">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                setActiveMode('SHADOWING');
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMode === 'SHADOWING'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              Shadowing (8 Kalimat)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                setActiveMode('SLOT_DRILL');
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMode === 'SLOT_DRILL'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              15 Pola Kalimat
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenGrammarDrawer}
            className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
          >
            Tabel Konjugasi
          </button>
        </div>
      </div>

      {activeMode === 'SHADOWING' && (
        <div className="space-y-5">
          <div className="border border-neutral-200 bg-neutral-50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                Sprint {currentSprint} · Hari {currentDay} ({shadowedCount}/{dailyVocab.length} selesai)
              </h2>
              <p className="text-xs text-neutral-600">
                Putar audio lalu ikuti pengucapannya dengan suara jelas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('CORRECT', hapticsEnabled);
                onCompleteSpeakingDrill(Math.max(shadowedCount, dailyVocab.length));
              }}
              className="px-4 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
            >
              Selesai Hari Ini
            </button>
          </div>

          <div className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
            {dailyVocab.map((v, idx) => {
              const isDone = Boolean(shadowedIds[v.id]);
              return (
                <div
                  key={v.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono-num">{idx + 1}.</span>
                      <span className="font-semibold text-neutral-900 font-jp">
                        {v.kanji !== '-' ? `${v.kanji} (${v.kana})` : v.kana}
                      </span>
                      <span>·</span>
                      <span>{v.artiFull}</span>
                      {isDone && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-900 font-semibold">Selesai</span>
                        </>
                      )}
                    </div>
                    <p className="text-base font-bold font-jp text-neutral-950 break-words">
                      {v.contohJpClean}
                    </p>
                    <p className="text-xs font-mono-num text-neutral-600">{v.contohRomaji}</p>
                    <p className="text-xs text-neutral-700">{v.contohId}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleShadow(v)}
                    className={`px-3.5 py-2 text-xs font-medium border transition-colors shrink-0 ${
                      isDone
                        ? 'border-emerald-900 bg-emerald-950/5 text-emerald-950'
                        : 'border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isDone ? 'Putar Ulang' : 'Dengar & Ucapkan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeMode === 'SLOT_DRILL' && (
        <div className="space-y-5">
          <div className="border border-neutral-200 bg-neutral-50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-jp text-neutral-950">
                  {currentPattern.pattern} — <span className="font-sans font-semibold">{currentPattern.meaning}</span>
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Contoh: <strong className="font-jp">{currentPattern.exampleJp}</strong> ({currentPattern.exampleRomaji} = {currentPattern.exampleId})
                </p>
              </div>

              <select
                id="pattern-select"
                aria-label="Pilih Pola Kalimat"
                value={selectedPatternIndex}
                onChange={(e) => {
                  setSelectedPatternIndex(Number(e.target.value));
                  setDrillResults({});
                }}
                className="px-3 py-2 text-xs border border-neutral-300 bg-white text-neutral-950 focus:outline-none focus:border-neutral-950 max-w-full"
              >
                {SWISS_ARMY_PATTERNS.map((p, i) => (
                  <option key={p.id} value={i}>
                    {p.id}. {p.pattern} ({p.meaning})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-neutral-200 divide-y divide-neutral-200 bg-white">
            {drillVerbs.map((v) => {
              const res = drillResults[v.id];
              return (
                <div key={v.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-4">
                    <p className="text-base font-bold font-jp text-neutral-950">
                      {v.kanji !== '-' ? `${v.kanji} (${v.kana})` : v.kana}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {v.romaji} — {v.artiFull}
                    </p>
                  </div>

                  <div className="md:col-span-5">
                    <input
                      type="text"
                      aria-label={`Konjugasi ${v.romaji}`}
                      value={drillInputs[v.id] || ''}
                      onChange={(e) =>
                        setDrillInputs((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheckSlotVerb(v);
                      }}
                      placeholder={`Ubah ke pola ${currentPattern.pattern}...`}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                    />
                    {res && (
                      <p
                        className={`text-xs mt-1 font-jp ${
                          res.isCorrect ? 'text-emerald-900 font-semibold' : 'text-red-900'
                        }`}
                      >
                        {res.isCorrect ? 'Benar:' : 'Koreksi:'} {res.targetJp} ({res.targetRomaji})
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleCheckSlotVerb(v)}
                      className="px-3 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                    >
                      Periksa
                    </button>
                    {res && (
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(res.targetJp, ttsRate)}
                        className="px-2.5 py-2 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                      >
                        Audio
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
