import React, { useState } from 'react';
import { SWISS_ARMY_PATTERNS } from '../utils/speakingBridge';
import { speakJapaneseText, triggerHapticFeedback } from '../utils/hapticsAndTts';

interface GrammarCheatSheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ttsRate: number;
  hapticsEnabled: boolean;
}

export const GrammarCheatSheetDrawer: React.FC<GrammarCheatSheetDrawerProps> = ({
  isOpen,
  onClose,
  ttsRate,
  hapticsEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<'VERBS' | 'ADJECTIVES' | 'PARTICLES' | 'PATTERNS' | 'SPOKEN'>('VERBS');

  if (!isOpen) return null;

  const handleTabChange = (tab: typeof activeTab) => {
    triggerHapticFeedback('LIGHT', hapticsEnabled);
    setActiveTab(tab);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-950/30 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Ringkasan Tata Bahasa & Konjugasi"
    >
      <div className="w-full max-w-3xl bg-white h-full border-l border-neutral-200 flex flex-col gpu-scroll">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Grammar Cheat Sheet & Jembatan Bicara
            </h2>
            <p className="text-xs text-neutral-500">
              Referensi cepat konjugasi kata kerja, kata sifat, partikel inti, dan 15 pola bicara tanpa mereset kuis
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHapticFeedback('LIGHT', hapticsEnabled);
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            Tutup Referensi
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="px-6 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'VERBS', label: '1. Konjugasi Kata Kerja' },
            { id: 'ADJECTIVES', label: '2. Kata Sifat (-i & -na)' },
            { id: 'PARTICLES', label: '3. Peta Partikel Inti' },
            { id: 'PATTERNS', label: '4. 15 Pola Kalimat Aktif' },
            { id: 'SPOKEN', label: '5. Kontraksi Lisan & Aizuchi' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-neutral-950 text-white'
                  : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 gpu-scroll">
          {activeTab === 'VERBS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Matriks 5 Bentuk Wajib Bicara (85% Percakapan Harian)
                </h3>
                <div className="border border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-700">
                        <th className="py-2.5 px-3 font-semibold">Bentuk</th>
                        <th className="py-2.5 px-3 font-semibold">Fungsi Utama</th>
                        <th className="py-2.5 px-3 font-semibold">Grup 1 (Godan)</th>
                        <th className="py-2.5 px-3 font-semibold">Grup 2 (Ichidan)</th>
                        <th className="py-2.5 px-3 font-semibold">Grup 3 (Irregular)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="py-2.5 px-3 font-medium">1. Masu (Sopan)</td>
                        <td className="py-2.5 px-3 text-neutral-600">Standar kantor / orang baru</td>
                        <td className="py-2.5 px-3 font-jp">飲みます (nomimasu)</td>
                        <td className="py-2.5 px-3 font-jp">食べます (tabemasu)</td>
                        <td className="py-2.5 px-3 font-jp">します / 来ます (kimasu)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">2. Kamus (Futsukei)</td>
                        <td className="py-2.5 px-3 text-neutral-600">Kasual, sebelum koto / tsumori</td>
                        <td className="py-2.5 px-3 font-jp">vokal i → u: 飲む (nomu)</td>
                        <td className="py-2.5 px-3 font-jp">masu → る: 食べる (taberu)</td>
                        <td className="py-2.5 px-3 font-jp">する (suru) / 来る (kuru)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">3. Bentuk Te</td>
                        <td className="py-2.5 px-3 text-neutral-600">Sambung kalimat, ~te kudasai, ~te iru</td>
                        <td className="py-2.5 px-3 font-jp">飲んで (nonde)</td>
                        <td className="py-2.5 px-3 font-jp">masu → て: 食べて (tabete)</td>
                        <td className="py-2.5 px-3 font-jp">して (shite) / 来て (kite)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">4. Bentuk Nai</td>
                        <td className="py-2.5 px-3 text-neutral-600">Negatif kasual, ~naide, ~nakereba</td>
                        <td className="py-2.5 px-3 font-jp">vokal i → a + ない: 飲まない</td>
                        <td className="py-2.5 px-3 font-jp">masu → ない: 食べない</td>
                        <td className="py-2.5 px-3 font-jp">しない (shinai) / 来ない (konai)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-medium">5. Bentuk Ta</td>
                        <td className="py-2.5 px-3 text-neutral-600">Lampau kasual, pengalaman, saran</td>
                        <td className="py-2.5 px-3 font-jp">Te-form e → a: 飲んだ (nonda)</td>
                        <td className="py-2.5 px-3 font-jp">masu → た: 食べた (tabeta)</td>
                        <td className="py-2.5 px-3 font-jp">した (shita) / 来た (kita)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Tabel Kilat Bentuk Te & Ta (VERB_G1 — Wajib Hafal)
                </h3>
                <div className="border border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200 text-neutral-700">
                        <th className="py-2 px-3 font-semibold">Akhiran Sebelum ~masu</th>
                        <th className="py-2 px-3 font-semibold">Perubahan</th>
                        <th className="py-2 px-3 font-semibold">Contoh (Masu → Te → Ta)</th>
                        <th className="py-2 px-3 font-semibold">Romaji</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="py-2 px-3 font-mono-num">i, chi, ri</td>
                        <td className="py-2 px-3 font-semibold font-jp">って (tte)</td>
                        <td className="py-2 px-3 font-jp">会います → 会って → 会った</td>
                        <td className="py-2 px-3 text-neutral-600">aimasu → atte → atta</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono-num">mi, bi, ni</td>
                        <td className="py-2 px-3 font-semibold font-jp">んで (nde)</td>
                        <td className="py-2 px-3 font-jp">飲みます → 飲んで → 飲んだ</td>
                        <td className="py-2 px-3 text-neutral-600">nomimasu → nonde → nonda</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono-num">ki</td>
                        <td className="py-2 px-3 font-semibold font-jp">いて (ite)</td>
                        <td className="py-2 px-3 font-jp">書きます → 書いて → 書いた</td>
                        <td className="py-2 px-3 text-neutral-600">kakimasu → kaite → kaita</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono-num">gi</td>
                        <td className="py-2 px-3 font-semibold font-jp">いで (ide)</td>
                        <td className="py-2 px-3 font-jp">泳ぎます → 泳いで → 泳いだ</td>
                        <td className="py-2 px-3 text-neutral-600">oyogimasu → oyoide → oyoida</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono-num">shi</td>
                        <td className="py-2 px-3 font-semibold font-jp">して (shite)</td>
                        <td className="py-2 px-3 font-jp">話します → 話して → 話した</td>
                        <td className="py-2 px-3 text-neutral-600">hanashimasu → hanashite → hanashita</td>
                      </tr>
                      <tr className="bg-neutral-50">
                        <td className="py-2 px-3 font-medium">Pengecualian Tunggal</td>
                        <td className="py-2 px-3 font-semibold font-jp">って (tte)</td>
                        <td className="py-2 px-3 font-jp">行きます → 行って → 行った</td>
                        <td className="py-2 px-3 text-neutral-600">ikimasu → itte → itta</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-600 mt-2">
                  Catatan Kritis: Kata kerja ある (aru / ada) bentuk negatif kasualnya adalah ない (nai), bukan aranai.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ADJECTIVES' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Kata Sifat -i (ADJ_I) — Contoh: 高い (takai = mahal/tinggi)
                </h3>
                <div className="border border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200">
                        <th className="py-2 px-3 font-semibold">Kondisi</th>
                        <th className="py-2 px-3 font-semibold">Bentuk Sopan (Polite)</th>
                        <th className="py-2 px-3 font-semibold">Bentuk Kasual (Casual)</th>
                        <th className="py-2 px-3 font-semibold">Arti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="py-2 px-3 font-medium">Positif</td>
                        <td className="py-2 px-3 font-jp">高いです (takai desu)</td>
                        <td className="py-2 px-3 font-jp">高い (takai)</td>
                        <td className="py-2 px-3 text-neutral-600">Mahal</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Negatif</td>
                        <td className="py-2 px-3 font-jp">高くないです (takakunai desu)</td>
                        <td className="py-2 px-3 font-jp">高くない (takakunai)</td>
                        <td className="py-2 px-3 text-neutral-600">Tidak mahal</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Lampau (+)</td>
                        <td className="py-2 px-3 font-jp">高かったです (takakatta desu)</td>
                        <td className="py-2 px-3 font-jp">高かった (takakatta)</td>
                        <td className="py-2 px-3 text-neutral-600">Tadi/dulu mahal</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Lampau (-)</td>
                        <td className="py-2 px-3 font-jp">高くなかったです (takakunakatta desu)</td>
                        <td className="py-2 px-3 font-jp">高くなかった (takakunakatta)</td>
                        <td className="py-2 px-3 text-neutral-600">Tadi/dulu tidak mahal</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-600 mt-2">
                  Pengecualian ADJ_I: いい (ii = bagus) berubah memakai akar よ (yo): よくない, よかった, よくなかった.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Kata Sifat -na (ADJ_NA) & Kata Benda (NOUN) — Contoh: 暇 (hima = senggang)
                </h3>
                <div className="border border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200">
                        <th className="py-2 px-3 font-semibold">Kondisi</th>
                        <th className="py-2 px-3 font-semibold">Bentuk Sopan (Polite)</th>
                        <th className="py-2 px-3 font-semibold">Bentuk Kasual (Casual)</th>
                        <th className="py-2 px-3 font-semibold">Arti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="py-2 px-3 font-medium">Positif</td>
                        <td className="py-2 px-3 font-jp">暇です (hima desu)</td>
                        <td className="py-2 px-3 font-jp">暇だ (hima da)</td>
                        <td className="py-2 px-3 text-neutral-600">Senggang</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Negatif</td>
                        <td className="py-2 px-3 font-jp">暇じゃないです (hima janai desu)</td>
                        <td className="py-2 px-3 font-jp">暇じゃない (hima janai)</td>
                        <td className="py-2 px-3 text-neutral-600">Tidak senggang</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Lampau (+)</td>
                        <td className="py-2 px-3 font-jp">暇でした (hima deshita)</td>
                        <td className="py-2 px-3 font-jp">暇だった (hima datta)</td>
                        <td className="py-2 px-3 text-neutral-600">Tadi senggang</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium">Lampau (-)</td>
                        <td className="py-2 px-3 font-jp">暇じゃなかったです (hima janakatta desu)</td>
                        <td className="py-2 px-3 font-jp">暇じゃなかった (hima janakatta)</td>
                        <td className="py-2 px-3 text-neutral-600">Tadi tidak senggang</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PARTICLES' && (
            <div className="border border-neutral-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-100 border-b border-neutral-200">
                    <th className="py-2.5 px-3 font-semibold">Partikel</th>
                    <th className="py-2.5 px-3 font-semibold">Fungsi Operasional</th>
                    <th className="py-2.5 px-3 font-semibold">Contoh Kalimat</th>
                    <th className="py-2.5 px-3 font-semibold">Arti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {[
                    { p: 'は (wa)', f: 'Penanda topik pembicaraan', ex: '私は会社員です。', m: 'Watashi wa kaishain desu. (Saya karyawan.)' },
                    { p: 'が (ga)', f: 'Subjek fokus baru; objek suka/bisa/ada', ex: '日本語が分かります。', m: 'Nihongo ga wakarimasu. (Paham bahasa Jepang.)' },
                    { p: 'を (o)', f: 'Objek langsung yang dikenai aksi', ex: 'コーヒーを飲みます。', m: 'Koohii o nomimasu. (Minum kopi.)' },
                    { p: 'に (ni)', f: 'Tujuan arah, waktu spesifik, lokasi diam, penerima', ex: '７時に駅に行きます。', m: 'Shichiji ni eki ni ikimasu. (Jam 7 ke stasiun.)' },
                    { p: 'で (de)', f: 'Lokasi aktivitas aktif, alat/kendaraan, bahasa', ex: '電車で会社へ行きます。', m: 'Densha de kaisha e ikimasu. (Ke kantor naik kereta.)' },
                    { p: 'の (no)', f: 'Kepemilikan / penghubung 2 kata benda', ex: '私のスマホ', m: 'Watashi no sumaho (HP milik saya)' },
                    { p: 'と (to)', f: 'Dan (daftar lengkap) / Bersama orang', ex: '友達と食べます。', m: 'Tomodachi to tabemasu. (Makan bersama teman.)' },
                    { p: 'も (mo)', f: 'Juga (menggantikan wa, ga, o)', ex: 'これもください。', m: 'Kore mo kudasai. (Minta yang ini juga.)' },
                    { p: 'から / まで', f: 'Dari / Sampai; kara di akhir klausa = Karena', ex: '９時から５時まで働きます。', m: 'Kuji kara goji made hatarakimasu.' },
                    { p: 'よ / ね', f: 'Akhir kalimat: yo (info baru), ne (persetujuan)', ex: '今日は暑いですね。', m: 'Kyou wa atsui desu ne. (Hari ini panas ya.)' },
                  ].map((row) => (
                    <tr key={row.p}>
                      <td className="py-2.5 px-3 font-semibold font-jp whitespace-nowrap">{row.p}</td>
                      <td className="py-2.5 px-3 text-neutral-700">{row.f}</td>
                      <td className="py-2.5 px-3 font-jp">{row.ex}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{row.m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'PATTERNS' && (
            <div className="space-y-3">
              {SWISS_ARMY_PATTERNS.map((pat) => (
                <div
                  key={pat.id}
                  className="p-3.5 border border-neutral-200 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-mono-num">#{String(pat.id).padStart(2, '0')}</span>
                      <span>·</span>
                      <span className="font-semibold text-neutral-950 font-jp">{pat.pattern}</span>
                      <span>·</span>
                      <span>{pat.meaning}</span>
                    </div>
                    <p className="text-sm font-jp text-neutral-900">
                      {pat.exampleJp}{' '}
                      <span className="text-xs text-neutral-500 font-sans">
                        ({pat.exampleRomaji} — {pat.exampleId})
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('LIGHT', hapticsEnabled);
                      speakJapaneseText(pat.exampleJp, ttsRate);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-800 hover:bg-neutral-100 shrink-0"
                  >
                    Putar Audio
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'SPOKEN' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Kontraksi Lisan Penutur Asli (Buku Teks vs Percakapan Nyata)
                </h3>
                <div className="border border-neutral-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-200">
                        <th className="py-2 px-3 font-semibold">Bentuk Buku Teks</th>
                        <th className="py-2 px-3 font-semibold">Bentuk Lisan</th>
                        <th className="py-2 px-3 font-semibold">Contoh & Arti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      <tr>
                        <td className="py-2 px-3 font-jp">~て いる (~te iru)</td>
                        <td className="py-2 px-3 font-semibold font-jp">~てる (~teru)</td>
                        <td className="py-2 px-3 font-jp">何してるの？ (Nani shiteru no? — Lagi ngapain?)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-jp">~て しまう (~te shimau)</td>
                        <td className="py-2 px-3 font-semibold font-jp">~ちゃう (~chau)</td>
                        <td className="py-2 px-3 font-jp">忘れちゃった！ (Wasurechatta! — Aduh kelupaan!)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-jp">~なければ ならない</td>
                        <td className="py-2 px-3 font-semibold font-jp">~なきゃ (~nakya)</td>
                        <td className="py-2 px-3 font-jp">もう行かなきゃ。 (Mou ikanakya. — Harus pergi sekarang.)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-jp">~て おく (~te oku)</td>
                        <td className="py-2 px-3 font-semibold font-jp">~とく (~toku)</td>
                        <td className="py-2 px-3 font-jp">買っとくね。 (Kattoku ne. — Nanti kubelikan ya.)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-jp">~らない (ra/ri/ru)</td>
                        <td className="py-2 px-3 font-semibold font-jp">~んない (~nnai)</td>
                        <td className="py-2 px-3 font-jp">分かんない。 (Wakannai. — Nggak tahu/paham.)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-neutral-950 mb-2">
                  Aizuchi (Respon Pendengar) & Penyelamat Percakapan
                </h3>
                <div className="border border-neutral-200 divide-y divide-neutral-200 text-xs">
                  {[
                    { jp: 'そうですね', rom: 'Sou desu ne', use: 'Setuju dengan lawan bicara ("Betul juga ya")' },
                    { jp: 'なるほど', rom: 'Naruhodo', use: '"Oh begitu, masuk akal" (gunakan ke teman/setara)' },
                    { jp: 'たしかに', rom: 'Tashika ni', use: '"Benar juga sih" (sangat sering dipakai harian)' },
                    { jp: 'もう一度お願いします', rom: 'Mou ichido onegaishimasu', use: '"Tolong ulangi sekali lagi" (Penyelamat)' },
                    { jp: 'ゆっくり話してください', rom: 'Yukkuri hanashite kudasai', use: '"Tolong bicara lebih pelan" (Penyelamat)' },
                  ].map((item) => (
                    <div key={item.jp} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold font-jp text-neutral-950">{item.jp}</span>{' '}
                        <span className="text-neutral-500">({item.rom})</span> —{' '}
                        <span className="text-neutral-700">{item.use}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapaneseText(item.jp, ttsRate)}
                        className="px-2 py-1 border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                      >
                        Dengar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
