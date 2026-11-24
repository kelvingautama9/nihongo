/**
 * Standard Data Schema & Parser based on 01_DATA_SCHEMA.md
 */

export type WordClassEnum =
  | 'NOUN'
  | 'PRON'
  | 'VERB_G1'
  | 'VERB_G2'
  | 'VERB_G3'
  | 'ADJ_I'
  | 'ADJ_NA'
  | 'ADV'
  | 'CONJ'
  | 'PARTICLE'
  | 'COUNTER'
  | 'EXPR'
  | 'ONOM';

export interface VocabItem {
  id: string; // V0001 - V2912
  sprint: number;
  day: string; // D01 - D14
  dayNumber: number; // 1 - 14
  kanji: string; // '-' if pure kana
  kana: string;
  romaji: string;
  artiFull: string; // display_prompt with (...)
  acceptedAnswersId: string[]; // cleaned synonyms without (...)
  jenisKata: WordClassEnum;
  contohJp: string; // raw with **...**
  contohJpClean: string; // without **
  clozePromptJp: string; // target replaced with _____
  clozeTargetJp: string; // exact string inside **...**
  contohRomaji: string;
  contohId: string;
  tags: string[];
}

export interface KanjiCompoundExample {
  kanjiWord: string;
  kana: string;
  romaji: string;
  meaningId: string;
}

export interface KanjiItem {
  id: string; // K0001 - K0728
  sprint: number;
  day: string; // D01 - D14
  dayNumber: number;
  kanji: string;
  artiFull: string;
  acceptedAnswersId: string[];
  onyomi: string;
  kunyomi: string;
  contohKataRaw: string;
  examples: KanjiCompoundExample[];
  tags: string[];
}

export interface ParsedSprintData {
  sprintNumber: number;
  title: string;
  focus: string;
  vocabulary: VocabItem[];
  kanji: KanjiItem[];
}

/**
 * Strips context parentheses e.g. "siapa (sopan)" -> "siapa"
 */
export function stripContextParens(text: string): string {
  return text.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Splits semicolon-delimited Indonesian meanings and creates accepted_answers[]
 */
export function parseAcceptedAnswers(artiRaw: string): string[] {
  const parts = artiRaw.split(';').map((s) => s.trim()).filter(Boolean);
  const results = new Set<string>();
  for (const part of parts) {
    const cleaned = stripContextParens(part).toLowerCase();
    if (cleaned) {
      results.add(cleaned);
    }
    const fullLower = part.toLowerCase();
    if (fullLower) {
      results.add(fullLower);
    }
  }
  return Array.from(results);
}

/**
 * Extracts cloze sentence and target word from `Contoh_JP` containing `**target**`
 */
export function extractClozeFromSentence(contohJp: string, fallbackKanji: string, fallbackKana: string): {
  cleanSentence: string;
  clozeSentence: string;
  targetWord: string;
} {
  const match = contohJp.match(/\*\*(.*?)\*\*/);
  const targetWord = match ? match[1].trim() : (fallbackKanji !== '-' ? fallbackKanji : fallbackKana);
  const cleanSentence = contohJp.replace(/\*\*(.*?)\*\*/g, '$1');
  const clozeSentence = contohJp.replace(/\*\*(.*?)\*\*/, '_____').replace(/\*\*(.*?)\*\*/g, '$1');
  return {
    cleanSentence,
    clozeSentence,
    targetWord,
  };
}

/**
 * Parses `Contoh_Kata` in Kanji table:
 * e.g. `一階(いっかい/ikkai)=lantai satu; 一人(ひとり/hitori)=sendirian`
 */
export function parseKanjiExamples(raw: string): KanjiCompoundExample[] {
  const segments = raw.split(';').map((s) => s.trim()).filter(Boolean);
  const examples: KanjiCompoundExample[] = [];

  for (const seg of segments) {
    // Pattern: Word(kana/romaji)=meaning
    const match = seg.match(/^([^\(]+)\(([^\/]+)\/([^\)]+)\)=(.+)$/);
    if (match) {
      examples.push({
        kanjiWord: match[1].trim(),
        kana: match[2].trim(),
        romaji: match[3].trim(),
        meaningId: match[4].trim(),
      });
    }
  }
  return examples;
}

/**
 * Parses a full SPRINT_XX.md markdown string into structured VocabItem[] and KanjiItem[]
 */
export function parseSprintMarkdown(markdown: string, sprintNumber: number): ParsedSprintData {
  const lines = markdown.split(/\r?\n/);
  let title = `Sprint ${String(sprintNumber).padStart(2, '0')}`;
  let focus = '';

  const vocabulary: VocabItem[] = [];
  const kanji: KanjiItem[] = [];

  let currentSection: 'NONE' | 'VOCAB' | 'KANJI' = 'NONE';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      title = line.replace(/^#\s+/, '').trim();
      continue;
    }

    if (line.includes('**Fokus:**')) {
      focus = line.split('**Fokus:**')[1]?.trim() || '';
      continue;
    }

    if (line.startsWith('## VOCABULARY')) {
      currentSection = 'VOCAB';
      continue;
    }

    if (line.startsWith('## KANJI')) {
      currentSection = 'KANJI';
      continue;
    }

    if (line.startsWith('## ')) {
      currentSection = 'NONE';
      continue;
    }

    if (!line.startsWith('|') || line.includes(':---')) {
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (currentSection === 'VOCAB' && cells.length >= 11) {
      const id = cells[0];
      if (!/^V\d{4}$/.test(id)) continue; // skip header row

      const day = cells[1];
      const dayNumber = parseInt(day.replace('D', ''), 10) || 1;
      const kanjiStr = cells[2];
      const kana = cells[3];
      const romaji = cells[4];
      const artiFull = cells[5];
      const jenisKata = cells[6] as WordClassEnum;
      const contohJp = cells[7];
      const contohRomaji = cells[8];
      const contohId = cells[9];
      const tags = cells[10].split(',').map((t) => t.trim()).filter(Boolean);

      const { cleanSentence, clozeSentence, targetWord } = extractClozeFromSentence(
        contohJp,
        kanjiStr,
        kana
      );

      vocabulary.push({
        id,
        sprint: sprintNumber,
        day,
        dayNumber,
        kanji: kanjiStr,
        kana,
        romaji,
        artiFull,
        acceptedAnswersId: parseAcceptedAnswers(artiFull),
        jenisKata,
        contohJp,
        contohJpClean: cleanSentence,
        clozePromptJp: clozeSentence,
        clozeTargetJp: targetWord,
        contohRomaji,
        contohId,
        tags,
      });
    } else if (currentSection === 'KANJI' && cells.length >= 8) {
      const id = cells[0];
      if (!/^K\d{4}$/.test(id)) continue; // skip header row

      const day = cells[1];
      const dayNumber = parseInt(day.replace('D', ''), 10) || 1;
      const kanjiChar = cells[2];
      const artiFull = cells[3];
      const onyomi = cells[4];
      const kunyomi = cells[5];
      const contohKataRaw = cells[6];
      const tags = cells[7].split(',').map((t) => t.trim()).filter(Boolean);

      kanji.push({
        id,
        sprint: sprintNumber,
        day,
        dayNumber,
        kanji: kanjiChar,
        artiFull,
        acceptedAnswersId: parseAcceptedAnswers(artiFull),
        onyomi,
        kunyomi,
        contohKataRaw,
        examples: parseKanjiExamples(contohKataRaw),
        tags,
      });
    }
  }

  return {
    sprintNumber,
    title,
    focus,
    vocabulary,
    kanji,
  };
}
