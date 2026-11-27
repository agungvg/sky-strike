# MINI MEASURE SHEET — jet-v3 ("SKY STRIKE")
# Best Flight Game — 2026-11-27 ~10:45 WIB, BEFORE any code.
# Build ke-3 untuk bounty yang sama. Aurora Ridge (alpine-v2) sudah submit,
# Lyso minta yang lebih bagus: JET tempur + serangan rudal.
# JANGAN kit-check / submit / bundle — itu urusan parent/coordinator.
# Target: 4 shot layak PALING LAMBAT Jumat 16:00 WIB.
# Cut scope 15:00 WIB kalau belum ada 4 shot layak — kualitas 4 shot > fitur.

## CONCEPT: "SKY STRIKE" — jet tempur "FALCON-7" (pilot Lyso, callsign "SKY STRIKE")
# "Alpine tapi lengkap" + JET + RUDAL: jet besar terang di cover (Alpine),
# kokpit 8+ gauge + HUD symbology rudal (Ember/Aurora), badai petir beneran
# (Aurora), campaign map 6 sortie + debrief (Aurora), sesi di atas awan +
# matahari indah (Aurora sortie 04), PLUS serangan rudal beneran:
# lock-on (diamond + range + LOCK/SHOOT), rudal meluncur + jejak asap,
# kapal perang / menara radar meledak, skor kill.
# Dunia gabungan: pegunungan bersalju (utara) + LAUT glitter (selatan) +
# garis pantai + foam + kapal target + desa/mercusuar/turbin.
# 6 sortie: 01 Coastal Gate Run · 02 Sea Strike · 03 Storm Strike ·
# 04 Above the Clouds · 05 Ridge Strike · 06 Night Intercept.

## PRE-BUILD RATINGS (target kita vs refs, /5 per kriteria)
# Kriteria            Target  Alpine  Aurora  Solstice  High Tarn
# 1. Complete game     4.5     3.5     4.5     4.5       4.5
# 2. Fun & depth       5.0     3.0     4.5     4.0       5.0
# 3. Feel & polish     4.5     3.5     4.0     4.0       4.5
# 4. Look & original.  5.0     4.5     4.5     4.5       5.0
# 5. Structure         4.5     3.0     4.0     4.5       5.0
# TOTAL /25           23.5    17.5    21.5    21.5      24.0
# Artinya: target kita ≈ High Tarn, di atas Alpine (+6.0) dan Aurora (+2.0).
# Rudal adalah pembeda utama: satu-satunya gameplay ofensif di antara refs —
# Fun 5.0 dan Look 5.0 hanya kalau shot 3 benar-benar menunjukkan rudal +
# ledakan (bukan sekadar HUD). Kalau rudal tidak kebaca di shot, Fun jatuh
# ke 4.0 dan total ke ~22.0. Ekspektasi realistis: ~20-80.

## 4 SHOTS (dossier = produk; fitur yang tak kelihatan = tak dinilai)
# ANGKA HARUS ORISINIL — jangan pakai angka Alpine (-123 FPM, 8.527 pts,
# 28%/95%) maupun Aurora (-187 FPM, 8.140 pts). Staging sendiri:
# 1. COVER — chase di atas laut + pegunungan: JET BESAR + terang (1/4-1/3
#    frame, 3/4 rear, banked 16°), afterburner menyala, sun disc besar,
#    glitter path di laut, gold gate G-02 523m, HUD: SPD 284 KT / ALT 2310 FT /
#    HDG 007, gates 1/7, score 2146, fuel 68%.
# 2. KOKPIT — landing RWY 36: 8+ gauge lit + switch row + yoke + throttle
#    quadrant + HUD glass (lock diamond + range + SHOOT cue), runway centred,
#    PAPI LOCK, SPD 132 KT / ALT 412 FT / VSI -1076, fuel 49%, score 4762.
# 3. STORM STRIKE — rudal + ledakan (WAJIB): rudal meluncur dari sayap
#    + jejak asap putih, kapal perang meledak (flash + bola api + asap),
#    "TARGET DESTROYED", langit hitam + kilat bercabang + hujan miring,
#    fuel 23% + STORM FRONT ETA 2:31 + LOW FUEL, score 6890, KILLS 1/2.
# 4. MAP + DEBRIEF — campaign map 6 sortie + bintang + debrief S atas
#    LIVE dusk scene: sink -164 FPM, centreline 3m, score 9218 PTS,
#    fuel 31% / hull 94%, time 6:47, peak G 2.1, gates 7/7, kills 2/2.

## GATE (C0)
# game/ ≤993 entries ≤48 MiB, index.html ≤1 MiB, zero network refs, 4 shots
# 1280x720 JPG ≤256 KiB (screenshots/), dossier.json byte-identical,
# main.ts exit 0 (2 run), 0 console errors, LICENSE MIT, main.ts ditulis
# baru (bukan copy starter/Aurora — thinking_reproduces), Three.js r187
# HANYA *.min.js di game/vendor/ (non-minified dihitung unwritten).
# Selftest in-browser: gate run, lock + fire + kill, landing, storm +
# lightning, semua 6 misi start.

## REVISI 2026-11-27 (shot 3 + supersampling, setelah review mata sendiri)
- Orientasi jet DIBALIK: main.js rotation.y = PI - heading (dulu nose ke
  kamera = black disc di bawah ekor). Nav light kiri/kanan ditukar.
  Sun golden y 0.20 -> 0.32 (dulu setengah tertutup puncak).
- Supersampling (Lyso "KURANG HD"): shoot.mjs render 2560x1440 -> PIL
  LANCZOS 1280x720 untuk preview-png + screenshots JPG; budget 20000.
- Shot 3 STORM -> SEA STRIKE vs KAIJU (Lyso "lawan kapal perang di pantai"
  + "ada Godzilla boleh ga si"): langit golden, bukan badai; KAIJU-1 boss
  3x scale (~126 m, ~9x tinggi kapal), duri punggung 2 lapis ujung biru
  menyala, sisik (ridge rings + scutes), mata menyala, rahang + gigi,
  ekor berotot, SEMBURAN API BIRU dari mulut ke langit (focal point).
  HUD "KAIJU-1"/"SEA KAIJU" saja (tanpa nama trademark). Kapal perang
  di-detail (bridge, 2 turret + laras, funnel + band merah, wake V,
  abu-abu baja). Boss HP 100, 1 rudal = 38 dmg (HP 62), mati di HP 0.
  Shot 3: jet (-420,90,1700), kaiju (-350,1450), WARSHIP-2 (-230,1470),
  WARSHIP-1 tenggelam (-520,1500), rudal 0.65 + smoke puffs, fireball
  freeze 0.2s (flash dikecilkan, fire 1.4x — 2.2x jadi bola pucat raksasa).
  Angka: KILLS 1/1, score 6.890, fuel 23%, boss 62%, lock 241 m.
- Selftest 24/24 PASS (21 lama + 3 kaiju: hit HP 62, hidup, tanpa kill).
- Dossier: main.ts 2x IDENTIK, 0 console errors, JPG <=256 KiB (verifikasi
  akhir di laporan). Git init + commit di akhir.
