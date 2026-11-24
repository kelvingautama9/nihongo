# 02_SPEAKING_BRIDGE.md — Jembatan Percakapan & Tata Bahasa Operasional

Dokumen ini adalah modul pendukung percakapan (*speaking engine*) untuk menghubungkan kosakata dan kanji di file `SPRINT_01.md`–`SPRINT_26.md` menjadi kemampuan berbicara aktif. Seluruh aturan ditulis dalam format **rumus operasional** siap pakai.

---

## 1. Identifikasi & Konjugasi Kata Kerja (`VERB_G1`, `VERB_G2`, `VERB_G3`)

Untuk lancar berbicara, kamu tidak perlu menghafal 20 jenis konjugasi sekaligus. Kuasai **5 Bentuk Inti** ini terlebih dahulu karena 85% percakapan harian dibangun dari kelima bentuk ini.

### 1.1 Cara Cepat Mengenali Grup Kata Kerja (Dari Bentuk `~masu` di MNN)

| Grup | Kode Enum | Ciri pada Bentuk `~masu` | Contoh |
| :--- | :--- | :--- | :--- |
| **Grup 3 (Irregular)** | `VERB_G3` | Hanya 2 kata: **します** (*shimasu*) dan **来ます** (*kimasu*), beserta gabungannya. | 勉強します (*benkyou shimasu*), 来ます (*kimasu*) |
| **Grup 2 (Ichidan)** | `VERB_G2` | Sebelum `masu` berakhiran bunyi **-e** (e, ke, se, te, ne, be, me, re), plus beberapa pengecualian pendek berbunyi **-i**. | 食べます (*tabemasu*), 見ます (*mimasu*), 起きます (*okimasu*) |
| **Grup 1 (Godan)** | `VERB_G1` | Sebelum `masu` berakhiran bunyi **-i** (i, ki, gi, shi, chi, ni, bi, mi, ri). | 飲みます (*nomimasu*), 行きます (*ikimasu*), 話します (*hanashimasu*) |

### 1.2 Matriks 5 Bentuk Wajib Bicara

| Bentuk | Fungsi Utama dalam Percakapan | Rumus `VERB_G1` (Contoh: 飲みます / *nomimasu*) | Rumus `VERB_G2` (Contoh: 食べます / *tabemasu*) | Rumus `VERB_G3` (する / 来る) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Bentuk Masu** (*Teinei*) | Sopan standar (kantor, orang asing, atasan) | 飲みます (*nomimasu*) | 食べます (*tabemasu*) | します (*shimasu*) / 来ます (*kimasu*) |
| **2. Bentuk Kamus** (*Futsukei*) | Kasual (teman), sebelum `koto`, `mae ni`, `tsumori` | Ubah vokal **i → u**: 飲む (*nomu*) | Ganti `masu` → **る**: 食べる (*taberu*) | する (*suru*) / 来る (*kuru*) |
| **3. Bentuk Te** (*Te-form*) | Menyambung kalimat, meminta (`~te kudasai`), sedang (`~te iru`) | Lihat Tabel 1.3: 飲んで (*nonde*) | Ganti `masu` → **て**: 食べて (*tabete*) | して (*shite*) / 来て (*kite*) |
| **4. Bentuk Nai** (*Negatif Kasual*) | Menolak kasual, larangan (`~naide`), wajib (`~nakereba`) | Ubah vokal **i → a** + ない: 飲まない (*nomanai*) *(Catatan: `i` murni → **wa**nai)* | Ganti `masu` → **ない**: 食べない (*tabenai*) | しない (*shinai*) / 来ない (*konai*) |
| **5. Bentuk Ta** (*Lampau Kasual*) | Lampau kasual, pengalaman (`~ta koto ga aru`), saran (`~ta hou ga ii`) | Sama persis dengan Bentuk Te, ganti **e → a**: 飲んだ (*nonda*) | Ganti `masu` → **た**: 食べた (*tabeta*) | した (*shita*) / 来た (*kita*) |

### 1.3 Tabel Kilat Bentuk Te (`VERB_G1`) — Wajib Hafal Mati

| Akhiran sebelum `masu` | Berubah Menjadi | Contoh (`Masu` → `Te` → `Ta`) | Romaji |
| :--- | :---: | :--- | :--- |
| `i`, `chi`, `ri` | **って** (*tte*) | 会います → 会って → 会った | *aimasu → atte → atta* |
| `mi`, `bi`, `ni` | **んで** (*nde*) | 飲みます → 飲んで → 飲んだ | *nomimasu → nonde → nonda* |
| `ki` | **いて** (*ite*) | 書きます → 書いて → 書いた | *kakimasu → kaite → kaita* |
| `gi` | **いで** (*ide*) | 泳ぎます → 泳いで → 泳いだ | *oyogimasu → oyoide → oyoida* |
| `shi` | **して** (*shite*) | 話します → 話して → 話した | *hanashimasu → hanashite → hanashita* |
| **Pengecualian Tunggal** | **って** (*tte*) | 行きます → 行って → 行った | *ikimasu → itte → itta* |

