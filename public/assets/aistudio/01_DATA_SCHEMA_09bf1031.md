# 01_DATA_SCHEMA.md — Standar Baku Struktur Data & Parser

Dokumen ini mendefinisikan format tabel Markdown, aturan penamaan ID, kamus *enum*, dan skema penyimpanan progres (*user state*) untuk seluruh file konten `SPRINT_01.md` hingga `SPRINT_26.md`.

---

## 1. Konvensi Penamaan File & ID

Setiap file Sprint merepresentasikan **14 hari belajar** (`D01`–`D14`), berisi tepat **112 Kosakata** (8/hari) dan **28 Kanji** (2/hari).

| Entitas | Format | Rentang (1 Tahun) | Contoh |
| :--- | :--- | :--- | :--- |
| **Nama File** | `SPRINT_XX.md` | `SPRINT_01.md` – `SPRINT_26.md` | `SPRINT_01.md` |
| **ID Kosakata** | `VXXXX` (4 digit) | `V0001` – `V2912` | `V0001` |
| **ID Kanji** | `KXXXX` (4 digit) | `K0001` – `K0728` | `K0001` |
| **Indeks Hari** | `DXX` (per Sprint) | `D01` – `D14` | `D01` |

### Struktur Wajib di Dalam Setiap File Sprint
Parser hanya perlu memindai dua *heading* tingkat dua (`##`) berikut di dalam setiap file Sprint:
1. `## VOCABULARY` — diikuti tepat 1 tabel Markdown berisi 112 baris data.
2. `## KANJI` — diikuti tepat 1 tabel Markdown berisi 28 baris data.

---

## 2. Skema Tabel Kosakata (`## VOCABULARY`)

Urutan 11 kolom berikut **wajib identik** di semua file Sprint:

| No | Nama Kolom | Tipe Data | Wajib | Aturan Penulisan & Fungsi di Aplikasi |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `ID` | String | Ya | Unik global (`V0001`–`V2912`). Primary Key untuk tracking SRS. |
| 2 | `Day` | String | Ya | `D01`–`D14`. Menentukan jadwal rilis 8 kata baru per hari. |
| 3 | `Kanji` | String | Ya | Bentuk Kanji standar. Isi `-` jika kata asli Hiragana/Katakana. |
| 4 | `Kana` | String | Ya | Bacaan murni dalam Hiragana atau Katakana (untuk Furigana & sumber audio TTS kata tunggal). |
| 5 | `Romaji` | String | Ya | Huruf latin standar Hepburn huruf kecil (untuk *Romaji Scaffolding* & validasi ketik `TYPE_ID_JP`). |
| 6 | `Arti_ID` | String[] | Ya | Arti Bahasa Indonesia. Pisahkan sinonim dengan `; ` dan tulis pembeda konteks dalam `(...)` jika ada sinonim identik (contoh: `siapa (sopan)`). |
| 7 | `Jenis_Kata` | Enum | Ya | Kode kelas kata baku (lihat Bagian 5). Dipakai untuk menyaring opsi pengecoh (*distractor*) Pilihan Ganda. |
| 8 | `Contoh_JP` | String | Ya | 1 kalimat pendek natural. **Kata target wajib diapit `**...**`** agar aplikasi bisa meng-generate soal rumpang (`CLOZE_CTX`) secara otomatis. |
| 9 | `Contoh_Romaji` | String | Ya | Transkripsi Romaji lengkap dari `Contoh_JP` untuk layar *feedback*. |
| 10 | `Contoh_ID` | String | Ya | Terjemahan Bahasa Indonesia natural dari `Contoh_JP`. |
| 11 | `Tags` | String[] | Ya | Dipisah koma tanpa spasi (contoh: `MNN_01,POLITE,CORE`). Untuk filter kategori di aplikasi. |

### Contoh Baris Tabel `## VOCABULARY`

| ID | Day | Kanji | Kana | Romaji | Arti_ID | Jenis_Kata | Contoh_JP | Contoh_Romaji | Contoh_ID | Tags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| V0001 | D01 | 私 | わたし | watashi | saya; aku | PRON | **私**は会社員です。 | Watashi wa kaishain desu. | Saya adalah karyawan perusahaan. | MNN_01,POLITE,CORE,N5 |
| V0002 | D01 | - | コーヒー | koohii | kopi | NOUN | 毎朝**コーヒー**を飲みます。 | Maiasa koohii o nomimasu. | Setiap pagi saya minum kopi. | MNN_02,DAILY,CORE,N5 |

