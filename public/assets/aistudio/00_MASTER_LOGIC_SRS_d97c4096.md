# 00_MASTER_LOGIC_SRS.md — Master Sistem Pembelajaran Bahasa Jepang (1 Tahun)

Dokumen ini adalah spesifikasi logika utama (*core engine*) untuk aplikasi web pembelajaran kosakata dan kanji Bahasa Jepang berbasis **Spaced Repetition System (SRS)** dan **Active Recall** bergaya Duolingo.

---

## 1. Parameter Target 1 Tahun

| Parameter | Nilai Target | Keterangan |
| :--- | :--- | :--- |
| **Durasi Total** | 364 Hari (52 Minggu) | Dibagi menjadi **26 Sprint** (1 Sprint = 14 Hari) |
| **Kuota Harian** | **8 Kosakata + 2 Kanji** | 10 item baru per hari |
| **Kuota per Sprint** | **112 Kosakata + 28 Kanji** | 140 item baru per file Sprint |
| **Total 1 Tahun** | **2.912 Kosakata + 728 Kanji** | Melampaui JLPT N4, masuk N3 Inti + Percakapan Harian |
| **Estimasi Waktu** | 45–60 Menit / Hari | Termasuk review SRS lama + input materi baru |

---

## 2. Mesin SRS Dinamis (Pengganti Jadwal Statis)

Sistem ini menggantikan metode statis (6 hari berturut-turut + 6 bulan) dengan **8-Stage Dynamic SRS** (hybrid Leitner & SM-2) agar kata mudah tidak membuang waktu dan kata sulit mendapat pengulangan ekstra sebelum kurva lupa jatuh.

### 2.1 Tabel Interval Level Penguasaan (SRS Stage)

| Stage | Status | Interval Review Berikutnya | Karakteristik Ingatan |
| :---: | :--- | :--- | :--- |
| **0** | `NEW` | Hari ini (Langsung diuji) | Baru dipelajari (Short-Term Memory) |
| **1** | `APPRENTICE_1` | +1 Hari (24 jam) | Mulai dikenali |
| **2** | `APPRENTICE_2` | +2 Hari | Penguatan awal |
| **3** | `APPRENTICE_3` | +4 Hari | Transisi ke memori menengah |
| **4** | `GURU_1` | +7 Hari (1 Minggu) | Mulai stabil |
| **5** | `GURU_2` | +14 Hari (2 Minggu) | Melewati batas kritis lupa |
| **6** | `MASTER` | +30 Hari (1 Bulan) | Masuk Long-Term Memory |
| **7** | `ENLIGHTENED` | +60 Hari (2 Bulan) | Sangat stabil |
| **8** | `BURNED` | +120 Hari (4 Bulan / Selesai) | Permanen (opsional review tahunan) |

### 2.2 Aturan Perpindahan Stage (State Transition)

* **Jawaban Benar (Tanpa Bantuan):** `stage = min(stage + 1, 8)`. Jadwal `next_review_at` dihitung dari waktu sekarang + interval stage baru.
* **Jawaban Benar (Dengan Bantuan / Buka Hint Romaji di Stage >= 3):** `stage` tetap (tidak naik, tidak turun), `next_review_at` diulang +1 hari.
* **Jawaban Salah:**
  * Jika `stage <= 2`: turun ke `stage = 1` (+1 hari).
  * Jika `stage >= 3`: penalti turun 2 tingkat (`stage = max(stage - 2, 1)`).
  * Item yang salah **wajib masuk antrean ulang di sesi yang sama** (Duolingo Loop) sampai dijawab benar sebelum sesi dianggap selesai, tetapi kenaikan stage tetap dibekukan (penalti tetap berlaku).
* **Deteksi "Leech" (Kata Membandel):** Jika satu item salah `>= 4 kali` sepanjang riwayatnya, beri flag `is_leech = true`. Sistem otomatis memprioritaskan item ini pada mode *Context Sentence* dan menampilkannya di tab khusus "Daftar Kata Sulit".

### 2.3 Pengaman Anti-Burnout (Daily Review Cap)

