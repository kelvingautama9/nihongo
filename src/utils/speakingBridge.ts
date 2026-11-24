/**
 * Operational Japanese Conjugation & Speaking Bridge Engine
 * Based on 02_SPEAKING_BRIDGE.md
 */

import { WordClassEnum } from './sprintParser';

export interface VerbConjugationSet {
  masuForm: string;
  masuRomaji: string;
  dictForm: string;
  dictRomaji: string;
  teForm: string;
  teRomaji: string;
  naiForm: string;
  naiRomaji: string;
  taForm: string;
  taRomaji: string;
  taiForm: string;
  taiRomaji: string;
}

/**
 * Conjugates polite ~masu verbs (VERB_G1, VERB_G2, VERB_G3) into the 5 core speaking forms + ~tai desu
 */
export function conjugateVerbFromMasu(
  kanjiOrKana: string,
  kana: string,
  romaji: string,
  group: WordClassEnum
): VerbConjugationSet {
  const displayBase = kanjiOrKana !== '-' ? kanjiOrKana : kana;
  const stemDisplay = displayBase.replace(/ます$/, '');
  const stemKana = kana.replace(/ます$/, '');
  const stemRomaji = romaji.replace(/\s*masu$/, '');

  const taiForm = `${stemDisplay}たいです`;
  const taiRomaji = `${stemRomaji}tai desu`;

  if (group === 'VERB_G3') {
    if (kana === 'きます' || displayBase.endsWith('来ます')) {
      return {
        masuForm: displayBase,
        masuRomaji: romaji,
        dictForm: displayBase.replace(/ます$/, 'る'),
        dictRomaji: romaji.replace(/kimasu$/, 'kuru'),
        teForm: `${stemDisplay}て`,
        teRomaji: romaji.replace(/kimasu$/, 'kite'),
        naiForm: displayBase === '来ます' ? '来ない' : 'こない',
        naiRomaji: romaji.replace(/kimasu$/, 'konai'),
        taForm: `${stemDisplay}た`,
        taRomaji: romaji.replace(/kimasu$/, 'kita'),
        taiForm,
        taiRomaji,
      };
    }
    // shimasu / ~shimasu
    const prefixDisplay = displayBase.replace(/します$/, '');
    const prefixRomaji = romaji.replace(/shimasu$/, '');
    return {
      masuForm: displayBase,
      masuRomaji: romaji,
      dictForm: `${prefixDisplay}する`,
      dictRomaji: `${prefixRomaji}suru`,
      teForm: `${prefixDisplay}して`,
      teRomaji: `${prefixRomaji}shite`,
      naiForm: `${prefixDisplay}しない`,
      naiRomaji: `${prefixRomaji}shinai`,
      taForm: `${prefixDisplay}した`,
      taRomaji: `${prefixRomaji}shita`,
      taiForm,
      taiRomaji,
    };
  }

  if (group === 'VERB_G2') {
    return {
      masuForm: displayBase,
      masuRomaji: romaji,
      dictForm: `${stemDisplay}る`,
      dictRomaji: `${stemRomaji}ru`,
      teForm: `${stemDisplay}て`,
      teRomaji: `${stemRomaji}te`,
      naiForm: `${stemDisplay}ない`,
      naiRomaji: `${stemRomaji}nai`,
      taForm: `${stemDisplay}た`,
      taRomaji: `${stemRomaji}ta`,
      taiForm,
      taiRomaji,
    };
  }

  // VERB_G1 (Godan) rules per Section 1.2 & 1.3 of 02_SPEAKING_BRIDGE.md
  // Special exceptions: 行きます (ikimasu -> itte) & あります (arimasu -> nai)
  if (kana === 'いきます') {
    const baseKanji = displayBase.slice(0, -3); // 行
    return {
      masuForm: displayBase,
      masuRomaji: romaji,
      dictForm: `${baseKanji}く`,
      dictRomaji: 'iku',
      teForm: `${baseKanji}って`,
      teRomaji: 'itte',
      naiForm: `${baseKanji}かない`,
      naiRomaji: 'ikanai',
      taForm: `${baseKanji}った`,
      taRomaji: 'itta',
      taiForm,
      taiRomaji,
    };
  }

  if (kana === 'あります') {
    return {
      masuForm: displayBase,
      masuRomaji: romaji,
      dictForm: 'ある',
      dictRomaji: 'aru',
      teForm: 'あって',
      teRomaji: 'atte',
      naiForm: 'ない',
      naiRomaji: 'nai',
      taForm: 'あった',
      taRomaji: 'atta',
      taiForm,
      taiRomaji,
    };
  }

  const lastKana = stemKana.slice(-1);
  const prefixDisplay = stemDisplay.slice(0, -1);

  const g1Map: Record<
    string,
    { u: string; uRom: string; te: string; teRom: string; nai: string; naiRom: string; ta: string; taRom: string; romSuffix: string }
  > = {
    い: { u: 'う', uRom: 'u', te: 'って', teRom: 'tte', nai: 'わない', naiRom: 'wanai', ta: 'った', taRom: 'tta', romSuffix: 'i' },
    ち: { u: 'つ', uRom: 'tsu', te: 'って', teRom: 'tte', nai: 'たない', naiRom: 'tanai', ta: 'った', taRom: 'tta', romSuffix: 'chi' },
    り: { u: 'る', uRom: 'ru', te: 'って', teRom: 'tte', nai: 'らない', naiRom: 'ranai', ta: 'った', taRom: 'tta', romSuffix: 'ri' },
    み: { u: 'む', uRom: 'mu', te: 'んで', teRom: 'nde', nai: 'まない', naiRom: 'manai', ta: 'んだ', taRom: 'nda', romSuffix: 'mi' },
    び: { u: 'ぶ', uRom: 'bu', te: 'んで', teRom: 'nde', nai: 'ばない', naiRom: 'banai', ta: 'んだ', taRom: 'nda', romSuffix: 'bi' },
    に: { u: 'ぬ', uRom: 'nu', te: 'んで', teRom: 'nde', nai: 'なない', naiRom: 'nanai', ta: 'んだ', taRom: 'nda', romSuffix: 'ni' },
    き: { u: 'く', uRom: 'ku', te: 'いて', teRom: 'ite', nai: 'かない', naiRom: 'kanai', ta: 'いた', taRom: 'ita', romSuffix: 'ki' },
    ぎ: { u: 'ぐ', uRom: 'gu', te: 'いで', teRom: 'ide', nai: 'がない', naiRom: 'ganai', ta: 'いだ', taRom: 'ida', romSuffix: 'gi' },
    し: { u: 'す', uRom: 'su', te: 'して', teRom: 'shite', nai: 'さない', naiRom: 'sanai', ta: 'した', taRom: 'shita', romSuffix: 'shi' },
  };

  const rule = g1Map[lastKana];
  if (!rule) {
    return {
      masuForm: displayBase,
      masuRomaji: romaji,
      dictForm: displayBase,
      dictRomaji: romaji,
      teForm: `${stemDisplay}て`,
      teRomaji: `${stemRomaji}te`,
      naiForm: `${stemDisplay}ない`,
      naiRomaji: `${stemRomaji}nai`,
      taForm: `${stemDisplay}た`,
      taRomaji: `${stemRomaji}ta`,
      taiForm,
      taiRomaji,
    };
  }

  const romPrefix = stemRomaji.slice(0, stemRomaji.length - rule.romSuffix.length);

  return {
    masuForm: displayBase,
    masuRomaji: romaji,
    dictForm: `${prefixDisplay}${rule.u}`,
    dictRomaji: `${romPrefix}${rule.uRom}`,
    teForm: `${prefixDisplay}${rule.te}`,
    teRomaji: `${romPrefix}${rule.teRom}`,
    naiForm: `${prefixDisplay}${rule.nai}`,
    naiRomaji: `${romPrefix}${rule.naiRom}`,
    taForm: `${prefixDisplay}${rule.ta}`,
    taRomaji: `${romPrefix}${rule.taRom}`,
    taiForm,
    taiRomaji,
  };
}