---

## 3. Skema Tabel Kanji (`## KANJI`)

Fokus tahun pertama adalah efisiensi memori: setiap Kanji hanya memuat bacaan yang paling sering dipakai beserta 2–3 kata kontekstual. Urutan 8 kolom berikut **wajib identik**:

| No | Nama Kolom | Tipe Data | Wajib | Aturan Penulisan & Fungsi di Aplikasi |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `ID` | String | Ya | Unik global (`K0001`–`K0728`). Primary Key untuk tracking SRS. |
| 2 | `Day` | String | Ya | `D01`–`D14`. Menentukan jadwal rilis 2 kanji baru per hari. |
| 3 | `Kanji` | Char | Ya | 1 karakter Kanji tunggal. |
| 4 | `Arti_ID` | String[] | Ya | Makna inti Kanji. Sinonim dipisah `; ` (contoh: `hari; matahari`). |
| 5 | `Onyomi` | String | Ya | Bacaan Cina (Katakana + Romaji dalam kurung). Isi `-` jika jarang/tidak dipakai di level N5–N3. Contoh: `ニチ (nichi); ジツ (jitsu)`. |
| 6 | `Kunyomi` | String | Ya | Bacaan Jepang (Hiragana + Romaji dalam kurung). Isi `-` jika tidak umum. Contoh: `ひ (hi); か (ka)`. |
| 7 | `Contoh_Kata` | String[] | Ya | 2–3 contoh kosakata dengan format ketat: `Kanji(kana/romaji)=arti`, dipisah `; `. |
| 8 | `Tags` | String[] | Ya | Dipisah koma tanpa spasi (contoh: `N5,TIME,CORE`). |

### Contoh Baris Tabel `## KANJI`

| ID | Day | Kanji | Arti_ID | Onyomi | Kunyomi | Contoh_Kata | Tags |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| K0001 | D01 | 日 | hari; matahari | ニチ (nichi); ジツ (jitsu) | ひ (hi); か (ka) | 日本(にほん/nihon)=Jepang; 毎日(まいにち/mainichi)=setiap hari | N5,TIME,CORE |
| K0002 | D01 | 人 | orang; manusia | ジン (jin); ニン (nin) | ひと (hito) | 日本人(にほんじん/nihonjin)=orang Jepang; 一人(ひとり/hitori)=sendirian | N5,PEOPLE,CORE |

---

## 4. Aturan Sanitasi & Standar Parsing

Untuk mencegah *parser* crash saat membaca tabel Markdown:

1. **Larangan Karakter Pipa (`|`):** Jangan pernah menggunakan karakter `|` di dalam isi sel.
2. **Nilai Kosong:** Sel tidak boleh dibiarkan kosong. Gunakan tanda hubung tunggal `-` sebagai representasi `null`.
3. **Pemisah Data (*Delimiter*):**
   * `; ` (titik koma + spasi) → pemisah daftar sinonim (`Arti_ID`), daftar bacaan (`Onyomi`/`Kunyomi`), dan daftar contoh kata Kanji (`Contoh_Kata`).
   * `,` (koma tanpa spasi) → pemisah label pada kolom `Tags`.
4. **Standar Penulisan Romaji (Modified Hepburn Sederhana — Ramah Ketikan):**
   * Gunakan `shi`, `chi`, `tsu`, `fu`, `ji` (bukan `si`, `ti`, `tu`, `hu`, `zi`).
   * Vokal panjang ditulis ganda agar mudah diketik di keyboard standar: `ou` (untuk おう, misal `gakkou`), `oo` (untuk おお, misal `ookii`), `ee` (untuk ええ), `aa` (untuk ああ), `ii` (untuk いい), `uu` (untuk うう). **Jangan gunakan makron (`ō`, `ū`)** di kolom `Romaji`.
   * Partikel は dibaca `wa`, を dibaca `o`, へ dibaca `e` pada kolom `Contoh_Romaji`.
   * Konsonan ganda (*Sokuon* っ) ditulis dobel: `kitte`, `zasshi`, `chotto`.
   * Bunyi `ん` sebelum vokal atau `y` dipisah apostrof: `sen'en`, `ichiman'en`, `kin'en`, `hon'ya`.