* Batas maksimal review harian: **150 kartu unik/hari**.
* **Aturan Hitung Duolingo Loop:** Kartu yang dijawab salah lalu diulang kembali dalam sesi yang sama **tidak dihitung menambah kuota cap** (dihitung tetap 1 kartu unik).
* Jika antrean review menumpuk **`> 130 kartu`** (misal karena bolos beberapa hari), sistem otomatis **mengunci input 10 item baru hari itu** sampai antrean review turun di bawah **80 kartu**.

---

## 3. Mesin Kuis Dinamis (Duolingo-Style Engine)

Setiap sesi mengacak **arah soal** (`JP -> ID` dan `ID -> JP`) serta **format soal** secara dinamis berdasarkan `SRS Stage` masing-masing item.

### 3.1 Mode & Format Soal Kosakata (`VXXXX`)

| Kode Mode | Nama Mode | Mekanisme Interaksi | Tujuan Kognitif |
| :--- | :--- | :--- | :--- |
| **`MC_JP_ID`** | Pilihan Ganda (JP → ID) | Tampil kata JP (+ Romaji sesuai aturan). Pilih 1 dari 4 arti ID. | Pengenalan awal (Recognition) |
| **`MC_ID_JP`** | Pilihan Ganda (ID → JP) | Tampil arti ID. Pilih 1 dari 4 kata JP (+ Romaji). | Memicu asosiasi balik |
| **`TYPE_JP_ID`** | **Ketik Arti Indonesia (JP → ID)** | Tampil kata JP (+ Romaji sesuai aturan). **User mengetik arti bahasa Indonesia.** | Active Recall pemahaman |
| **`TYPE_ID_JP`** | **Ketik Bahasa Jepang (ID → JP)** | Tampil arti ID (termasuk hint `(...)` jika ada). **User mengetik dalam Romaji, Kana, atau Kanji** (misal: `tabemasu` atau `たべます`). | Active Recall produksi bahasa (kunci bicara) |
| **`CLOZE_CTX`** | Isian Kalimat (Konteks) | Tampil 1 kalimat contoh JP dengan 1 kata rumpang (`_____`) + arti kalimat ID. User mengetik/memilih kata yang tepat. | Membiasakan kosakata dalam kalimat nyata |
| **`AUDIO_DICT`** | Dengar & Jawab (TTS) | Putar audio Web Speech API (`ja-JP` dari kolom `Kana`). User ketik arti ID atau pilih kata JP. | Melatih telinga untuk percakapan |

### 3.2 Matriks Pengacakan Dinamis Kosakata Berdasarkan SRS Stage

Aplikasi memilih mode soal secara acak (*weighted random*) mengikuti perkembangan penguasaan user:

| SRS Stage | Distribusi Mode Soal | Arah Dominan |
| :--- | :--- | :--- |
| **Stage 0 (New)** | 50% `MC_JP_ID` · 30% `MC_ID_JP` · 20% `TYPE_JP_ID` | 70% JP→ID / 30% ID→JP |
| **Stage 1–2** | 25% `MC_ID_JP` · 45% `TYPE_JP_ID` · 30% `TYPE_ID_JP` | 50% JP→ID / 50% ID→JP |
| **Stage 3–5** | 30% `TYPE_JP_ID` · 40% `TYPE_ID_JP` · 20% `CLOZE_CTX` · 10% `AUDIO_DICT` | 40% JP→ID / 60% ID→JP |
| **Stage 6–8** | 20% `TYPE_JP_ID` · 40% `TYPE_ID_JP` · 25% `CLOZE_CTX` · 15% `AUDIO_DICT` | 30% JP→ID / 70% ID→JP |

> **Aturan Khusus Duolingo-Style:**
> 1. Dalam satu sesi, sistem dilarang menampilkan 3 soal dengan mode identik secara berturut-turut.
> 2. Opsi pengecoh (*distractor*) pada Pilihan Ganda harus diambil dari **jenis kata yang sama** (`Jenis_Kata`) agar user tidak menebak asal-asalan.

### 3.3 Mesin Kuis Khusus Kanji (`KXXXX`)

Karena tabel `## KANJI` memiliki skema berbeda (tanpa `Kana` tunggal dan `Contoh_JP`), seluruh item ber-ID `KXXXX` diarahkan ke 3 mode khusus berikut:

