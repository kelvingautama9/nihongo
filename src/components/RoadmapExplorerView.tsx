import React, { useState } from 'react';
import { MASTER_ROADMAP_26_SPRINTS } from '../data/roadmapAndKana';
import { KanjiItem, VocabItem } from '../utils/sprintParser';
import { SRS_STAGES, UserItemSrsRecord } from '../utils/srsEngine';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

interface RoadmapExplorerViewProps {
  allVocab: VocabItem[];
  allKanji: KanjiItem[];
  srsMap: Record<string, UserItemSrsRecord>;
  currentSprint: number;
  currentDay: number;
  ttsRate: number;
  hapticsEnabled: boolean;
  onSelectSprintAndDay: (sprint: number, day: number) => void;
  onStartDayDrill: (sprint: number, day: number) => void;
}

export const RoadmapExplorerView: React.FC<RoadmapExplorerViewProps> = ({
  allVocab,
  allKanji,
  srsMap,
  currentSprint,
  currentDay,
  ttsRate,
  hapticsEnabled,
  onSelectSprintAndDay,
  onStartDayDrill,
}) => {
  const [selectedPhase, setSelectedPhase] = useState<0 | 1 | 2 | 3>(0);
  const [inspectSprint, setInspectSprint] = useState<number>(currentSprint <= 3 ? currentSprint : 1);
  const [inspectDay, setInspectDay] = useState<number>(currentDay);

  const visibleSprints = MASTER_ROADMAP_26_SPRINTS.filter((s) =>
    selectedPhase === 0 ? true : s.phase === selectedPhase
  );

  const dayVocab = allVocab.filter(
    (v) => v.sprint === inspectSprint && v.dayNumber === inspectDay
  );
  const dayKanji = allKanji.filter(
    (k) => k.sprint === inspectSprint && k.dayNumber === inspectDay
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-950">
            Roadmap 26 Sprint (Minna no Nihongo Bab 1–50)
          </h1>
          <p className="text-xs text-neutral-600 mt-1">
            Pilih Sprint dan Hari untuk melihat daftar kosakata serta kanji harian.
          </p>
        </div>

        {/* Phase Filter */}
        <div className="flex flex-wrap items-center gap-1 bg-neutral-100 p-1">
          {[
            { id: 0, label: 'Semua' },
            { id: 1, label: 'Fase 1 (N5)' },
            { id: 2, label: 'Fase 2 (N4)' },
            { id: 3, label: 'Fase 3 (N3)' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                triggerHapticFeedback('LIGHT', hapticsEnabled);
                setSelectedPhase(p.id as 0 | 1 | 2 | 3);
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPhase === p.id
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:text-neutral-950'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sprint & Day Inspector */}
      <div className="border border-neutral-200 bg-white p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-950">
              Sprint {inspectSprint} · Hari {inspectDay}
            </h2>
            <p className="text-xs text-neutral-500">
              8 Kosakata & 2 Kanji
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-neutral-300 bg-neutral-50 p-0.5">
              {[1, 2, 3].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => {
                    triggerHapticFeedback('LIGHT', hapticsEnabled);
                    setInspectSprint(sp);
                  }}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    inspectSprint === sp
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`}
                >
                  Sprint {sp}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('STEP', hapticsEnabled);
                onSelectSprintAndDay(inspectSprint, inspectDay);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
            >
              Jadikan Hari Aktif
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback('STEP', hapticsEnabled);
                onStartDayDrill(inspectSprint, inspectDay);
              }}
              className="px-3.5 py-1.5 text-xs font-medium bg-neutral-950 text-white hover:bg-neutral-800"
            >
              Latih Hari Ini
            </button>
          </div>
        </div>

        {/* 14-Day Selector Strip */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
          {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => {
            const dVocab = allVocab.filter(
              (v) => v.sprint === inspectSprint && v.dayNumber === d
            );
            const learnedInDay = dVocab.filter((v) => (srsMap[v.id]?.srs_stage || 0) >= 1).length;
            const isSelected = inspectDay === d;

            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  triggerHapticFeedback('LIGHT', hapticsEnabled);
                  setInspectDay(d);
                }}
                className={`p-2 border text-center transition-colors ${
                  isSelected
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : learnedInDay > 0
                    ? 'border-blue-900/40 bg-blue-950/[0.03] text-neutral-900'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                }`}
              >
                <div className="text-xs font-mono-num font-semibold">
                  H{d}
                </div>
                <div className="text-[10px] font-mono-num opacity-75 mt-0.5">
                  {learnedInDay}/8
                </div>
              </button>
            );
          })}
        </div>

        {/* Day Content Tables: 8 Vocab + 2 Kanji (No raw ID column) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
                  <th className="py-2.5 px-3 font-semibold">Kosakata</th>
                  <th className="py-2.5 px-3 font-semibold">Arti Indonesia</th>
                  <th className="py-2.5 px-3 font-semibold">Level SRS</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Audio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {dayVocab.map((v) => {
                  const st = srsMap[v.id]?.srs_stage || 0;
                  return (
                    <tr key={v.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-jp">
                        <span className="font-bold text-neutral-950">
                          {v.kanji !== '-' ? v.kanji : v.kana}
                        </span>
                        {v.kanji !== '-' && (
                          <span className="text-neutral-500 ml-1">({v.kana})</span>
                        )}
                        <span className="block text-[11px] font-mono-num text-neutral-500">
                          {v.romaji}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-800">{v.artiFull}</td>
                      <td className="py-2.5 px-3 font-mono-num text-blue-950">
                        Stage {st}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => speakJapaneseText(v.kana, ttsRate)}
                          className="px-2 py-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                        >
                          Dengar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2 Daily Kanji */}
          <div className="border border-neutral-200 p-4 space-y-3 bg-neutral-50/50">
            <h3 className="text-xs font-semibold text-neutral-700">
              Kanji Hari {inspectDay}
            </h3>
            <div className="space-y-3">
              {dayKanji.map((k) => {
                const st = srsMap[k.id]?.srs_stage || 0;
                return (
                  <div key={k.id} className="p-3.5 border border-neutral-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-900">{k.artiFull}</span>
                      <span className="text-xs font-mono-num text-blue-950">
                        Stage {st}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="text-3xl font-bold font-jp text-neutral-950">{k.kanji}</span>
                      <div className="text-xs text-neutral-600 space-y-0.5">
                        <p>On: <span className="font-jp text-neutral-900">{k.onyomi}</span></p>
                        <p>Kun: <span className="font-jp text-neutral-900">{k.kunyomi}</span></p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-neutral-100 space-y-1">
                      {k.examples.map((ex) => (
                        <div key={ex.kanjiWord} className="flex items-center justify-between text-xs gap-2">
                          <span className="font-jp text-neutral-800">
                            {ex.kanjiWord} ({ex.kana}) = {ex.meaningId}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakJapaneseText(ex.kana, ttsRate)}
                            className="px-1.5 py-0.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-100 shrink-0"
                          >
                            Audio
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 26-Sprint Master Table */}
      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-700">
              <th className="py-3 px-4 font-semibold">Sprint</th>
              <th className="py-3 px-4 font-semibold">Minggu</th>
              <th className="py-3 px-4 font-semibold">Bab MNN</th>
              <th className="py-3 px-4 font-semibold">Topik Kosakata</th>
              <th className="py-3 px-4 font-semibold">Topik Kanji</th>
              <th className="py-3 px-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {visibleSprints.map((sp) => {
              const sprintItems = Object.values(srsMap).filter((r) => r.sprint === sp.sprint);
              const learnedCount = sprintItems.filter((r) => r.srs_stage >= 1).length;

              return (
                <tr key={sp.sprint} className="hover:bg-neutral-50">
                  <td className="py-3 px-4 font-mono-num font-semibold text-neutral-950 whitespace-nowrap">
                    Sprint {String(sp.sprint).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">{sp.weeks}</td>
                  <td className="py-3 px-4 font-medium text-neutral-900 whitespace-nowrap">
                    {sp.mnnChapters}
                  </td>
                  <td className="py-3 px-4 text-neutral-700">{sp.focusVocab}</td>
                  <td className="py-3 px-4 text-neutral-600">{sp.focusKanji}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-mono-num">
                    {sp.isLoaded ? (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticFeedback('LIGHT', hapticsEnabled);
                          setInspectSprint(sp.sprint);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 border border-neutral-950 bg-neutral-950 text-white hover:bg-neutral-800"
                      >
                        Buka ({learnedCount}/140)
                      </button>
                    ) : (
                      <span className="text-neutral-400">Terjadwal</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
