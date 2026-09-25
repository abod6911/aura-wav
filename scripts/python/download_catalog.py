# -*- coding: utf-8 -*-
"""
Spotify Full Catalog Downloader (1,750 Tracks)
Connects directly to 'spotify_full_catalog_1750.csv'.
Supports:
- Multi-threaded high-speed downloads (yt-dlp)
- Automatic synced lyrics fetching (.lrc) via LRCLIB API saved alongside .mp3
- Integrated loudness calculation (EBU R128 LUFS) via ffmpeg + ID3 ReplayGain injection
- In-depth BPM tempo & Camelot Wheel harmonic key estimation via numpy FFT
- Full ID3 tagging (Title, Artist, Album, Genre, Track Number, TBPM, TKEY, TXXX)
"""

import os
import re
import sys
import csv
import time
import json
import argparse
import subprocess
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, ID3NoHeaderError, TBPM, TKEY, TXXX

# Ensure UTF-8 output in Windows PowerShell/CMD
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CSV = os.path.join(BASE_DIR, "spotify_full_catalog_1750.csv")
DEFAULT_OUTPUT_DIR = os.path.join(BASE_DIR, "Liked_Songs")
FFMPEG_PATH = r"C:\Users\abodv\.spotdl\ffmpeg.exe"
NODE_PATH = r"C:\Program Files\nodejs\node.exe"

# Harmonic key profile constants for Camelot Wheel estimation
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
MAJOR_CAMELOT = {0: '8B', 1: '3B', 2: '10B', 3: '5B', 4: '12B', 5: '7B', 6: '2B', 7: '9B', 8: '4B', 9: '11B', 10: '6B', 11: '1B'}
MINOR_CAMELOT = {0: '5A', 1: '12A', 2: '7A', 3: '2A', 4: '9A', 5: '4A', 6: '11A', 7: '6A', 8: '1A', 9: '8A', 10: '3A', 11: '10A'}

def sanitize_filename(name):
    """Sanitize strings for safe Windows/Linux file naming."""
    cleaned = re.sub(r'[\\/*?:"<>|]', '', name)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def fetch_and_save_lyrics(artist, title, mp3_path):
    """Fetch synced .lrc lyrics from LRCLIB and save alongside the .mp3 file."""
    lrc_path = os.path.splitext(mp3_path)[0] + ".lrc"
    if os.path.exists(lrc_path) and os.path.getsize(lrc_path) > 10:
        return True

    clean_artist = re.sub(r'\s*[\(\[].*?[\)\]]', '', artist).strip()
    clean_title = re.sub(r'\s*[\(\[].*?[\)\]]', '', title).strip()

    params = urllib.parse.urlencode({
        'artist_name': clean_artist,
        'track_name': clean_title,
    })
    url = f"https://lrclib.net/api/get?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'AURA.WAV/1.0'})

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode('utf-8'))
                synced = data.get('syncedLyrics') or data.get('plainLyrics')
                if synced:
                    with open(lrc_path, 'w', encoding='utf-8') as f:
                        f.write(synced)
                    return True
    except Exception:
        pass
    return False