| Kode Mode | Nama Mode | Mekanisme Interaksi | Tujuan Kognitif |
| :--- | :--- | :--- | :--- |
| **`KANJI_MEANING`** | Arti Inti Kanji | Tampil 1 karakter Kanji (contoh: `日`). **User mengetik arti Indonesia** (menggunakan *Smart Grader*). | Mengunci makna visual Kanji |
| **`KANJI_READING`** | Bacaan dalam Kata | Parser memilih 1 kata acak dari kolom `Contoh_Kata`, menyembunyikan `(kana/romaji)` (tampil `日本 = Jepang`). **User mengetik Romaji/Kana** (`nihon` / `にほん`) atau memilih 1 dari 4 opsi. | Melatih bacaan *Onyomi/Kunyomi* secara kontekstual |
| **`KANJI_PICK`** | Pilih Kanji | Tampil arti inti + 1 contoh kata tanpa Kanji target (contoh: `hari; matahari` · `___本 (nihon)`). Pilih 1 dari 4 Kanji pengecoh. | Membedakan Kanji yang bentuknya mirip |

**Distribusi Mode Kuis Kanji Berdasarkan SRS Stage:**

| SRS Stage | Distribusi Mode Kanji |
| :--- | :--- |
| **Stage 0 (New)** | 50% `KANJI_PICK` · 50% `KANJI_MEANING` |
| **Stage 1–2** | 40% `KANJI_MEANING` · 40% `KANJI_READING` (Pilihan Ganda) · 20% `KANJI_PICK` |
| **Stage 3–8** | 35% `KANJI_MEANING` · 65% `KANJI_READING` (Mode Ketik Romaji/Kana) |

---

## 4. Logika Tampilan Romaji & Koreksi Ketikan

### 4.1 Aturan Tampilan Romaji (Progressive Scaffolding)

Setiap kali soal menampilkan teks Bahasa Jepang (Hiragana, Katakana, atau Kanji), tampilan Romaji diatur sebagai berikut:

1. **Stage 0–2 (Pemula):** Tampil lengkap secara otomatis:
   * Baris 1 (Besar): **Kanji** (atau Kana jika tidak ada Kanji)
   * Baris 2 (Sedang): **Hiragana / Katakana** (Furigana)
   * Baris 3 (Kecil, warna redup): **Romaji** (contoh: `tabemasu`)
2. **Stage 3–5 (Menengah):**
   * Tampil Kanji + Furigana.
   * Romaji disembunyikan di balik tombol `[Lihat Romaji]`.
3. **Stage 6–8 (Mahir):**
   * Tampil Kanji murni. Furigana & Romaji hanya muncul di layar *feedback* setelah user menekan Enter.
4. **Global Override Setting:** Sediakan toggle di menu pengaturan: `Selalu Tampilkan Romaji: [ON / OFF]`. Jika `ON`, Romaji selalu muncul di semua stage tanpa penalti.

### 4.2 Mesin Koreksi Jawaban Ketikan (Smart Grader)

Agar mode ketik Bahasa Indonesia (`TYPE_JP_ID`, `KANJI_MEANING`) dan Bahasa Jepang (`TYPE_ID_JP`, `KANJI_READING`, `CLOZE_CTX`) akurat tanpa membuat frustrasi:

1. **Normalisasi Input & Hapus Prefiks Imbuhan:**
   * Ubah semua ke huruf kecil (`lowercase`).
   * Hapus spasi berlebih di awal/akhir serta tanda baca (`.`, `,`, `!`, `?`).
   * **Sanitasi Prefiks:** Sebelum membandingkan jawaban di mode `TYPE_ID_JP` dan `CLOZE_CTX`, hapus karakter `～` dan `-` di awal kunci jawaban maupun input user (contoh: `-kai` dan `～階` dicocokkan sebagai `kai` dan `階`).
