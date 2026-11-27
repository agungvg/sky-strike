# MINI MEASURE SHEET — jet-v4 ("SKY STRIKE v4")
# Best Flight Game — 2026-11-27, built on jet-v3 (SKY STRIKE 01a21b7c).
# Detail pass after the REF2 scout (REF2-SCOUT-2026-11-27.md): ref2's
# "Flight Game v4 — lighter render, richer airfield" beats v3 on Look +
# Feel (~21.0 vs ~20.0–20.5) and loses on Complete + Fun. v4 takes ref2's
# detail ON TOP of Sky Strike — kaiju, missiles, cockpit, storm, 6 sorties
# all kept — plus a 7th sortie (KAIJU vs ULTRA) and a full cockpit.
# Target submit: FINAL Sabtu 28 Nov 07:57 WIB (BUKAN R3). JANGAN submit
# tanpa tap Lyso atas 4 PNG baru — Force_Last menggantikan 01a21b7c.

## CONCEPT: "SKY STRIKE v4" — everything v3 had, in bright daylight
# White-and-blue Falcon-7 (canvas livery: blue cheatline + window row),
# textured green terrain (field patchwork, 1000 pines), turquoise sea +
# sun glitter, puffy 3D cloud deck, rich airfield (runway "36" paint,
# terminal red roof + windows, hangar, taxiway, apron, parked Falcon-7),
# full cockpit (8 gauges + MFD + 12 switches + lamp strip + HUD glass +
# visor reflection), ULTRA-1 giant beaming KAIJU-1 on the beach, itemized
# debrief with GOLD medal + NEW SESSION BEST. 7 sorties, day palette.

## PRE-BUILD RATINGS (target vs refs, /5 per kriteria)
# Kriteria            Target  Alpine  Aurora  Solstice  High Tarn  Ref2
# 1. Complete game     4.5     3.5     4.5     4.5       4.5       4.0
# 2. Fun & depth       5.0     3.0     4.5     4.0       5.0       4.0
# 3. Feel & polish     4.5     3.5     4.0     4.0       4.5       4.5
# 4. Look & original.  5.0     4.5     4.5     4.5       5.0       4.5
# 5. Structure         4.5     3.0     4.0     4.5       5.0       4.0
# TOTAL /25           23.5    17.5    21.5    21.5      24.0      21.0
# Realistis (dari yang kelihatan di 4 shot): ~21.0–21.5/25 — Look +0.5,
# Feel +0.5 atas v3. Bukan janji menang: ref2 ~21.0, High Tarn 24.0.

## 4 SHOTS (dossier = produk; fitur yang tak kelihatan = tak dinilai)
# ANGKA STAGING SENDIRI — jangan pakai angka ref2/Aurora/Alpine:
# 1. COVER — day chase over the green coast: white/blue Falcon-7 besar,
#    afterburner, bank 16°, sun disc in frame, gate G-02 523 m, runway +
#    terminal below. SPD 284 KT / ALT 873 FT / HDG 000, gates 1/7,
#    score 2146, fuel 68%.
# 2. COCKPIT — final RWY 36, 350 m out, 6-degree glide, PAPI LOCK:
#    8 gauges + MFD tactical + 12 switches + 6 lamps + yoke + throttle
#    + HUD combiner glass + visor glare; runway "36" fills the glass.
#    SPD 132 KT / ALT 259 FT / VSI -1076, fuel 49%, score 4762.
# 3. KAIJU vs ULTRA — sortie 07 battle on the beach: ULTRA-1 (~100 m,
#    silver + red, Color Timer) beaming KAIJU-1's chest while the kaiju
#    answers with blue atomic breath; Falcon-7 missile + smoke trail +
#    fireball on the kaiju (boss HP 62%), WARSHIP-1 sunk left,
#    WARSHIP-2 intact right. KILLS 1/1, score 6890, fuel 23%.
# 4. MAP + DEBRIEF — campaign map 7 sorties + S debrief: GOLD medal,
#    9,218 pts, NEW SESSION BEST, itemized breakdown that sums to the
#    total (+5,000 +2,600 +2,000 −274 −108), over the live day scene
#    (runway "36", terminal, hangar, parked Falcon-7).

## GATE (C0)
# game/ ≤993 entries ≤48 MiB, index.html ≤1 MiB, zero network refs, 4 shots
# 1280x720 JPG ≤256 KiB (screenshots/) + PNG (preview-png/), dossier.json
# byte-identical (main.ts 2x), 0 console errors, LICENSE MIT, main.ts
# ditulis baru (bukan copy starter — thinking_reproduces), Three.js r187
# HANYA *.min.js di game/vendor/. Selftest in-browser: 30/30 PASS
# (24 lama + 6 baru: ultra visible/hidden/beam, day palette, mission 7,
# debrief breakdown sums to score).

## REVISI v4 (setelah review mata sendiri, 2 ronde)
# - Sun day y 0.55 -> 0.45 -> 0.35: disc harus masuk frame cover (FOV 62°,
#   elevasi ~23°). SnowLine 700 -> 900: mid-peaks tidak lagi putih pucat.
# - ULTRA-1 scale 1.0 -> 2.5 (~100 m): ronde 1 dia kecil kayak robot
#   mainan di samping kaiju 126 m. Kaiju yaw 0.8 -> 0.55 (3/4 ke kamera:
#   dada + breath kebaca), skin 0x5c6e4e -> 0x6f8a58 (terlalu gelap).
# - Kokpit pose z 1550 -> 1150 (350 m out, runway isi frame; gate rings
#   disembunyikan karena sudah dilewati), fireball ditarik ke arah kamera
#   (-8x, +14z) supaya tidak ketutup dada kaiju/diamond.
# - Supersampling 2x tetap (2560x1440 -> LANCZOS 1280x720).