def analyze_lufs(file_path):
    """Calculate integrated LUFS loudness using ffmpeg ebur128 filter."""
    if not os.path.exists(FFMPEG_PATH):
        return None
    try:
        cmd = [
            FFMPEG_PATH,
            "-hide_banner",
            "-nostats",
            "-i", file_path,
            "-filter_complex", "ebur128=peak=true",
            "-f", "null", "-"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
        match = re.search(r'Integrated loudness:\s+I:\s+([-\d.]+)\s+LUFS', res.stderr)
        if match:
            return float(match.group(1))
    except Exception:
        pass
    return None

def analyze_bpm_and_key(file_path):
    """Calculate tempo (BPM) and Camelot Wheel key using numpy audio analysis."""
    if not os.path.exists(FFMPEG_PATH):
        return None, None
    try:
        # Extract 35 seconds of 11,025Hz mono PCM audio
        cmd = [
            FFMPEG_PATH,
            "-hide_banner",
            "-nostats",
            "-t", "35",
            "-i", file_path,
            "-f", "s16le",
            "-ac", "1",
            "-ar", "11025", "-"
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=25)
        samples = np.frombuffer(res.stdout, dtype=np.int16).astype(np.float32) / 32768.0

        if len(samples) < 11025 * 5:
            return None, None

        # 1. BPM estimation via 20ms energy autocorrelation
        frame_size = int(11025 * 0.02)
        num_frames = len(samples) // frame_size
        energy = np.array([np.sqrt(np.mean(samples[i*frame_size:(i+1)*frame_size]**2)) for i in range(num_frames)])
        odf = np.maximum(0, np.diff(energy))
        frame_rate = 11025 / frame_size
        min_lag = int((frame_rate * 60) / 185)
        max_lag = int((frame_rate * 60) / 68)

        corr = [np.sum(odf[:-lag] * odf[lag:]) for lag in range(min_lag, max_lag)]
        best_lag = min_lag + int(np.argmax(corr))
        bpm = int(round((frame_rate * 60) / best_lag))
        if bpm < 85: bpm *= 2
        if bpm > 175: bpm //= 2

        # 2. Key estimation via Pitch Class Chroma correlation
        fft_size = 4096
        num_blocks = min(len(samples) // fft_size, 32)
        chroma = np.zeros(12, dtype=np.float32)
        freqs = np.fft.rfftfreq(fft_size, d=1.0 / 11025)
        valid_mask = (freqs >= 65) & (freqs <= 2000)
        midi_notes = np.round(69 + 12 * np.log2(freqs[valid_mask] / 440.0)).astype(int)
        pitch_classes = midi_notes % 12

        for b in range(num_blocks):
            block = samples[b * fft_size:(b + 1) * fft_size]
            spectrum = np.abs(np.fft.rfft(block))**2
            valid_spectrum = spectrum[valid_mask]
            for pc in range(12):
                chroma[pc] += np.sum(valid_spectrum[pitch_classes == pc])

        if np.sum(chroma) > 0:
            chroma /= np.sum(chroma)

        best_score = -1e9
        best_camelot = '8B'
        for root in range(12):
            maj_corr = np.sum(np.roll(chroma, -root) * MAJOR_PROFILE)
            min_corr = np.sum(np.roll(chroma, -root) * MINOR_PROFILE)
            if maj_corr > best_score:
                best_score = maj_corr
                best_camelot = MAJOR_CAMELOT[root]
            if min_corr > best_score:
                best_score = min_corr
                best_camelot = MINOR_CAMELOT[root]

        return bpm, best_camelot
    except Exception:
        return None, None

def tag_file(file_path, track):
    """Embed comprehensive ID3 tags, ReplayGain, BPM, and Camelot Key into MP3 file."""
    try:
        # Standard ID3 tags
        try:
            audio = EasyID3(file_path)
        except ID3NoHeaderError:
            audio = EasyID3()

        audio['title'] = track.get('title', '')
        audio['artist'] = track.get('artist', '')
        if track.get('category'):
            audio['album'] = f"{track.get('genre', '')} - {track.get('category', '')}"
        if track.get('genre'):
            audio['genre'] = track.get('genre', '')
        audio['tracknumber'] = str(track.get('number', 1))
        audio.save(file_path)

        # Acoustic DSP & DJ Metadata tags
        lufs = analyze_lufs(file_path)
        bpm, key = analyze_bpm_and_key(file_path)

        try:
            id3 = ID3(file_path)
        except ID3NoHeaderError:
            id3 = ID3()

        if lufs is not None:
            gain_db = -14.0 - lufs
            id3.add(TXXX(encoding=3, desc='replaygain_track_gain', text=[f"{gain_db:+.2f} dB"]))
            id3.add(TXXX(encoding=3, desc='replaygain_track_lufs', text=[f"{lufs:.2f} LUFS"]))
        if bpm:
            id3.add(TBPM(encoding=3, text=[str(bpm)]))
        if key:
            id3.add(TKEY(encoding=3, text=[key]))

        id3.save(file_path)
    except Exception as e:
        pass

def download_track(track, output_dir, total_count, progress_counter):
    """Download single track via yt-dlp search query, fetch lyrics, and tag metadata."""
    num = track['number']
    title = track['title']
    artist = track['artist']

    safe_title = sanitize_filename(title)
    safe_artist = sanitize_filename(artist)
    file_base = f"{num:04d} - {safe_artist} - {safe_title}"
    expected_mp3 = os.path.join(output_dir, f"{file_base}.mp3")

    # Check if already downloaded and valid
    if os.path.exists(expected_mp3) and os.path.getsize(expected_mp3) > 300 * 1024:
        fetch_and_save_lyrics(artist, title, expected_mp3)
        count = progress_counter(1)
        print(f"[{count:04d}/{total_count}] [موجود مسبقاً] {file_base}.mp3", flush=True)
        return {"number": num, "status": "exists", "file": expected_mp3}

    # Smart search for existing tracks in output_dir
    try:
        title_lower = safe_title.lower()
        artist_lower = safe_artist.lower()
        for fname in os.listdir(output_dir):
            if fname.lower().endswith('.mp3'):
                fn_low = fname.lower()
                if title_lower in fn_low and (artist_lower in fn_low or len(artist_lower.split()) > 1 and artist_lower.split()[0] in fn_low):
                    full_existing = os.path.join(output_dir, fname)
                    if os.path.getsize(full_existing) > 300 * 1024:
                        fetch_and_save_lyrics(artist, title, full_existing)
                        count = progress_counter(1)
                        print(f"[{count:04d}/{total_count}] [موجود مسبقاً] {fname}", flush=True)
                        return {"number": num, "status": "exists", "file": full_existing}
    except Exception:
        pass

    queries = [
        f"ytsearch1:{artist} - {title} audio",
        f"ytsearch1:{artist} {title} official audio",
        f"scsearch1:{artist} - {title}",
        f"scsearch1:{artist} {title}",
        f"ytsearch1:{artist} {title}"
    ]

    out_template = os.path.join(output_dir, f"{file_base}.%(ext)s")
    success = False
    last_err = None

    for q in queries:
        cmd = [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--ffmpeg-location", FFMPEG_PATH,
            "--no-playlist",
            "--no-warnings",
            "--quiet",
            "--js-runtimes", f"node:{NODE_PATH}",
            "-o", out_template,
            q
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=90)
            if res.returncode == 0 and os.path.exists(expected_mp3) and os.path.getsize(expected_mp3) > 200 * 1024:
                tag_file(expected_mp3, track)
                fetch_and_save_lyrics(artist, title, expected_mp3)
                success = True
                break
            else:
                last_err = res.stderr.strip() or f"Exit code {res.returncode}"
        except subprocess.TimeoutExpired:
            last_err = "Timeout"
        except Exception as ex:
            last_err = str(ex)

        time.sleep(0.5)

    count = progress_counter(1)
    if success:
        print(f"[{count:04d}/{total_count}] [تم التحميل ومعالجة DSP] {file_base}.mp3", flush=True)
        return {"number": num, "status": "success", "file": expected_mp3}
    else:
        print(f"[{count:04d}/{total_count}] [فشل] {file_base} (السبب: {last_err})", flush=True)
        return {"number": num, "status": "failed", "error": last_err}

def load_tracks_from_csv(csv_path, filter_genre=None, filter_artist=None, limit=None):
    """Load and filter catalog tracks from CSV."""
    if not os.path.exists(csv_path):
        print(f"❌ لم يتم العثور على ملف: {csv_path}")
        print("قم بتشغيل 'python export_music_dataset.py' أولاً لتوليد الملف.")
        sys.exit(1)

    tracks = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        idx = 1
        for row in reader:
            title = row.get('Song Title', '').strip()
            artist = row.get('Artist', '').strip()
            genre = row.get('Genre', '').strip()
            category = row.get('Category', '').strip()

            if filter_genre and filter_genre.lower() not in genre.lower():
                continue
            if filter_artist and filter_artist.lower() not in artist.lower():
                continue

            tracks.append({
                "number": idx,
                "title": title,
                "artist": artist,
                "genre": genre,
                "category": category
            })
            idx += 1

            if limit and len(tracks) >= limit:
                break

    return tracks

def main():
    parser = argparse.ArgumentParser(description="تنزيل مكتبة الموسيقى الشاملة مع معالجة DSP وكلمات الأغاني")
    parser.add_argument("--csv", default=DEFAULT_CSV, help="مسار ملف الـ CSV")
    parser.add_argument("--output", default=DEFAULT_OUTPUT_DIR, help="مجلد حفظ الأغاني")
    parser.add_argument("--genre", default=None, help="تصفية حسب النمط الموسيقي (مثلاً Pop أو Rock)")
    parser.add_argument("--artist", default=None, help="تصفية حسب فنان معين (مثلاً Drake أو The Weeknd)")
    parser.add_argument("--limit", type=int, default=None, help="الحد الأقصى لعدد الأغاني المراد تنزيلها")
    parser.add_argument("--workers", type=int, default=4, help="عدد خيوط التنزيل المتوازية (افتراضياً 4)")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    tracks = load_tracks_from_csv(args.csv, filter_genre=args.genre, filter_artist=args.artist, limit=args.limit)

    total_count = len(tracks)
    print("=================================================================")
    print(f"       🎵 بدء تنزيل ومعالجة مكتبة الموسيقى الشاملة ({total_count} أغنية)")
    print(f" 📂 مجلد الحفظ: {args.output}")
    print(f" ⚙️ خيوط التنزيل: {args.workers} Workers")
    print(f" 🎚️ معالجة الصوت: LUFS EBU R128 + BPM + Camelot Key + Synced .LRC")
    if args.genre:
        print(f" 🎯 تصفية النمط: {args.genre}")
    if args.artist:
        print(f" 🎤 تصفية الفنان: {args.artist}")
    print("=================================================================\n")

    if total_count == 0:
        print("لا توجد أغاني مطابقة للمحددات.")
        return

    counter = 0
    def increment_counter(val=1):
        nonlocal counter
        counter += val
        return counter

    start_time = time.time()
    results = {"success": 0, "exists": 0, "failed": 0}

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(download_track, t, args.output, total_count, increment_counter) for t in tracks]
        for f in as_completed(futures):
            res = f.result()
            st = res.get("status")
            if st in results:
                results[st] += 1

    elapsed = time.time() - start_time
    print("\n=================================================================")
    print(f" 🎉 اكتمل التنزيل والمعالجة خلال {elapsed:.1f} ثانية!")
    print(f" ✅ تم التحميل والمعالجة: {results['success']}")
    print(f" 📦 موجود مسبقاً: {results['exists']}")
    print(f" ⚠️ فشل التنزيل: {results['failed']}")
    print(f" 📁 إجمالي الملفات في المجلد: {len(os.listdir(args.output))}")
    print("=================================================================")

if __name__ == "__main__":
    main()