2. **Dukungan Multi-Jawaban & Hint Pembeda Sinonim `(...)`:**
   * Di database, sinonim dipisah titik koma (`; `), dan pembeda konteks ditulis dalam kurung `(...)` — contoh: `siapa (sopan)` atau `ini (+ kata benda)`.
   * **Saat mode `JP → ID` (`TYPE_JP_ID`):** *Smart Grader* **wajib menghapus teks di dalam kurung `(...)`** sebelum mencocokkan jawaban (mengetik `siapa` dianggap **BENAR** untuk `siapa (sopan)`).
   * **Saat mode `ID → JP` (`TYPE_ID_JP`):** Teks dalam kurung `(...)` **wajib ditampilkan di layar soal** sebagai petunjuk agar user tahu kata spesifik mana yang diminta (misal soal tampil `siapa (sopan)` → user tahu harus mengetik `donata`, bukan `dare`).
3. **Toleransi Typo (Fuzzy Matching — Levenshtein Distance):**
   * Untuk jawaban dengan panjang `>= 5 huruf`, jika jarak kesalahan ketik `<= 1 karakter`, dianggap **BENAR** dengan banner kuning: *"Benar, tapi ada typo kecil"*.
   * Untuk jawaban `< 5 huruf`, wajib cocok 100% (*exact match*).
4. **Input Bahasa Jepang (`TYPE_ID_JP`, `KANJI_READING`, `CLOZE_CTX`):**
   * Terima input dalam bentuk **Romaji**, **Kana**, maupun **Kanji**.
   * Normalisasi variasi Romaji umum (`si` = `shi`, `ti` = `chi`, `tu` = `tsu`, `hu` = `fu`, `ou` = `oo`/`ō`, dan abaikan apostrof `'` opsional seperti `senen` = `sen'en`).
   * **Khusus `CLOZE_CTX`:** Kunci jawaban diambil dari **teks persis di dalam `**...**`** pada `Contoh_JP` (beserta padanan Kana/Romaji-nya) agar tetap valid meskipun kata kerja di kalimat contoh mengalami konjugasi.
5. **Aturan Audio TTS (`Web Speech API`):**
   * Untuk tombol audio **kata tunggal**, selalu kirim string dari kolom **`Kana`** (bukan `Kanji`) ke TTS agar browser tidak salah membaca Kanji ambigu.
   * Untuk tombol audio **kalimat contoh**, kirim `Contoh_JP` setelah menghapus karakter markdown `**`.

### 4.3 Layar Feedback Pasca-Jawab (Wajib Muncul di Setiap Soal)

Setiap kali user menjawab (benar maupun salah), tampilkan kartu ringkas sebelum lanjut ke soal berikutnya:
* **Status:** Benar / Salah + Jawaban yang benar.
* **Detail Lengkap:** Kanji · Kana · Romaji · Arti Indonesia · Jenis Kata (atau Onyomi/Kunyomi untuk Kanji).
* **Tombol Audio (`🔊`):** Memutar pelafalan kata dan kalimat contoh.
* **1 Kalimat Contoh:** Teks JP + Romaji + Terjemahan ID (agar otak selalu mengaitkan kata dengan konteks bicara).

---

## 5. Alur Sesi Belajar Harian (Daily Loop)

Urutan eksekusi harian di aplikasi dirancang mengikuti energi fokus otak:

1. **Tahap 1 — Review SRS Jatuh Tempo (20–30 Menit):**
   * Kerjakan semua item yang `next_review_at <= sekarang`.
   * Tidak ada item baru sebelum review selesai (mencegah utang hafalan).
2. **Tahap 2 — Belajar Materi Baru: Batch A (10 Menit):**
   * Pelajari **4 Kosakata + 1 Kanji** baru (tampilan kartu perkenalan + audio + kalimat contoh).
   * Langsung diikuti mini-kuis campuran (Pilihan Ganda + Ketik) sampai 100% benar.
3. **Tahap 3 — Belajar Materi Baru: Batch B (10 Menit):**
   * Pelajari **4 Kosakata + 1 Kanji** sisanya dengan pola yang sama.
4. **Tahap 4 — Speaking Micro-Drill (5 Menit):**
   * Aplikasi menampilkan 8 kalimat contoh dari kosakata baru hari itu. User diminta membaca keras (shadowing) mengikuti audio TTS. Klik `[Selesai Hari Ini]`.

---

## 6. Master Roadmap 1 Tahun (26 Sprint / 52 Minggu)

Setiap Sprint berdurasi **2 Minggu (14 Hari)** = **112 Kosakata + 28 Kanji**.
Materi menggabungkan urutan *Minna no Nihongo* (MNN) Bab 1–50 dengan kosakata percakapan riil sehari-hari agar sinkron antara teori tata bahasa dan kelancaran bicara.

