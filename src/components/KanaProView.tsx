import React, { useState } from 'react';
import { KANA_PRO_DATA, KanaChar } from '../data/roadmapAndKana';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

interface KanaProViewProps {
  ttsRate: number;
  hapticsEnabled: boolean;
  onRecordKanaRep: (isCorrect: boolean) => void;
}

export const KanaProView: React.FC<KanaProViewProps> = ({
  ttsRate,
  hapticsEnabled,
  onRecordKanaRep,
}) => {
  const [scriptType, setScriptType] = useState<'HIRAGANA' | 'KATAKANA'>('HIRAGANA');
  const [groupFilter, setGroupFilter] = useState<'ALL' | 'GOJUUON' | 'DAKUTEN' | 'YOON'>('ALL');
  const [isDrillActive, setIsDrillActive] = useState(false);

  const [drillIndex, setDrillIndex] = useState(0);
  const [typedRomaji, setTypedRomaji] = useState('');
  const [drillScore, setDrillScore] = useState({ correct: 0, total: 0 });
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    expected: string;
    char: string;
  } | null>(null);

  const filteredKana = KANA_PRO_DATA.filter((k) =>
    groupFilter === 'ALL' ? true : k.group === groupFilter
  );

  const currentDrillChar: KanaChar | undefined = filteredKana[drillIndex % filteredKana.length];

  const handleStartDrill = () => {
    triggerHapticFeedback('STEP', hapticsEnabled);
    setDrillIndex(0);
    setDrillScore({ correct: 0, total: 0 });
    setLastResult(null);
    setTypedRomaji('');
    setIsDrillActive(true);
  };

  const handleCheckKanaDrill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDrillChar || !typedRomaji.trim()) return;

    const clean = typedRomaji.toLowerCase().trim();
    const isCorrect = clean === currentDrillChar.romaji;
    const displayChar =
      scriptType === 'HIRAGANA' ? currentDrillChar.hiragana : currentDrillChar.katakana;

    triggerHapticFeedback(isCorrect ? 'CORRECT' : 'WRONG', hapticsEnabled);
    speakJapaneseText(currentDrillChar.hiragana, ttsRate);
    onRecordKanaRep(isCorrect);

    setDrillScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setLastResult({
      correct: isCorrect,
      expected: currentDrillChar.romaji,
      char: displayChar,
    });

    setTypedRomaji('');
    setDrillIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Clean Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-950">
            {scriptType === 'HIRAGANA' ? 'Hiragana' : 'Katakana'} ({filteredKana.length} Huruf)
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Klik huruf untuk mendengar suara atau gunakan Latihan Cepat untuk tes baca.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Script Toggle */}
          <div className="flex items-center border border-neutral-300 bg-neutral-50 p-0.5">
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                setScriptType('HIRAGANA');
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                scriptType === 'HIRAGANA'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              Hiragana (あ)
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                setScriptType('KATAKANA');
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                scriptType === 'KATAKANA'
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-700 hover:text-neutral-950'
              }`}
            >
              Katakana (ア)
            </button>
          </div>

          {/* Group Filter */}
          <div className="flex flex-wrap items-center border border-neutral-300 bg-neutral-50 p-0.5">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'GOJUUON', label: 'Dasar (46)' },
              { id: 'DAKUTEN', label: 'Tenten (23)' },
              { id: 'YOON', label: 'Gabungan (9)' },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('LIGHT', hapticsEnabled);
                  setGroupFilter(g.id as typeof groupFilter);
                }}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  groupFilter === g.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => (isDrillActive ? setIsDrillActive(false) : handleStartDrill())}
            className="px-4 py-2 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors whitespace-nowrap"
          >
            {isDrillActive ? 'Tutup Latihan' : 'Latihan Cepat'}
          </button>
        </div>
      </div>

      {/* Active Speed Drill Box */}
      {isDrillActive && currentDrillChar && (
        <div className="border border-neutral-950 bg-neutral-50 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3 mb-4">
            <h2 className="text-sm font-semibold text-neutral-950">
              Ketik bacaan Romaji lalu tekan Enter
            </h2>
            <div className="text-xs font-mono-num text-blue-950 font-semibold">
              Skor: {drillScore.correct} / {drillScore.total}{' '}
              {drillScore.total > 0
                ? `(${Math.round((drillScore.correct / drillScore.total) * 100)}%)`
                : ''}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="border border-neutral-200 bg-white py-6 text-center">
              <p className="text-5xl font-bold font-jp text-neutral-950">
                {scriptType === 'HIRAGANA'
                  ? currentDrillChar.hiragana
                  : currentDrillChar.katakana}
              </p>
              <p className="text-xs font-mono-num text-neutral-400 mt-1.5">
                Baris {currentDrillChar.row}
              </p>
            </div>

            <form onSubmit={handleCheckKanaDrill} className="md:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="kana-drill-input"
                  type="text"
                  value={typedRomaji}
                  onChange={(e) => setTypedRomaji(e.target.value)}
                  placeholder="Ketik romaji (contoh: ka, shi, tsu)..."
                  className="flex-1 px-4 py-2.5 text-sm border border-neutral-300 bg-white focus:border-neutral-950 focus:outline-none font-mono-num"
                  autoFocus
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                >
                  Cek
                </button>
              </div>

              {lastResult && (
                <div
                  className={`p-3 border text-xs flex items-center justify-between ${
                    lastResult.correct
                      ? 'border-emerald-900 bg-emerald-950/5 text-emerald-950'
                      : 'border-red-900 bg-red-950/5 text-red-950'
                  }`}
                >
                  <span>
                    {lastResult.correct ? 'Benar:' : 'Salah:'}{' '}
                    <strong className="font-jp">{lastResult.char}</strong> ={' '}
                    <strong className="font-mono-num">{lastResult.expected}</strong>
                  </span>
                  <span className="font-mono-num">
                    {lastResult.correct ? '+1 Repetisi' : 'Ulangi lagi'}
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Kana Reference Matrix Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {filteredKana.map((k) => {
          const primaryChar = scriptType === 'HIRAGANA' ? k.hiragana : k.katakana;
          const secondaryChar = scriptType === 'HIRAGANA' ? k.katakana : k.hiragana;

          return (
            <button
              key={`${k.hiragana}-${k.group}`}
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                speakJapaneseText(k.hiragana, ttsRate);
              }}
              aria-label={`Huruf ${primaryChar} dibaca ${k.romaji}`}
              className="p-2.5 border border-neutral-200 bg-white hover:border-neutral-950 transition-colors text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full text-[11px] text-neutral-400 font-mono-num">
                <span>{k.romaji}</span>
                <span className="font-jp">{secondaryChar}</span>
              </div>
              <div className="text-2xl font-bold font-jp text-neutral-950 mt-1.5 text-center">
                {primaryChar}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
