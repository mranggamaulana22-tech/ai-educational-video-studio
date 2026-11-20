# Catatan Belajar: Software Development Life Cycle (SDLC) dan Requirements

## 1. Tahapan dalam SDLC (Software Development Life Cycle) (`s1`)
SDLC adalah siklus hidup pengembangan perangkat lunak yang terdiri dari enam tahapan utama:
1. **Planning**: Mencatat requirement dan menyusun Software Requirements Specification (SRS).
2. **Design**: Membuat dokumen arsitektur perangkat lunak dan desain sistem.
3. **Development**: Membagikan tugas ke developer dan menulis kode sesuai produk requirement.
4. **Testing**: Menguji aplikasi untuk memastikan keamanan, kestabilan, dan kesesuaian dengan requirement.
5. **Deployment**: Menyiapkan production environment dan mendeploy aplikasi ke lingkungan produksi.
6. **Maintenance**: Memperbaiki bug yang dilaporkan pengguna serta menjaga kestabilan kode aplikasi.

- **SDLC**: Software Development Life Cycle, siklus hidup pengembangan perangkat lunak dari perencanaan hingga pemeliharaan.
- *Analogi*: Membangun gedung pencakar langit, mulai dari arsitek merencanakan kebutuhan, membuat cetak biru, membangun struktur, inspeksi kekuatan, hingga perawatan berkala.
- *Contoh*: Membangun aplikasi e-commerce dari tahap planning, design arsitektur, coding, testing oleh QA, deployment ke server cloud, hingga maintenance saat ada error.
_Basis: material, analysis, session_

## 2. Tahap Planning dan Pengelolaan Requirements (`s2`)
Tahap awal SDLC berfokus pada pengumpulan kebutuhan perangkat lunak melalui beberapa langkah sistematis:
- **Identifikasi Stakeholders**: Melibatkan decision maker/PM, end-user, system administrator, engineering, marketing, sales, dan customer support.
- **Menetapkan Tujuan**: Menentukan *Goals* (tujuan jangka panjang) dan *Objectives* (tindakan terukur untuk mencapai target).
- **Penggalian Kebutuhan**: Menggunakan survei, kuesioner, dan interview.
- **Analisis & Konfirmasi**: Memastikan requirement konsisten, jelas, lengkap, serta ditentukan skala prioritasnya (high priority, nice to have).
- **Dokumentasi**: Menuliskan requirement agar sejalan dengan goals dan mudah dipahami stakeholder.

- **Goals**: Tujuan jangka panjang yang ingin dicapai.
- **Objectives**: Target spesifik yang dapat ditindaklanjuti dan diukur.
- *Contoh*: Melakukan interview dan kuisioner kepada end-user dan stakeholder lain untuk merumuskan fitur yang dibutuhkan sistem.
_Basis: material, analysis, session_

## 3. Dokumen Spesifikasi: SRS, URS, dan SysRS (`s3`)
Output dari tahap planning mencakup dokumen spesifikasi penting:
1. **SRS (Software Requirements Specification)**: Berisi fungsionalitas software, standar performa, tujuan, ruang lingkup, batasan, serta kategori requirement:
   - *Functional Requirement*: Fitur utama yang harus bisa dilakukan sistem.
   - *Non-functional Requirement*: Kualitas sistem seperti keamanan, performa, usability, dan reliability.
   - *External Interface Requirement & System Feature*
2. **URS (User Requirements Specification)**: Mendeskripsikan kebutuhan bisnis dan ekspektasi user melalui *User Stories*. Dikonfirmasi melalui **UAT (User Acceptance Testing)** oleh pengguna atau perwakilan pengguna.
3. **SysRS (System Requirements Specification)**: Menjelaskan kemampuan sistem (System capabilities), interface, policy, regulation, personnel, performance, security, system acceptance criteria, dan hardware expectation.

- **SRS**: Software Requirements Specification, dokumen spesifikasi kebutuhan perangkat lunak.
- **URS**: User Requirements Specification, dokumen yang mendeskripsikan kebutuhan bisnis dan ekspektasi user.
- **SysRS**: System Requirements Specification, dokumen yang merinci kapabilitas, aturan, dan standar teknis sistem.
- **UAT**: User Acceptance Testing, pengujian yang dilakukan oleh pengguna untuk memastikan aplikasi sesuai kebutuhan.
- *Analogi*: Buku petunjuk dan cetak biru detail sebelum sebuah pabrik merakit mobil baru.
- *Contoh*: Functional requirement pada ojek online: tombol 'Pesan' mencari driver. Non-functional requirement: tombol harus merespons di bawah 2 detik dengan data terenkripsi.
_Basis: material, analysis, session_