> **Pengecualian Kritis Bentuk Nai:** Kata kerja ある (*aru* / ada) bentuk negatif kasualnya adalah **ない** (*nai*), bukan *aranai*.

---

## 2. Konjugasi Kata Sifat (`ADJ_I` & `ADJ_NA`)

### 2.1 Kata Sifat -i (`ADJ_I`) — Contoh: 高い (*takai* = mahal/tinggi)

| Kondisi | Bentuk Sopan (*Polite*) | Bentuk Kasual (*Casual*) | Arti |
| :--- | :--- | :--- | :--- |
| **Positif** | 高いです (*takai desu*) | 高い (*takai*) | Mahal |
| **Negatif** | 高くないです (*takakunai desu*) | 高くない (*takakunai*) | Tidak mahal |
| **Lampau (+)** | 高かったです (*takakatta desu*) | 高かった (*takakatta*) | Tadi/dulu mahal |
| **Lampau (-)** | 高くなかったです (*takakunakatta desu*) | 高くなかった (*takakunakatta*) | Tadi/dulu tidak mahal |

> **Pengecualian Tunggal `ADJ_I`:** **いい** (*ii* = bagus) berubah memakai akar kata **よ** (*yo*): よくない (*yokunai*), よかった (*yokatta*), よくなかった (*yokunakatta*).

### 2.2 Kata Sifat -na (`ADJ_NA`) & Kata Benda (`NOUN`) — Contoh: 暇 (*hima* = senggang)

| Kondisi | Bentuk Sopan (*Polite*) | Bentuk Kasual (*Casual*) | Arti |
| :--- | :--- | :--- | :--- |
| **Positif** | 暇です (*hima desu*) | 暇だ (*hima da*) | Senggang |
| **Negatif** | 暇じゃないです (*hima janai desu*) | 暇じゃない (*hima janai*) | Tidak senggang |
| **Lampau (+)** | 暇でした (*hima deshita*) | 暇だった (*hima datta*) | Tadi senggang |
| **Lampau (-)** | 暇じゃなかったです (*hima janakatta desu*) | 暇じゃなかった (*hima janakatta*) | Tadi tidak senggang |

> **Aturan Modifikasi Kata Benda:** Saat diletakkan *sebelum* kata benda, `ADJ_I` langsung tempel (高い本 / *takai hon*), sedangkan `ADJ_NA` wajib tambah **な** (静かな部屋 / *shizuka na heya*).

---

## 3. Partikel Inti Percakapan (Core Particle Map)

Partikel adalah "lem" pembentuk makna. Kesalahan partikel membuat lawan bicara salah paham siapa pelaku dan siapa korbannya.

| Partikel | Fungsi Operasional | Contoh Kalimat | Romaji & Arti |
| :---: | :--- | :--- | :--- |
| **は** (*wa*) | Penanda **topik** pembicaraan ("Kalau soal X...") | 私は会社員です。 | *Watashi wa kaishain desu.* (Saya karyawan.) |
| **が** (*ga*) | Penanda **subjek/fokus baru**, objek dari suka/bisa/ada | 日本語が分かります。 | *Nihongo ga wakarimasu.* (Saya paham bahasa Jepang.) |
| **を** (*o*) | Penanda **objek langsung** yang dikenai aksi | コーヒーを飲みます。 | *Koohii o nomimasu.* (Minum kopi.) |
| **に** (*ni*) | **Tujuan arah**, **waktu spesifik**, **lokasi diam** (`imasu/arimasu`), **penerima** | ７時に駅に行きます。 | *Shichiji ni eki ni ikimasu.* (Jam 7 pergi ke stasiun.) |
| **で** (*de*) | **Lokasi aktivitas aktif**, **alat/kendaraan**, **bahasa** | 電車で会社へ行きます。 | *Densha de kaisha e ikimasu.* (Ke kantor naik kereta.) |
| **の** (*no*) | **Kepemilikan** / penghubung 2 kata benda (dibalik dari ID) | 私のスマホ | *Watashi no sumaho* (HP milik saya) |
| **と** (*to*) | **"Dan"** (daftar lengkap) / **"Bersama"** orang | 友達と食べます。 | *Tomodachi to tabemasu.* (Makan bersama teman.) |
| **も** (*mo*) | **"Juga"** (menggantikan `wa`, `ga`, `o`) | これもください。 | *Kore mo kudasai.* (Minta yang ini juga.) |
| **から / まで** | **"Dari / Sampai"** (waktu atau tempat); `kara` di akhir klausa = **"Karena"** | ９時から５時まで働きます。 | *Kuji kara goji made hatarakimasu.* (Kerja dari jam 9 sampai 5.) |
| **よ / ね** | Akhir kalimat: **よ** (memberi tahu info baru), **ね** (mencari persetujuan / "kan?") | 今日は暑いですね。 | *Kyou wa atsui desu ne.* (Hari ini panas, ya.) |

