import React, { useState } from 'react';
import { KanjiItem, VocabItem } from '../utils/sprintParser';
import { SRS_STAGES, TARGET_612_REPETITIONS, UserItemSrsRecord } from '../utils/srsEngine';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

interface CompetencyAnalyticsViewProps {
  allVocab: VocabItem[];
  allKanji: KanjiItem[];
  srsMap: Record<string, UserItemSrsRecord>;
  totalRepetitions: number;
  ttsRate: number;
  hapticsEnabled: boolean;
  onStartLeechDrill: () => void;
  onStartJlptAssessment: () => void;
}

export const CompetencyAnalyticsView: React.FC<CompetencyAnalyticsViewProps> = ({
  allVocab,
  allKanji,
  srsMap,
  totalRepetitions,
  ttsRate,
  hapticsEnabled,
  onStartLeechDrill,
  onStartJlptAssessment,
}) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'MASTERED' | 'SOMETIMES_WRONG' | 'UNMEMORIZED' | 'LEECH'>('ALL');
  const [itemTypeFilter, setItemTypeFilter] = useState<'ALL' | 'VOCAB' | 'KANJI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const combinedItems = [
    ...allVocab.map((v) => ({
      keyId: v.id,
      type: 'VOCAB' as const,
      sprint: v.sprint,
      day: v.day,
      primaryJp: v.kanji !== '-' ? `${v.kanji} (${v.kana})` : v.kana,
      audioKana: v.kana,
      romaji: v.romaji,
      meaning: v.artiFull,
      record: srsMap[v.id],
    })),
    ...allKanji.map((k) => ({
      keyId: k.id,
      type: 'KANJI' as const,
      sprint: k.sprint,
      day: k.day,
      primaryJp: k.kanji,
      audioKana: k.examples[0]?.kana || k.kanji,
      romaji: `${k.onyomi} / ${k.kunyomi}`,
      meaning: k.artiFull,
      record: srsMap[k.id],
    })),
  ];

  const classifyItem = (rec?: UserItemSrsRecord): 'MASTERED' | 'SOMETIMES_WRONG' | 'UNMEMORIZED' => {
    if (!rec || rec.srs_stage === 0) return 'UNMEMORIZED';
    if (rec.is_leech || rec.wrong_count > 0) {
      if (rec.srs_stage < 5) return 'SOMETIMES_WRONG';
    }
    if (rec.srs_stage >= 3) return 'MASTERED';
    return 'UNMEMORIZED';
  };

  const vocabStats = {
    total: allVocab.length,
    mastered: allVocab.filter((v) => classifyItem(srsMap[v.id]) === 'MASTERED').length,
    sometimesWrong: allVocab.filter((v) => classifyItem(srsMap[v.id]) === 'SOMETIMES_WRONG').length,
    unmemorized: allVocab.filter((v) => classifyItem(srsMap[v.id]) === 'UNMEMORIZED').length,
  };

  const kanjiStats = {
    total: allKanji.length,
    mastered: allKanji.filter((k) => classifyItem(srsMap[k.id]) === 'MASTERED').length,
    sometimesWrong: allKanji.filter((k) => classifyItem(srsMap[k.id]) === 'SOMETIMES_WRONG').length,
    unmemorized: allKanji.filter((k) => classifyItem(srsMap[k.id]) === 'UNMEMORIZED').length,
  };

  const leechCount = combinedItems.filter((item) => item.record?.is_leech).length;

  const totalCorrectAnswers = Object.values(srsMap).reduce((acc, r) => acc + r.correct_count, 0);
  const totalWrongAnswers = Object.values(srsMap).reduce((acc, r) => acc + r.wrong_count, 0);
  const globalAccuracyPct =
    totalCorrectAnswers + totalWrongAnswers > 0
      ? Math.round((totalCorrectAnswers / (totalCorrectAnswers + totalWrongAnswers)) * 100)
      : 0;

  const activeItemsCount = Object.values(srsMap).filter((r) => r.srs_stage >= 1).length;
  const coverageRatio = Math.min(1, activeItemsCount / Math.max(1, combinedItems.length));
  const estimatedJlptScore = Math.round(coverageRatio * 120 + (globalAccuracyPct / 100) * 60);
  const estimatedJftScore = Math.round(coverageRatio * 170 + (globalAccuracyPct / 100) * 80);

  const filteredList = combinedItems.filter((item) => {
    if (itemTypeFilter !== 'ALL' && item.type !== itemTypeFilter) return false;
    const cat = classifyItem(item.record);
    if (filterCategory === 'MASTERED' && cat !== 'MASTERED') return false;
    if (filterCategory === 'SOMETIMES_WRONG' && cat !== 'SOMETIMES_WRONG') return false;
    if (filterCategory === 'UNMEMORIZED' && cat !== 'UNMEMORIZED') return false;
    if (filterCategory === 'LEECH' && !item.record?.is_leech) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.primaryJp.toLowerCase().includes(q) ||
        item.romaji.toLowerCase().includes(q) ||
        item.meaning.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-950">
            Evaluasi Skor & Analisis Ingatan
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Ringkasan kosakata dan kanji yang sudah diingat, terkadang salah, dan belum hapal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {leechCount > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('STEP', hapticsEnabled);
                onStartLeechDrill();
              }}
              className="px-3.5 py-2 text-xs font-medium border border-red-900 text-red-900 hover:bg-red-950/5 transition-colors"
            >
              Latih Kata Sulit ({leechCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('STEP', hapticsEnabled);
              onStartJlptAssessment();
            }}
            className="px-4 py-2 text-xs font-medium bg-blue-950 text-white hover:bg-blue-900 transition-colors"
          >
            Tes Simulasi JLPT/JFT (20 Soal)
          </button>
        </div>
      </div>

      {/* Navy / Dark Blue Analytical Scoreboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="border border-blue-950/20 bg-blue-950/[0.03] p-4">
          <p className="text-xs text-blue-950 font-semibold">
            Skor JLPT N5/N4
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-num text-blue-950 mt-1.5">
            {estimatedJlptScore} <span className="text-xs font-normal text-neutral-500">/ 180</span>
          </p>
          <p className="text-[11px] text-neutral-600 mt-1">
            Akurasi: {globalAccuracyPct}%
          </p>
        </div>

        <div className="border border-blue-950/20 bg-blue-950/[0.03] p-4">
          <p className="text-xs text-blue-950 font-semibold">
            Skor JFT-Basic
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-num text-blue-950 mt-1.5">
            {estimatedJftScore} <span className="text-xs font-normal text-neutral-500">/ 250</span>
          </p>
          <p className="text-[11px] text-neutral-600 mt-1">
            Standar lulus: 200 poin
          </p>
        </div>

        <div className="border border-blue-950/20 bg-blue-950/[0.03] p-4">
          <p className="text-xs text-blue-950 font-semibold">
            Repetisi 612x
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-num text-blue-950 mt-1.5">
            {totalRepetitions} <span className="text-xs font-normal text-neutral-500">/ {TARGET_612_REPETITIONS}</span>
          </p>
          <div className="w-full h-1 bg-neutral-200 mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-950"
              style={{
                width: `${Math.min(100, Math.round((totalRepetitions / TARGET_612_REPETITIONS) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="border border-blue-950/20 bg-blue-950/[0.03] p-4">
          <p className="text-xs text-blue-950 font-semibold">
            Kata Sulit (Leech)
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-num text-red-900 mt-1.5">
            {leechCount} <span className="text-xs font-normal text-neutral-500">Item</span>
          </p>
          <p className="text-[11px] text-neutral-600 mt-1">
            Salah &ge; 4 kali
          </p>
        </div>
      </div>

      {/* Breakdown Comparison: Vocabulary vs Kanji Retention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <h2 className="text-sm font-semibold text-neutral-950">
              Kosakata ({vocabStats.total} Kata)
            </h2>
            <span className="text-xs font-mono-num text-blue-950 font-semibold">
              {allVocab.filter((v) => (srsMap[v.id]?.srs_stage || 0) >= 1).length} Dipelajari
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 border border-emerald-900/30 bg-emerald-950/[0.03]">
              <p className="text-xs text-emerald-950 font-medium">Diingat</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-emerald-900 mt-1">
                {vocabStats.mastered}
              </p>
            </div>
            <div className="p-3 border border-red-900/30 bg-red-950/[0.03]">
              <p className="text-xs text-red-950 font-medium">Kadang Salah</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-red-900 mt-1">
                {vocabStats.sometimesWrong}
              </p>
            </div>
            <div className="p-3 border border-neutral-200 bg-neutral-50">
              <p className="text-xs text-neutral-700 font-medium">Belum Hapal</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-neutral-900 mt-1">
                {vocabStats.unmemorized}
              </p>
            </div>
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
            <h2 className="text-sm font-semibold text-neutral-950">
              Kanji ({kanjiStats.total} Karakter)
            </h2>
            <span className="text-xs font-mono-num text-blue-950 font-semibold">
              {allKanji.filter((k) => (srsMap[k.id]?.srs_stage || 0) >= 1).length} Dipelajari
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 border border-emerald-900/30 bg-emerald-950/[0.03]">
              <p className="text-xs text-emerald-950 font-medium">Diingat</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-emerald-900 mt-1">
                {kanjiStats.mastered}
              </p>
            </div>
            <div className="p-3 border border-red-900/30 bg-red-950/[0.03]">
              <p className="text-xs text-red-950 font-medium">Kadang Salah</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-red-900 mt-1">
                {kanjiStats.sometimesWrong}
              </p>
            </div>
            <div className="p-3 border border-neutral-200 bg-neutral-50">
              <p className="text-xs text-neutral-700 font-medium">Belum Hapal</p>
              <p className="text-xl sm:text-2xl font-bold font-mono-num text-neutral-900 mt-1">
                {kanjiStats.unmemorized}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filterable Item Audit Table (Without Raw IDs) */}
      <div className="border border-neutral-200 bg-white">
        <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `Semua (${combinedItems.length})` },
              { id: 'MASTERED', label: `Diingat (${vocabStats.mastered + kanjiStats.mastered})` },
              { id: 'SOMETIMES_WRONG', label: `Kadang Salah (${vocabStats.sometimesWrong + kanjiStats.sometimesWrong})` },
              { id: 'UNMEMORIZED', label: `Belum Hapal (${vocabStats.unmemorized + kanjiStats.unmemorized})` },
              { id: 'LEECH', label: `Kata Sulit (${leechCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('LIGHT', hapticsEnabled);
                  setFilterCategory(tab.id as typeof filterCategory);
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterCategory === tab.id
                    ? 'bg-blue-950 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter tipe item"
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value as typeof itemTypeFilter)}
              className="px-2.5 py-1.5 text-xs border border-neutral-300 bg-white text-neutral-900"
            >
              <option value="ALL">Kosakata & Kanji</option>
              <option value="VOCAB">Kosakata</option>
              <option value="KANJI">Kanji</option>
            </select>

            <input
              type="text"
              aria-label="Cari kosakata atau kanji"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata atau arti..."
              className="px-3 py-1.5 text-xs border border-neutral-300 focus:border-neutral-950 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px] overflow-y-auto gpu-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 text-neutral-700">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Kata / Kanji</th>
                <th className="py-2.5 px-4 font-semibold">Bacaan</th>
                <th className="py-2.5 px-4 font-semibold">Arti Indonesia</th>
                <th className="py-2.5 px-4 font-semibold">Status Ingatan</th>
                <th className="py-2.5 px-4 font-semibold text-right">Riwayat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredList.slice(0, 100).map((item) => {
                const cat = classifyItem(item.record);
                const stage = item.record?.srs_stage || 0;
                return (
                  <tr key={item.keyId} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-4 font-jp font-bold text-neutral-950">
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(item.audioKana, ttsRate)}
                        className="hover:underline text-left"
                      >
                        {item.primaryJp}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-mono-num text-neutral-600">{item.romaji}</td>
                    <td className="py-2.5 px-4 text-neutral-800">{item.meaning}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {cat === 'MASTERED' && (
                        <span className="text-emerald-900 font-semibold">
                          Diingat (Stage {stage})
                        </span>
                      )}
                      {cat === 'SOMETIMES_WRONG' && (
                        <span className="text-red-900 font-semibold">
                          Kadang Salah {item.record?.is_leech ? '(Sulit)' : `(Stage ${stage})`}
                        </span>
                      )}
                      {cat === 'UNMEMORIZED' && (
                        <span className="text-neutral-500">
                          Belum Hapal ({SRS_STAGES[stage].labelId.split(' ')[0]})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num whitespace-nowrap">
                      <span className="text-emerald-900">{item.record?.correct_count || 0}B</span>
                      {' / '}
                      <span className="text-red-900">{item.record?.wrong_count || 0}S</span>
                      {' · '}
                      <span className="text-blue-950">{item.record?.total_reps || 0}x</span>
                    </td>
                  </tr>
                );
              })}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    Tidak ada item pada kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