export interface SwissArmyPattern {
  id: number;
  pattern: string;
  meaning: string;
  requiredForm: 'MASU_STEM' | 'TE' | 'NAI' | 'TA' | 'DICT';
  suffixJp: string;
  suffixRomaji: string;
  exampleJp: string;
  exampleRomaji: string;
  exampleId: string;
}

export const SWISS_ARMY_PATTERNS: SwissArmyPattern[] = [
  {
    id: 1,
    pattern: '[V-masu stem] + たいです',
    meaning: 'Ingin melakukan sesuatu',
    requiredForm: 'MASU_STEM',
    suffixJp: 'たいです',
    suffixRomaji: 'tai desu',
    exampleJp: '日本で働きたいです。',
    exampleRomaji: 'Nihon de hatarakitai desu.',
    exampleId: 'Saya ingin bekerja di Jepang.',
  },
  {
    id: 2,
    pattern: '[V-te] + ください',
    meaning: 'Tolong lakukan...',
    requiredForm: 'TE',
    suffixJp: 'ください',
    suffixRomaji: 'kudasai',
    exampleJp: 'ちょっと待ってください。',
    exampleRomaji: 'Chotto matte kudasai.',
    exampleId: 'Tolong tunggu sebentar.',
  },
  {
    id: 3,
    pattern: '[V-te] + います',
    meaning: 'Sedang berlangsung / kondisi menetap',
    requiredForm: 'TE',
    suffixJp: 'います',
    suffixRomaji: 'imasu',
    exampleJp: '今、日本語を勉強しています。',
    exampleRomaji: 'Ima, nihongo o benkyou shite imasu.',
    exampleId: 'Sekarang saya sedang belajar bahasa Jepang.',
  },
  {
    id: 4,
    pattern: '[V-te] + もいいですか',
    meaning: 'Bolehkah saya...?',
    requiredForm: 'TE',
    suffixJp: 'もいいですか',
    suffixRomaji: 'mo ii desu ka',
    exampleJp: 'ここに座ってもいいですか。',
    exampleRomaji: 'Koko ni suwatte mo ii desu ka.',
    exampleId: 'Bolehkah saya duduk di sini?',
  },
  {
    id: 5,
    pattern: '[V-te] + はいけません',
    meaning: 'Tidak boleh / dilarang',
    requiredForm: 'TE',
    suffixJp: 'はいけません',
    suffixRomaji: 'wa ikemasen',
    exampleJp: 'ここで写真を撮ってはいけません。',
    exampleRomaji: 'Koko de shashin o totte wa ikemasen.',
    exampleId: 'Tidak boleh memotret di sini.',
  },
  {
    id: 6,
    pattern: '[V-nai stem] + なければなりません',
    meaning: 'Harus melakukan...',
    requiredForm: 'NAI',
    suffixJp: 'なければなりません',
    suffixRomaji: 'nakereba narimasen',
    exampleJp: '明日早く起きなければなりません。',
    exampleRomaji: 'Ashita hayaku okinakereba narimasen.',
    exampleId: 'Besok harus bangun lebih awal.',
  },
  {
    id: 7,
    pattern: '[V-nai] + でください',
    meaning: 'Tolong jangan...',
    requiredForm: 'NAI',
    suffixJp: 'でください',
    suffixRomaji: 'de kudasai',
    exampleJp: '心配しないでください。',
    exampleRomaji: 'Shinpai shinaide kudasai.',
    exampleId: 'Tolong jangan khawatir.',
  },
  {
    id: 8,
    pattern: '[V-ta] + ことがあります',
    meaning: 'Pernah melakukan...',
    requiredForm: 'TA',
    suffixJp: 'ことがあります',
    suffixRomaji: 'koto ga arimasu',
    exampleJp: '東京へ行ったことがあります。',
    exampleRomaji: 'Toukyou e itta koto ga arimasu.',
    exampleId: 'Saya pernah pergi ke Tokyo.',
  },
  {
    id: 9,
    pattern: '[V-kamus] + ことができます',
    meaning: 'Bisa melakukan...',
    requiredForm: 'DICT',
    suffixJp: 'ことができます',
    suffixRomaji: 'koto ga dekimasu',
    exampleJp: '漢字を読むことができます。',
    exampleRomaji: 'Kanji o yomu koto ga dekimasu.',
    exampleId: 'Saya bisa membaca kanji.',
  },
  {
    id: 10,
    pattern: '[V-ta] + ほうがいいです',
    meaning: 'Sebaiknya... (saran)',
    requiredForm: 'TA',
    suffixJp: 'ほうがいいです',
    suffixRomaji: 'hou ga ii desu',
    exampleJp: '早く寝たほうがいいです。',
    exampleRomaji: 'Hayaku neta hou ga ii desu.',
    exampleId: 'Sebaiknya tidur lebih cepat.',
  },
  {
    id: 11,
    pattern: '[Futsukei] + と思います',
    meaning: 'Menurut saya / Saya rasa...',
    requiredForm: 'DICT',
    suffixJp: 'と思います',
    suffixRomaji: 'to omoimasu',
    exampleJp: '明日は雨だと思います。',
    exampleRomaji: 'Ashita wa ame da to omoimasu.',
    exampleId: 'Menurut saya besok akan hujan.',
  },
  {
    id: 12,
    pattern: '[Futsukei] + んです',
    meaning: 'Menjelaskan alasan / situasi (natural)',
    requiredForm: 'DICT',
    suffixJp: 'んです',
    suffixRomaji: 'ndesu',
    exampleJp: '頭が痛いんです。',
    exampleRomaji: 'Atama ga itain desu.',
    exampleId: 'Kepala saya sedang sakit (menjelaskan alasan).',
  },
  {
    id: 13,
    pattern: '[Alasan] + から / ので、[Hasil]',
    meaning: 'Karena... (node lebih sopan & halus)',
    requiredForm: 'DICT',
    suffixJp: 'ので、行けません',
    suffixRomaji: 'node, ikemasen',
    exampleJp: '忙しいので、行けません。',
    exampleRomaji: 'Isogashii node, ikemasen.',
    exampleId: 'Karena sibuk, saya tidak bisa pergi.',
  },
  {
    id: 14,
    pattern: '[V-kamus] + つもりです',
    meaning: 'Berencana / berniat...',
    requiredForm: 'DICT',
    suffixJp: 'つもりです',
    suffixRomaji: 'tsumori desu',
    exampleJp: '来年日本へ行くつもりです。',
    exampleRomaji: 'Rainen Nihon e iku tsumori desu.',
    exampleId: 'Tahun depan saya berencana pergi ke Jepang.',
  },
  {
    id: 15,
    pattern: '[Kalimat A] + けど、[Kalimat B]',
    meaning: 'Tetapi / pembuka kalimat halus',
    requiredForm: 'MASU_STEM',
    suffixJp: 'たいんですけど…',
    suffixRomaji: 'tain desu kedo...',
    exampleJp: 'すみませんが、ちょっと聞きたいんですけど…',
    exampleRomaji: 'Sumimasen ga, chotto kikitain desu kedo...',
    exampleId: 'Permisi, saya ingin bertanya sebentar...',
  },
];