5. **Auto-Cloze Extraction (`CLOZE_CTX`):**
   * Pada `Contoh_JP`, parser menggunakan regex `/\*\*(.*?)\*\*/` untuk mengekstrak kata target dan menggantinya dengan `_____`.
   * Untuk kosakata berimbuhan (`～歳`, `～階`, `～円`), hanya karakter intinya yang diapit `**...**` di `Contoh_JP` (misal `五**階**`). *Smart Grader* otomatis mengabaikan prefiks `～` dan `-` saat validasi.
6. **Aturan Disambiguasi Sinonim `(...)`:**
   * Setiap kata yang memiliki arti Indonesia sama dengan kata lain dalam 1 kurikulum **wajib diberi pembeda konteks dalam kurung `(...)`** di kolom `Arti_ID` (contoh: `siapa (biasa)` vs `siapa (sopan)`).
   * Parser wajib menyediakan 2 output dari `Arti_ID`: `display_prompt` (utuh dengan kurung, dipakai di `ID → JP`) dan `accepted_answers[]` (dipecah dengan `; ` lalu teks `(...)` dihapus, dipakai oleh *Smart Grader* di `JP → ID`).
7. **Aturan Sumber Audio TTS:**
   * Pemutar TTS kata tunggal membaca kolom `Kana`. Pemutar TTS kalimat membaca `Contoh_JP` (tanpa tanda `**`).

---

## 5. Kamus Enum Baku

### 5.1 Enum `Jenis_Kata` (Wajib Konsisten untuk Distractor Kuis)

| Kode Enum | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `NOUN` | Kata Benda | 本 (hon), 会社 (kaisha) |
| `PRON` | Kata Ganti Orang/Tunjuk | 私 (watashi), これ (kore) |
| `VERB_G1` | Kata Kerja Grup 1 (Godan / -u) | 飲みます (nomimasu), 行きます (ikimasu) |
| `VERB_G2` | Kata Kerja Grup 2 (Ichidan / -ru) | 食べます (tabemasu), 見ます (mimasu) |
| `VERB_G3` | Kata Kerja Grup 3 (Irregular: suru/kuru) | 勉強します (benkyou shimasu), 来ます (kimasu) |
| `ADJ_I` | Kata Sifat -i | 大きい (ookii), 暑い (atsui) |
| `ADJ_NA` | Kata Sifat -na | 静か (shizuka), 便利 (benri) |
| `ADV` | Kata Keterangan (Adverbia) | とても (totemo), もう (mou) |
| `CONJ` | Kata Penghubung | それから (sorekara), でも (demo) |
| `PARTICLE` | Partikel | から (kara), まで (made) |
| `COUNTER` | Kata Bantu Bilangan | ～人 (-nin), ～つ (-tsu) |
| `EXPR` | Ungkapan / Frasa / Salam / Aizuchi | よろしく (yoroshiku), なるほど (naruhodo) |
| `ONOM` | Onomatope (Giongo / Gitaigo) | びっくり (bikkuri), ぎりぎり (girigiri) |

### 5.2 Taksonomi `Tags`

* **Sumber Buku:** `MNN_01` s/d `MNN_50`
* **Konteks Penggunaan:** `DAILY` (harian non-MNN), `WORK` (kantor/kerja), `SURVIVAL` (konbini/stasiun/klinik), `SOCIAL` (ngobrol santai)
* **Register Bahasa:** `POLITE` (teineigo), `CASUAL` (futsukei/lisan), `KEIGO` (sopan bisnis)
* **Level Referensi:** `N5`, `N4`, `N3`, `CORE` (frekuensi sangat tinggi)

---

## 6. Skema State User (Runtime JSON untuk Database / LocalStorage)

Setiap item (`VXXXX` atau `KXXXX`) yang sudah dibuka user disimpan dengan struktur objek berikut agar terhubung langsung dengan mesin di `00_MASTER_LOGIC_SRS.md`:

```json
{
  "item_id": "V0001",
  "item_type": "VOCAB",
  "sprint": 1,
  "srs_stage": 2,
  "next_review_at": "2026-11-26T00:00:00Z",
  "last_reviewed_at": "2026-11-24T04:30:00Z",
  "correct_count": 3,
  "wrong_count": 0,
  "is_leech": false
}