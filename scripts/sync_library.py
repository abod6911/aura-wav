# -*- coding: utf-8 -*-
"""
==============================================================================
AuraWave — Safe Audio Library Synchronizer & Cleanup Engine
أداة فحص وتنظيف مجلد الأغاني Liked_Songs وضم المسارات الجديدة الفريدة لـ AuraWave
==============================================================================

[طريقة الاستخدام / How to use]:
1. وضع المعاينة الآمن الافتراضي (فحص فقط دون تعديل أو حذف أي ملف):
   python scripts/sync_library.py
   أو:
   python scripts/sync_library.py --dry-run

2. وضع التنفيذ الآمن (نقل التالف والمكرر للحجر الصحي وإضافة الأغاني الجديدة للكتالوج):
   python scripts/sync_library.py --apply

3. وضع الرفع المباشر إلى Hugging Face (رفع الملفات الجديدة فقط بحزمة واحدة):
   python scripts/sync_library.py --upload

* يمكن الدمج بين التنفيذ والرفع:
   python scripts/sync_library.py --apply --upload
==============================================================================
"""

import os
import sys
import json
import re
import shutil
import urllib.parse
from typing import List, Dict, Any, Tuple, Optional

# Force UTF-8 output encoding for Arabic and special symbols
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Try importing mutagen for accurate ID3 / audio duration & embedded cover extraction
try:
    from mutagen import File as MutagenFile
    from mutagen.id3 import ID3, APIC
    MUTAGEN_AVAILABLE = True
except ImportError:
    MUTAGEN_AVAILABLE = False

# Try importing huggingface_hub for batch uploading
try:
    from huggingface_hub import HfApi
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False

# Base Paths (Works whether script is executed from workspace root or scripts/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Check if parent is aura-wav or root
parent_dir = os.path.dirname(SCRIPT_DIR)
if os.path.basename(parent_dir) == "aura-wav":
    WORKSPACE_ROOT = os.path.dirname(parent_dir)
else:
    WORKSPACE_ROOT = parent_dir if os.path.basename(SCRIPT_DIR) == "scripts" else SCRIPT_DIR

LIKED_SONGS_DIR = os.path.join(WORKSPACE_ROOT, "Liked_Songs")
QUARANTINE_DIR = os.path.join(WORKSPACE_ROOT, "_quarantine_cleanup")

# Catalog paths (checks aura-wav/public/data or public/data)
CATALOG_PATH = os.path.join(WORKSPACE_ROOT, "aura-wav", "public", "data", "cloudCatalog.json")
if not os.path.exists(CATALOG_PATH):
    CATALOG_PATH = os.path.join(WORKSPACE_ROOT, "public", "data", "cloudCatalog.json")

COVERS_DIR = os.path.join(WORKSPACE_ROOT, "aura-wav", "public", "covers")
if not os.path.exists(COVERS_DIR):
    COVERS_DIR = os.path.join(WORKSPACE_ROOT, "public", "covers")

HF_REPO_ID = "abedone/aura-music"
HF_TOKEN = os.environ.get("HF_TOKEN")
HF_URL_BASE = f"https://huggingface.co/datasets/{HF_REPO_ID}/resolve/main/songs/"


def normalize_title(name: str) -> str:
    """
    Normalizes a track name by removing audio extensions, track number prefixes,
    punctuation, and excess whitespace for strict deduplication.
    """
    base = os.path.splitext(name)[0]
    while any(base.endswith(ext) for ext in ['.m4a', '.mp3', '.webm', '.part', '.ytdl', '.flac', '.wav']):
        base = os.path.splitext(base)[0]
    # Remove leading numbering like '001 - ', '0001 - ', '12 - '
    base = re.sub(r'^\d+\s*-\s*', '', base)
    # Remove common tags
    base = re.sub(r'\((feat\.|ft\.|official|audio|video|lyrics)[^\)]*\)', '', base, flags=re.IGNORECASE)
    base = re.sub(r'\[(feat\.|ft\.|official|audio|video|lyrics)[^\]]*\]', '', base, flags=re.IGNORECASE)
    # Normalize alphanumeric characters
    base = re.sub(r'[\W_]+', ' ', base).strip().lower()
    return base


def parse_metadata_from_filename(filename: str) -> Tuple[str, str]:
    """
    Fallback parser for title and artist from filename format:
    '0001 - Artist - Title.mp3' or 'Artist - Title.mp3'
    """
    base = os.path.splitext(filename)[0]
    # Remove leading track number
    base = re.sub(r'^\d+\s*-\s*', '', base).strip()
    
    parts = base.split(" - ")
    if len(parts) >= 2:
        artist = parts[0].strip()
        title = " - ".join(parts[1:]).strip()
        return title, artist
    return base, "Unknown Artist"