---

## 4. 15 Pola Kalimat "Swiss Army Knife" (Template Bicara Harian)

Pasang kosakata dari file `SPRINT` ke dalam 15 kerangka ini untuk langsung melatih produksi kalimat aktif.

| No | Pola Kalimat | Fungsi / Arti | Contoh Praktis |
| :---: | :--- | :--- | :--- |
| 1 | `[V-masu stem] + たいです` (*~tai desu*) | **Ingin** melakukan sesuatu | 日本で働きたいです。 (*Nihon de hatarakitai desu.*) |
| 2 | `[V-te] + ください` (*~te kudasai*) | **Tolong** lakukan... | ちょっと待ってください。 (*Chotto matte kudasai.*) |
| 3 | `[V-te] + います` (*~te imasu*) | **Sedang** berlangsung / kondisi menetap | 今、日本語を勉強しています。 (*Ima, nihongo o benkyou shite imasu.*) |
| 4 | `[V-te] + もいいですか` (*~te mo ii desu ka*) | **Bolehkah** saya...? | ここに座ってもいいですか。 (*Koko ni suwatte mo ii desu ka.*) |
| 5 | `[V-te] + はいけません` (*~te wa ikemasen*) | **Tidak boleh** / dilarang | ここで写真を撮ってはいけません。 (*Koko de shashin o totte wa ikemasen.*) |
| 6 | `[V-nai stem] + なければなりません` | **Harus** melakukan... | 明日早く起きなければなりません。 (*Ashita hayaku okinakereba narimasen.*) |
| 7 | `[V-nai] + でください` (*~naide kudasai*) | **Tolong jangan**... | 心配しないでください。 (*Shinpai shinaide kudasai.*) |
| 8 | `[V-ta] + ことがあります` (*~ta koto ga arimasu*) | **Pernah** melakukan... | 東京へ行ったことがあります。 (*Toukyou e itta koto ga arimasu.*) |
| 9 | `[V-kamus] + ことができます` (*~koto ga dekimasu*) | **Bisa** melakukan... | 漢字を読むことができます。 (*Kanji o yomu koto ga dekimasu.*) |
| 10 | `[V-ta] + ほうがいいです` (*~ta hou ga ii desu*) | **Sebaiknya**... (saran) | 早く寝たほうがいいです。 (*Hayaku neta hou ga ii desu.*) |
| 11 | `[Futsukei] + と思います` (*~to omoimasu*) | **Menurut saya** / Saya rasa... | 明日は雨だと思います。 (*Ashita wa ame da to omoimasu.*) |
| 12 | `[Futsukei] + んです` (*~ndesu*) | **Menjelaskan alasan** / situasi (sangat natural) | 頭が痛いんです。 (*Atama ga itain desu.* — Kepala saya sakit, lho.) |
| 13 | `[Alasan] + から / ので、[Hasil]` | **Karena**... (`node` lebih sopan & halus) | 忙しいので、行けません。 (*Isogashii node, ikemasen.*) |
| 14 | `[V-kamus] + つもりです` (*~tsumori desu*) | **Berencana** / berniat... | 来年日本へ行くつもりです。 (*Rainen Nihon e iku tsumori desu.*) |
| 15 | `[Kalimat A] + けど、[Kalimat B]` (*~kedo*) | **Tetapi** / pembuka kalimat halus | すみませんが、ちょっと聞きたいんですけど… (*Permisi, saya mau tanya sebentar...*) |

---

## 5. Jembatan Bahasa Lisan (Yang Tidak Diajarkan Buku Teks)

Buku teks seperti *Minna no Nihongo* menggunakan bentuk baku. Di percakapan nyata Jepang, penutur asli hampir selalu menyingkat bentuk-bentuk berikut. Kamu wajib mengenali telinganya agar tidak bingung saat mendengar orang Jepang berbicara.

### 5.1 Tabel Kontraksi Lisan Wajib Tahu