/**
 * Generates target conjugated string for Slot Substitution Drill (Section 6.2 of 02_SPEAKING_BRIDGE.md)
 */
export function buildPatternSubstitution(
  conj: VerbConjugationSet,
  pattern: SwissArmyPattern
): { targetJp: string; targetRomaji: string } {
  switch (pattern.requiredForm) {
    case 'MASU_STEM':
      if (pattern.id === 1) {
        return { targetJp: conj.taiForm, targetRomaji: conj.taiRomaji };
      }
      return {
        targetJp: `${conj.masuForm.replace(/ます$/, '')}${pattern.suffixJp}`,
        targetRomaji: `${conj.masuRomaji.replace(/masu$/, '')}${pattern.suffixRomaji}`,
      };
    case 'TE':
      return {
        targetJp: `${conj.teForm}${pattern.suffixJp}`,
        targetRomaji: `${conj.teRomaji} ${pattern.suffixRomaji}`,
      };
    case 'NAI':
      if (pattern.id === 6) {
        return {
          targetJp: `${conj.naiForm.replace(/ない$/, '')}なければなりません`,
          targetRomaji: `${conj.naiRomaji.replace(/nai$/, '')}nakereba narimasen`,
        };
      }
      return {
        targetJp: `${conj.naiForm}${pattern.suffixJp}`,
        targetRomaji: `${conj.naiRomaji}${pattern.suffixRomaji}`,
      };
    case 'TA':
      return {
        targetJp: `${conj.taForm}${pattern.suffixJp}`,
        targetRomaji: `${conj.taRomaji} ${pattern.suffixRomaji}`,
      };
    case 'DICT':
      return {
        targetJp: `${conj.dictForm}${pattern.suffixJp}`,
        targetRomaji: `${conj.dictRomaji} ${pattern.suffixRomaji}`,
      };
  }
}