def extract_metadata_and_cover(file_path: str, next_track_number: int) -> Tuple[str, str, str, int, Optional[str]]:
    """
    Extracts metadata (title, artist, album, duration) and embedded cover using mutagen if available.
    """
    filename = os.path.basename(file_path)
    fallback_title, fallback_artist = parse_metadata_from_filename(filename)
    album = "Liked Songs"
    duration = 210
    cover_rel_url = None

    if MUTAGEN_AVAILABLE:
        try:
            audio = MutagenFile(file_path)
            if audio is not None:
                if hasattr(audio, 'info') and hasattr(audio.info, 'length'):
                    duration = max(10, int(round(audio.info.length)))

                # Extract ID3 tags for MP3
                if hasattr(audio, 'tags') and audio.tags:
                    tags = audio.tags
                    # Title
                    t = tags.get('TIT2') or tags.get('\xa9nam') or tags.get('title')
                    if t:
                        val = t[0] if isinstance(t, list) else str(t)
                        if val.strip():
                            fallback_title = val.strip()
                    # Artist
                    a = tags.get('TPE1') or tags.get('\xa9ART') or tags.get('artist')
                    if a:
                        val = a[0] if isinstance(a, list) else str(a)
                        if val.strip():
                            fallback_artist = val.strip()
                    # Album
                    alb = tags.get('TALB') or tags.get('\xa9alb') or tags.get('album')
                    if alb:
                        val = alb[0] if isinstance(alb, list) else str(alb)
                        if val.strip():
                            album = val.strip()

                    # Extract Embedded Artwork
                    cover_data = None
                    cover_ext = "jpg"

                    # ID3 APIC frames
                    for key in tags.keys():
                        if key.startswith('APIC'):
                            apic = tags[key]
                            cover_data = apic.data
                            if apic.mime == 'image/png':
                                cover_ext = 'png'
                            break

                    # MP4 covr atoms
                    if not cover_data and 'covr' in tags:
                        covr_list = tags['covr']
                        if covr_list and len(covr_list) > 0:
                            cover_data = bytes(covr_list[0])

                    if cover_data and len(cover_data) > 1000:
                        os.makedirs(COVERS_DIR, exist_ok=True)
                        cover_filename = f"{next_track_number}.{cover_ext}"
                        target_cover_path = os.path.join(COVERS_DIR, cover_filename)
                        with open(target_cover_path, "wb") as cf:
                            cf.write(cover_data)
                        cover_rel_url = f"/covers/{cover_filename}"
        except Exception as e:
            pass

    return fallback_title, fallback_artist, album, duration, cover_rel_url


def analyze_library():
    """
    Analyzes Liked_Songs against cloudCatalog.json and categorizes every file.
    """
    if not os.path.exists(LIKED_SONGS_DIR):
        print(f"❌ Liked_Songs folder not found at: {LIKED_SONGS_DIR}")
        sys.exit(1)

    if not os.path.exists(CATALOG_PATH):
        print(f"❌ Catalog file not found at: {CATALOG_PATH}")
        sys.exit(1)

    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog: List[Dict[str, Any]] = json.load(f)

    catalog_filenames = {item.get('fileName'): item for item in catalog if item.get('fileName')}
    catalog_norm: Dict[str, Dict[str, Any]] = {}
    for item in catalog:
        norm_fn = normalize_title(item.get('fileName', ''))
        norm_meta = normalize_title(f"{item.get('artist', '')} - {item.get('title', '')}")
        if norm_fn:
            catalog_norm[norm_fn] = item
        if norm_meta:
            catalog_norm[norm_meta] = item

    all_files = sorted(os.listdir(LIKED_SONGS_DIR))

    corrupt_files = []
    catalog_existing = []
    catalog_duplicates = []
    new_valid_songs = []
    seen_new: Dict[str, str] = {}

    for fname in all_files:
        fpath = os.path.join(LIKED_SONGS_DIR, fname)
        if os.path.isdir(fpath):
            continue

        size = os.path.getsize(fpath)
        # Corrupt / Incomplete
        if fname.endswith(('.part', '.ytdl', '.webm')) or size == 0:
            corrupt_files.append((fname, size, "ملف غير مكتمل أو تالف أو بحجم 0 بايت"))
            continue

        # Exact match in existing cloud catalog
        if fname in catalog_filenames:
            catalog_existing.append(fname)
            continue

        # Check duplicate against existing catalog songs
        norm = normalize_title(fname)
        if norm in catalog_norm:
            matched = catalog_norm[norm]
            catalog_duplicates.append((fname, matched.get('fileName', ''), "نسخة مكررة من أغنية موجودة مسبقاً في الكتالوج"))
            continue

        # Check duplicate against another newly discovered song
        if norm in seen_new:
            catalog_duplicates.append((fname, seen_new[norm], "نسخة مكررة من أغنية جديدة أخرى في نفس المجلد"))
            continue

        seen_new[norm] = fname
        new_valid_songs.append((fname, size))

    return catalog, all_files, corrupt_files, catalog_existing, catalog_duplicates, new_valid_songs