| Bentuk Buku Teks | Bentuk Lisan Nyata | Romaji | Contoh & Arti |
| :--- | :--- | :--- | :--- |
| `~て いる` (*~te iru*) | **~てる** | *~teru* | 何してるの？ (*Nani shiteru no?* — Lagi ngapain?) |
| `~て しまう` (*~te shimau*) | **~ちゃう** | *~chau* | 忘れちゃった！ (*Wasurechatta!* — Aduh, kelupaan!) |
| `~で しまう` (*~de shimau*) | **~じゃう** | *~jau* | 飲んじゃった。 (*Nonjatta.* — Terlanjur diminum.) |
| `~なければ ならない` | **~なきゃ** / **~なくちゃ** | *~nakya* | もう行かなきゃ。 (*Mou ikanakya.* — Harus pergi sekarang.) |
| `~て おく` (*~te oku*) | **~とく** | *~toku* | 買っとくね。 (*Kattoku ne.* — Nanti kubelikan ya.) |
| `~の です` (*~no desu*) | **~んです** | *~ndesu* | どうしたんですか？ (*Doushitan desu ka?* — Ada apa?) |
| `~では ない` (*~dewa nai*) | **~じゃない** | *~janai* | そうじゃないよ。 (*Sou janai yo.* — Bukan begitu.) |
| `~の` (di akhir klausa) | **~ん** (sebelum `da/desu`) | *~n* | 明日行くんだけど… (*Ashita ikun da kedo...* — Besok aku mau pergi sih...) |
| `~らない` (akhiran `ra/ri/ru`) | **~んない** | *~nnai* | 分かんない。 (*Wakannai.* — Nggak tahu / nggak paham.) |

### 5.2 Aizuchi (Respon Pendengar) & Filler (Jeda Berpikir)

Dalam budaya percakapan Jepang, diam saat orang lain berbicara dianggap tidak mendengarkan. Gunakan **Aizuchi** untuk menjaga ritme percakapan, dan gunakan **Filler** saat kamu butuh waktu 2–3 detik untuk memikirkan kosakata.

| Kategori | Ungkapan JP | Romaji | Fungsi & Nuansa |
| :--- | :--- | :--- | :--- |
| **Aizuchi** | そうですね | *Sou desu ne* | "Betul juga ya" / setuju dengan lawan bicara |
| **Aizuchi** | なるほど | *Naruhodo* | "Oh begitu, masuk akal" (pakai ke teman/setara, hindari ke atasan) |
| **Aizuchi** | たしかに | *Tashika ni* | "Benar juga sih" (sangat sering dipakai sehari-hari) |
| **Aizuchi** | 本当ですか？ / マジで？ | *Hontou desu ka? / Maji de?* | "Benarkah?" (sopan) / "Seriusan?" (sangat kasual) |
| **Aizuchi** | へえ、すごいですね | *Hee, sugoi desu ne* | "Wah, keren ya" (menunjukkan ketertarikan) |
| **Filler** | えーと… | *Eeto...* | "Emm..." (saat mengingat informasi/angka) |
| **Filler** | あのう… | *Anou...* | "Anu / Permisi..." (pembuka sopan saat mau bicara ke orang) |
| **Filler** | なんていうか… | *Nante iu ka...* | "Gimana ya bilangnya..." (saat mencari padanan kata) |
| **Penyelamat** | もう一度お願いします | *Mou ichido onegaishimasu* | "Tolong ulangi sekali lagi" (wajib hafal di minggu pertama) |
| **Penyelamat** | ゆっくり話してください | *Yukkuri hanashite kudasai* | "Tolong bicara lebih pelan" |

---

## 6. Spesifikasi Fitur Speaking di Website (Integrasi Modul)

Untuk mengaktifkan file ini di dalam aplikasi web-mu, implementasikan 2 fitur ringan berikut:

1. **Tab "Grammar Cheat Sheet" (Akses Cepat saat Kuis):**
   * Sediakan tombol ikon `[Buku / Tata Bahasa]` di pojok layar kuis yang membuka *drawer/modal* berisi ringkasan Tabel Konjugasi (Bagian 1–2) dan Partikel (Bagian 3) tanpa mereset sesi kuis yang sedang berjalan.
2. **Mode Latihan "Slot Substitution Drill" (Latihan Bicara 5 Menit/Hari):**
   * Ambil 1 pola acak dari Bagian 4 (misal: `[V-tai desu]`).
   * Ambil 5 kata kerja yang sudah mencapai `SRS Stage >= 2` dari database user.
   * Minta user **mengucapkan keras-keras** (atau mengetik) hasil konjugasinya (misal: `食べます` → `食べたいです`) lalu bandingkan dengan audio Web Speech API (`ja-JP`).