### Fase 1: Fondasi Bertahan Hidup & MNN Bab 1–25 (Sprint 01–09 | Bulan 1–4,5)
*Target kumulatif Fase 1: 1.008 Kosakata + 252 Kanji (Setara JLPT N5 Solid + Dasar N4)*

| File Sprint | Minggu | Fokus Materi (MNN + Daily Life) | Fokus Kanji (28/Sprint) |
| :--- | :---: | :--- | :--- |
| `SPRINT_01.md` | 1–2 | MNN Bab 1–3 + Perkenalan, Benda Sekitar, Lokasi & Arah | Angka (1–10, 100, 1000, 10000), Hari (Senin–Minggu), Orang/Negara |
| `SPRINT_02.md` | 3–4 | MNN Bab 4–6 + Waktu, Rutinitas Harian, Makan & Minum | Waktu (Jam, Menit, Pagi, Siang, Malam, Tahun, Bulan), Aktivitas Dasar |
| `SPRINT_03.md` | 5–6 | MNN Bab 7–9 + Pemberian, Kata Sifat Dasar (-i/-na), Hobi | Ukuran/Sifat (Besar, Kecil, Baru, Lama, Tinggi, Murah, Banyak, Sedikit) |
| `SPRINT_04.md` | 7–8 | MNN Bab 10–12 + Keberadaan, Satuan Hitung (Counter), Cuaca | Posisi (Atas, Bawah, Dalam, Luar, Depan, Belakang, Kiri, Kanan), Alam |
| `SPRINT_05.md` | 9–10 | MNN Bab 13–15 + Keinginan, Permintaan (Te-form), Izin/Larangan | Kata Kerja Inti 1 (Pergi, Datang, Pulang, Lihat, Dengar, Bicara, Baca, Tulis) |
| `SPRINT_06.md` | 11–12 | MNN Bab 16–18 + Urutan Aktivitas, Bentuk Nai, Bentuk Kamus | Anggota Tubuh & Transportasi (Tangan, Kaki, Mata, Mulut, Mobil, Stasiun) |
| `SPRINT_07.md` | 13–14 | MNN Bab 19–21 + Pengalaman (Ta-form), Bentuk Biasa Dasar, Opini | Keluarga & Sosial (Ayah, Ibu, Kakak, Adik, Teman, Sekolah, Perusahaan) |
| `SPRINT_08.md` | 15–16 | MNN Bab 22–24 + Modifikasi Kata Benda, Kondisi, Memberi/Menerima | Pakaian, Rumah & Tempat Umum (Toko, Rumah Sakit, Bank, Kamar, Pintu) |
| `SPRINT_09.md` | 17–18 | MNN Bab 25 + Survival Harian (Konbini, Belanja, Naik Kereta, Restoran) | Konsolidasi Kanji N5 & Papan Petunjuk Umum (Masuk, Keluar, Buka, Tutup) |

### Fase 2: Transisi Percakapan Kerja & MNN Bab 26–50 (Sprint 10–18 | Bulan 4,5–9)
*Target kumulatif Fase 2: 2.016 Kosakata + 504 Kanji (Setara JLPT N4 Penuh + Dasar Kerja)*

