import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseSprintMarkdown,
  stripContextParens,
  extractClozeFromSentence,
} from './sprintParser';
import {
  calculateNextSrsState,
  checkAntiBurnoutGate,
  getRomajiVisibility,
  gradeIndonesianInput,
  gradeJapaneseInput,
  selectVocabQuizMode,
  UserItemSrsRecord,
} from './srsEngine';
import {
  conjugateVerbFromMasu,
  buildPatternSubstitution,
  SWISS_ARMY_PATTERNS,
} from './speakingBridge';

test('Sprint Markdown Parser parses SPRINT_01, SPRINT_02, and SPRINT_03 without errors', () => {
  const s1Raw = fs.readFileSync('public/assets/aistudio/SPRINT_01_119b197f.md', 'utf-8');
  const s2Raw = fs.readFileSync('public/assets/aistudio/SPRINT_02_4ec90b1f.md', 'utf-8');
  const s3Raw = fs.readFileSync('public/assets/aistudio/SPRINT_03_a2069d3d.md', 'utf-8');

  const s1 = parseSprintMarkdown(s1Raw, 1);
  const s2 = parseSprintMarkdown(s2Raw, 2);
  const s3 = parseSprintMarkdown(s3Raw, 3);

  assert.equal(s1.vocabulary.length, 112, 'Sprint 1 has 112 vocab items');
  assert.equal(s1.kanji.length, 28, 'Sprint 1 has 28 kanji items');
  assert.equal(s2.vocabulary.length, 112, 'Sprint 2 has 112 vocab items');
  assert.equal(s2.kanji.length, 28, 'Sprint 2 has 28 kanji items');
  assert.equal(s3.vocabulary.length, 112, 'Sprint 3 has 112 vocab items');
  assert.equal(s3.kanji.length, 28, 'Sprint 3 has 28 kanji items');

  // Verify V0001 and K0001 details
  assert.equal(s1.vocabulary[0].id, 'V0001');
  assert.equal(s1.vocabulary[0].kanji, '私');
  assert.equal(s1.vocabulary[0].clozePromptJp, '_____は会社員です。');
  assert.equal(s1.vocabulary[0].clozeTargetJp, '私');

  assert.equal(s1.kanji[0].id, 'K0001');
  assert.equal(s1.kanji[0].kanji, '一');
  assert.ok(s1.kanji[0].examples.length >= 2);
});

test('Auto-cloze extraction handles affixes like 五**階** properly', () => {
  const res = extractClozeFromSentence('私の部屋は五**階**です。', '～階', '～かい');
  assert.equal(res.cleanSentence, '私の部屋は五階です。');
  assert.equal(res.clozeSentence, '私の部屋は五_____です。');
  assert.equal(res.targetWord, '階');
});

test('8-Stage SRS state transition follows 00_MASTER_LOGIC_SRS.md rules', () => {
  const baseRecord: UserItemSrsRecord = {
    item_id: 'V0001',
    item_type: 'VOCAB',
    sprint: 1,
    srs_stage: 3,
    next_review_at: '2026-11-24T00:00:00.000Z',
    last_reviewed_at: '2026-11-20T00:00:00.000Z',
    correct_count: 3,
    wrong_count: 2,
    total_reps: 5,
    is_leech: false,
  };

  // 1. Correct without hint -> Stage 4 (+7 days)
  const afterCorrect = calculateNextSrsState(baseRecord, true, false);
  assert.equal(afterCorrect.srs_stage, 4);
  assert.equal(afterCorrect.correct_count, 4);
  assert.equal(afterCorrect.total_reps, 6);

  // 2. Correct WITH Romaji Hint in Stage >= 3 -> Stage remains 3
  const afterHint = calculateNextSrsState(baseRecord, true, true);
  assert.equal(afterHint.srs_stage, 3);

  // 3. Wrong answer in Stage >= 3 -> Penalty drops 2 stages (3 -> 1)
  const afterWrong1 = calculateNextSrsState(baseRecord, false, false);
  assert.equal(afterWrong1.srs_stage, 1);
  assert.equal(afterWrong1.wrong_count, 3);
  assert.equal(afterWrong1.is_leech, false);

  // 4. Wrong answer 4th time triggers Leech flag (wrong_count >= 4)
  const afterWrong2 = calculateNextSrsState(afterWrong1, false, false);
  assert.equal(afterWrong2.wrong_count, 4);
  assert.equal(afterWrong2.is_leech, true);
});

