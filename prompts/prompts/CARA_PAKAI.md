# Uji manual Storyboard Agent

1. Ada naskah + audio (mis. dari tools\tts_gemini.py) -> jalankan Whisper:
   .\.venv-audio\Scripts\python.exe tools\align_audio.py apps\remotion\public\audio\NAMA.wav apps\remotion\public\audio\NAMA.words.json
2. Buat masukan:
   python tools\make_agent_input.py apps\remotion\public\audio\NAMA.words.json
3. Di chat baru: tempel isi prompts\storyboard_agent.md, lalu NASKAH asli, lalu hasil langkah 2.
4. Simpan jawaban JSON ke apps\remotion\src\storyboards\NAMA.json
5. Koreksi waktu kata: .\.venv-audio\Scripts\python.exe tools\apply_word_times.py apps\remotion\src\storyboards\NAMA.json apps\remotion\public\audio\NAMA.words.json
6. Validasi: cd apps\remotion; node scripts\validate-storyboard.mjs src\storyboards\NAMA.json
7. Render dan cek. Catat apa yang salah untuk memperbaiki prompt (versi v2, dst).