def print_report(all_files, corrupt_files, catalog_existing, catalog_duplicates, new_valid_songs, dry_run=True):
    print("=" * 72)
    print("📊 تقرير فحص مكتبة AuraWave (Liked_Songs Library Audit Report)")
    print("=" * 72)
    print(f"📁 مسار المجلد:         {LIKED_SONGS_DIR}")
    print(f"📑 مسار الكتالوج الحالي: {CATALOG_PATH}")
    print(f"📦 إجمالي الملفات في المجلد:   {len(all_files):,} ملف")
    print(f"✅ مسارات مطابقة في الكتالوج: {len(catalog_existing):,} مسار (آمنة تماماً ولا يتم لمسها)")
    print(f"⚠️ ملفات تالفة أو غير مكتملة: {len(corrupt_files):,} ملف (.part/.ytdl/.webm/0-byte)")
    print(f"🔁 ملفات مكررة (بادئات مختلفة): {len(catalog_duplicates):,} ملف")
    print(f"✨ أغاني جديدة فريدة صالحة:   {len(new_valid_songs):,} مسار جديد سيتم ضمها للكتالوج")
    print("=" * 72)

    if corrupt_files:
        print("\n[قائمة الملفات التالفة / غير المكتملة]:")
        for f, sz, reason in corrupt_files[:8]:
            print(f"  ❌ {f} ({sz:,} بايت) - {reason}")
        if len(corrupt_files) > 8:
            print(f"  ... و {len(corrupt_files) - 8} ملفات أخرى.")

    if catalog_duplicates:
        print("\n[عينة من الملفات المكررة]:")
        for f, original, reason in catalog_duplicates[:8]:
            print(f"  🔁 {f} ---> مكرر من: {original}")
        if len(catalog_duplicates) > 8:
            print(f"  ... و {len(catalog_duplicates) - 8} ملفات مكررة أخرى.")

    if new_valid_songs:
        print("\n[عينة من الأغاني الجديدة الفريدة المرشحة للضم]:")
        for f, sz in new_valid_songs[:8]:
            print(f"  🎵 {f} ({sz / (1024*1024):.1f} MB)")
        if len(new_valid_songs) > 8:
            print(f"  ... و {len(new_valid_songs) - 8} مسار جديد إضافي.")

    print("\n" + "=" * 72)
    if dry_run:
        print("💡 تم التشغيل في وضع المعاينة فقط (Dry Run) — لم يتم نقل أو تعديل أي ملف.")
        print("👉 للتنفيذ الآمن، شغّل: python scripts/sync_library.py --apply")
        print("👉 للتنفيذ والرفع المباشر: python scripts/sync_library.py --apply --upload")
    print("=" * 72 + "\n")