test('Anti-burnout daily review cap locks new items at >130 and unlocks <80', () => {
  assert.equal(checkAntiBurnoutGate(135, false).isNewIntakeLocked, true);
  assert.equal(checkAntiBurnoutGate(100, true).isNewIntakeLocked, true);
  assert.equal(checkAntiBurnoutGate(75, true).isNewIntakeLocked, false);
});

test('Smart Grader disambiguates (...) in Indonesian and supports fuzzy typos & affixes', () => {
  assert.equal(stripContextParens('siapa (sopan)'), 'siapa');

  // Typing "siapa" matches "siapa (sopan)" in JP -> ID
  const g1 = gradeIndonesianInput('siapa', 'siapa (sopan)');
  assert.equal(g1.isCorrect, true);
  assert.equal(g1.hasMinorTypo, false);

  // Minor typo on word >= 5 letters ("karywan" vs "karyawan")
  const g2 = gradeIndonesianInput('karywan', 'karyawan; pegawai');
  assert.equal(g2.isCorrect, true);
  assert.equal(g2.hasMinorTypo, true);

  // Japanese input with prefix sanitization (-kai / ～階) and romaji variants (si -> shi)
  const jp1 = gradeJapaneseInput('kai', { kanji: '～階', kana: '～かい', romaji: '-kai', clozeTarget: '階' });
  assert.equal(jp1.isCorrect, true);

  const jp2 = gradeJapaneseInput('watasi', { kanji: '私', kana: 'わたし', romaji: 'watashi' });
  assert.equal(jp2.isCorrect, true);
});

test('Progressive Romaji Scaffolding follows Stage 0-2, 3-5, and 6-8 visibility rules', () => {
  assert.deepEqual(getRomajiVisibility(1, false), {
    showFurigana: true,
    showRomajiAuto: true,
    canRevealRomajiHint: false,
  });
  assert.deepEqual(getRomajiVisibility(4, false), {
    showFurigana: true,
    showRomajiAuto: false,
    canRevealRomajiHint: true,
  });
  assert.deepEqual(getRomajiVisibility(7, false), {
    showFurigana: false,
    showRomajiAuto: false,
    canRevealRomajiHint: false,
  });
  assert.deepEqual(getRomajiVisibility(7, true), {
    showFurigana: true,
    showRomajiAuto: true,
    canRevealRomajiHint: false,
  });
});

test('Quiz Mode Selector never repeats 3 identical modes in a row', () => {
  const mode = selectVocabQuizMode(0, false, ['MC_JP_ID', 'MC_JP_ID'], 0.1);
  assert.notEqual(mode, 'MC_JP_ID');
});

test('Speaking Bridge verb conjugation handles G1, G2, G3, ikimasu, and arimasu exceptions', () => {
  const nomu = conjugateVerbFromMasu('飲みます', 'のみます', 'nomimasu', 'VERB_G1');
  assert.equal(nomu.dictForm, '飲む');
  assert.equal(nomu.teForm, '飲んで');
  assert.equal(nomu.naiForm, '飲まない');
  assert.equal(nomu.taForm, '飲んだ');

  const iku = conjugateVerbFromMasu('行きます', 'いきます', 'ikimasu', 'VERB_G1');
  assert.equal(iku.teForm, '行って');
  assert.equal(iku.taForm, '行った');

  const aru = conjugateVerbFromMasu('-', 'あります', 'arimasu', 'VERB_G1');
  assert.equal(aru.naiForm, 'ない');

  const taberu = conjugateVerbFromMasu('食べます', 'たべます', 'tabemasu', 'VERB_G2');
  assert.equal(taberu.teForm, '食べて');
  assert.equal(taberu.taiForm, '食べたいです');

  const sub = buildPatternSubstitution(taberu, SWISS_ARMY_PATTERNS[1]); // [V-te] + ください
  assert.equal(sub.targetJp, '食べてください');
});