| File Sprint | Minggu | Fokus Materi (MNN + Daily Life) | Fokus Kanji (28/Sprint) |
| :--- | :---: | :--- | :--- |
| `SPRINT_10.md` | 19–20 | MNN Bab 26–28 + Penjelasan (~ndesu), Potensial, Sambil (~nagara) | Kata Kerja Inti 2 (Bekerja, Bergerak, Berhenti, Mulai, Selesai, Pikir) |
| `SPRINT_11.md` | 21–22 | MNN Bab 29–31 + Transitif/Intransitif, Persiapan, Bentuk Maksud | Keadaan & Perubahan (Pecah, Hilang, Penuh, Kosong, Sama, Beda) |
| `SPRINT_12.md` | 23–24 | MNN Bab 32–34 + Saran/Prediksi, Perintah/Larangan, Cara Melakukan | Kesehatan & Keselamatan (Sakit, Obat, Bahaya, Aman, Hati-hati, Kuat) |
| `SPRINT_13.md` | 25–26 | MNN Bab 35–37 + Pengandaian (~ba), Tujuan, Kalimat Pasif | Kata Kerja Interaksi (Bantu, Tolong, Ajar, Belajar, Kirim, Terima, Pinjam) |
| `SPRINT_14.md` | 27–28 | MNN Bab 38–40 + Nominalisasi, Sebab-Akibat, Pertanyaan Tidak Langsung | Perasaan & Evaluasi (Senang, Sedih, Marah, Khawatir, Penting, Sulit) |
| `SPRINT_15.md` | 29–30 | MNN Bab 41–43 + Pemberian Sopan, Tujuan (~tame ni), Penampilan | Lingkungan & Kota (Jalan, Jembatan, Taman, Gedung, Listrik, Udara) |
| `SPRINT_16.md` | 31–32 | MNN Bab 44–46 + Berlebihan (~sugimasu), Kondisi (~baai), Baru Saja | Waktu & Frekuensi Lanjutan (Segera, Tiba-tiba, Selalu, Biasanya, Khusus) |
| `SPRINT_17.md` | 33–34 | MNN Bab 47–48 + Kabar Angin (~sou/~you), Kalimat Kausatif | Komunikasi & Informasi (Berita, Suara, Arti, Alasan, Masalah, Jawaban) |
| `SPRINT_18.md` | 35–36 | MNN Bab 49–50 + Keigo Dasar (Sonkeigo & Kenjougo di Tempat Kerja) | Kanji Bisnis & Layanan Dasar (Tamu, Hormat, Hubungi, Konfirmasi, Pesan) |

### Fase 3: Percakapan Alami Sehari-hari & N3 Inti (Sprint 19–26 | Bulan 9–12)
*Target kumulatif Fase 3: 2.912 Kosakata + 728 Kanji (Lancar Percakapan Harian + N3 Inti)*

| File Sprint | Minggu | Fokus Materi (Real-World Japanese) | Fokus Kanji (28/Sprint) |
| :--- | :---: | :--- | :--- |
| `SPRINT_19.md` | 37–38 | Bahasa Kasual (Futsukei, Singkatan Lisan: ~teru, ~chau, ~jan) & Aizuchi | Kanji Kata Kerja Abstrak 1 (Putuskan, Pilih, Bandingkan, Ubah, Lanjut) |
| `SPRINT_20.md` | 39–40 | Urusan Domestik di Jepang (Apartemen, Tagihan, Bank, Pos, Sampah) | Kanji Administrasi (Kontrak, Biaya, Bayar, Daftar, Bukti, Alamat, Tanda) |
| `SPRINT_21.md` | 41–42 | Kesehatan, Gejala di Klinik, Kondisi Fisik & Mental Sehari-hari | Kanji Medis & Tubuh Lanjutan (Demam, Luka, Darah, Periksa, Sembuh) |
| `SPRINT_22.md` | 43–44 | Bahasa Kerja & Operasional (Horenso, Meeting, Laporan, Kendala) | Kanji Kerja & Proyek (Tugas, Rencana, Hasil, Laporan, Tanggung Jawab) |
| `SPRINT_23.md` | 45–46 | Hubungan Sosial, Ngobrol Santai, Mengajak, Menolak Secara Halus | Kanji Karakter & Sifat Manusia (Ramah, Jujur, Serius, Sabar, Percaya) |
| `SPRINT_24.md` | 47–48 | Kata Penghubung (Setsuzokushi) & Penanda Wacana agar Bicara Mengalir | Kanji Logika & Relasi (Hubungan, Pengaruh, Penyebab, Syarat, Contoh) |
| `SPRINT_25.md` | 49–50 | Onomatope (Giongo/Gitaigo) Paling Sering Dipakai (Pika-pika, Bikkuri, dll.) | Kanji Kata Kerja Abstrak 2 (Coba, Gagal, Berhasil, Tumbuh, Selesaikan) |
| `SPRINT_26.md` | 51–52 | N3 Core High-Frequency Vocabulary & Konsolidasi Percakapan Bebas | Kanji Umum Berita & Media Harian (Masyarakat, Ekonomi, Budaya, Dunia) |