def apply_cleanup_and_sync(catalog, corrupt_files, catalog_duplicates, new_valid_songs):
    print("\n🚀 بدء التنفيذ الآمن (Safe Apply)...")

    # 1. Prepare Quarantine directory (NEVER delete permanently)
    quarantine_corrupt = os.path.join(QUARANTINE_DIR, "corrupt")
    quarantine_dups = os.path.join(QUARANTINE_DIR, "duplicates")
    os.makedirs(quarantine_corrupt, exist_ok=True)
    os.makedirs(quarantine_dups, exist_ok=True)

    moved_corrupt = 0
    for fname, _, _ in corrupt_files:
        src = os.path.join(LIKED_SONGS_DIR, fname)
        dst = os.path.join(quarantine_corrupt, fname)
        if os.path.exists(src):
            shutil.move(src, dst)
            moved_corrupt += 1

    moved_dups = 0
    for fname, _, _ in catalog_duplicates:
        src = os.path.join(LIKED_SONGS_DIR, fname)
        dst = os.path.join(quarantine_dups, fname)
        if os.path.exists(src):
            shutil.move(src, dst)
            moved_dups += 1

    print(f"🛡️ تم نقل {moved_corrupt} ملف تالف إلى الحجر: {quarantine_corrupt}")
    print(f"🛡️ تم نقل {moved_dups} ملف مكرر إلى الحجر: {quarantine_dups}")

    # 2. Backup existing catalog
    backup_path = CATALOG_PATH.replace(".json", ".backup.json")
    shutil.copy2(CATALOG_PATH, backup_path)
    print(f"💾 تم إنشاء نسخة احتياطية آمنة للكتالوج في: {backup_path}")

    # 3. Ingest truly new songs
    start_index = len(catalog)
    newly_added_records = []

    print(f"⏳ جاري معالجة واستخراج بيانات {len(new_valid_songs)} أغنية جديدة...")

    for idx, (fname, size) in enumerate(new_valid_songs, start=start_index + 1):
        fpath = os.path.join(LIKED_SONGS_DIR, fname)
        title, artist, album, duration, cover_url = extract_metadata_and_cover(fpath, idx)

        # Build official Hugging Face URL with safe percent-encoding
        encoded_fname = urllib.parse.quote(fname)
        audio_url = f"{HF_URL_BASE}{encoded_fname}"

        record = {
            "id": f"track_catalog_{idx}",
            "title": title,
            "artist": artist,
            "album": album,
            "genre": "Liked Songs",
            "category": "Liked Songs",
            "duration": duration,
            "trackNumber": idx,
            "artworkUrl": cover_url or "/logo.svg",
            "coverUrl": cover_url or "/logo.svg",
            "audioUrl": audio_url,
            "fileName": fname,
            "source": "online",
            "dateAdded": 1700000000000 + idx,
            "dominantColor": "#121212",
            "accentColor": "#1DB954"
        }
        newly_added_records.append(record)

    updated_catalog = catalog + newly_added_records

    # Save to catalog JSON with pretty formatting
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(updated_catalog, f, ensure_ascii=False, indent=2)

    # Also update dist copy if dist exists
    dist_catalog = os.path.join(WORKSPACE_ROOT, "aura-wav", "dist", "data", "cloudCatalog.json")
    if os.path.exists(os.path.dirname(dist_catalog)):
        with open(dist_catalog, "w", encoding="utf-8") as f:
            json.dump(updated_catalog, f, ensure_ascii=False, indent=2)

    print(f"🎉 تم بنجاح إضافة {len(newly_added_records)} أغنية جديدة إلى الكتالوج!")
    print(f"📈 إجمالي الكتالوج المحدث الآن: {len(updated_catalog):,} مسار.")


def upload_to_huggingface():
    """
    Uploads all audio files from Liked_Songs to Hugging Face dataset repository
    using upload_folder with automatic LFS multi-threading and single commit.
    """
    if not HF_AVAILABLE:
        print("❌ مكتبة huggingface_hub غير مثبتة. يرجى تثبيتها عبر: pip install huggingface_hub")
        return False

    print("\n" + "=" * 72)
    print("🚀 بدء الرفع السحابي إلى مستودع Hugging Face الرسمي")
    print(f"📦 المستودع المستهدف: https://huggingface.co/datasets/{HF_REPO_ID}")
    print(f"📁 المجلد المصدر:    {LIKED_SONGS_DIR}")
    print("=" * 72)

    try:
        api = HfApi(token=HF_TOKEN)
        print("⏳ جاري فحص ورفع الملفات الصوتية الجديدة (يتم تخطي الملفات المرفوعة مسبقاً تلقائياً)...")
        commit_info = api.upload_folder(
            folder_path=LIKED_SONGS_DIR,
            path_in_repo="songs",
            repo_id=HF_REPO_ID,
            repo_type="dataset",
            commit_message="Sync and ingest newly verified Liked_Songs to AuraWave"
        )
        print("\n" + "=" * 72)
        print("🎉 تم الرفع السحابي بنجاح تام!")
        print(f"🔗 رابط الكوميت: {commit_info.commit_url}")
        print("=" * 72 + "\n")
        return True
    except Exception as e:
        print(f"❌ خطأ أثناء الرفع إلى Hugging Face: {e}")
        return False


def main():
    args = sys.argv[1:]
    dry_run = True
    apply_mode = False
    upload_mode = False

    if "--apply" in args:
        apply_mode = True
        dry_run = False
    if "--upload" in args:
        upload_mode = True
    if "--dry-run" in args:
        dry_run = True
        apply_mode = False

    catalog, all_files, corrupt_files, catalog_existing, catalog_duplicates, new_valid_songs = analyze_library()

    print_report(all_files, corrupt_files, catalog_existing, catalog_duplicates, new_valid_songs, dry_run=dry_run)

    if apply_mode:
        apply_cleanup_and_sync(catalog, corrupt_files, catalog_duplicates, new_valid_songs)

    if upload_mode:
        success = upload_to_huggingface()
        if not success:
            print("🚨 فشل الرفع إلى Hugging Face! تم إيقاف العملية.")
            sys.exit(1)


if __name__ == '__main__':
    main()
