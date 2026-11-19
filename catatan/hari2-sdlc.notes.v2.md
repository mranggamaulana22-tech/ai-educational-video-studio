# Catatan Belajar: Tahapan SDLC dan Proses Perencanaan Kebutuhan Perangkat Lunak

## 1. Tahapan Utama dalam SDLC (`s1`)
Software Development Life Cycle (SDLC) terdiri dari 6 tahapan utama:
1. **Planning**: Mencatat requirement dan mengembangkan Software Requirement Specification (SRS).
2. **Design**: Membuat dokumen arsitektur software dan desain sistem.
3. **Development**: Membagikan task ke developer dan menulis kode sesuai product requirement.
4. **Testing**: Menguji aplikasi untuk memastikan aman, stabil, dan sesuai requirement.
5. **Deployment**: Menyiapkan production environment dan mendeploy aplikasi ke lingkungan produksi.
6. **Maintenance**: Memperbaiki bug yang dilaporkan dan menjaga kelancaran serta kestabilan aplikasi.

- **SDLC**: Software Development Life Cycle, siklus hidup pengembangan perangkat lunak.
- *Contoh*: Tahap Maintenance melibatkan perbaikan bug yang dilaporkan oleh pengguna setelah aplikasi dirilis.
_Basis: material, analysis_

## 2. Langkah-Langkah Perencanaan dan Penggalian Kebutuhan (Planning) (`s2`)
Langkah awal dalam planning adalah mencatat requirement melalui beberapa tahapan:
1. **Identifikasi Stakeholders**: Meliputi decision maker/PM, end-user, system administrator, engineering, marketing, sales, dan customer support.
2. **Menetapkan Tujuan dan Objektivitas**: Membedakan antara *Goals* (tujuan jangka panjang) dan *Objectives* (dapat ditindaklanjuti dan diukur).
3. **Penggalian Kebutuhan**: Menggunakan survei, kuesioner, dan interview.
4. **Mendokumentasikan Kebutuhan**: Harus sejalan dengan goals serta mudah dipahami stakeholder.
5. **Analisa dan Mengkonfirmasi Requirement**: Harus konsisten, jelas, dan lengkap.
6. **Menentukan Skala Prioritas**: Menentukan prioritas tinggi serta fitur yang harus ada (*must-have*) atau bagus jika ada (*nice-to-have*).

- **Goals**: Tujuan jangka panjang yang ingin dicapai.
- **Objectives**: Target yang dapat ditindaklanjuti dan diukur untuk mencapai goals.
- *Contoh*: Melakukan interview dan survei kepada end-user untuk menggali kebutuhan aplikasi.
_Basis: material, analysis_

## 3. Dokumen SRS (Software Requirements Specification) (`s3`)
Output utama dari proses planning adalah dokumen SRS yang mencakup:
- Fungsionalitas software, standar performa, tujuan, ruang lingkup, batasan, asumsi, dan ketergantungan.
- Kategori requirement:
  1. **Functional requirement**: Fitur yang harus bisa dilakukan oleh sistem.
  2. **External interface requirement**: Cara sistem berinteraksi dengan pihak/komponen eksternal.
  3. **System feature**: Fitur utama sistem beserta detail perilakunya.
  4. **Non-functional requirement**: Kualitas sistem seperti security, performa, usability, dan reliability.

- **SRS**: Software Requirements Specification, dokumen spesifikasi kebutuhan perangkat lunak.
- **Functional requirement**: Fitur spesifik yang harus dapat dilakukan oleh sistem.
- **Non-functional requirement**: Standar kualitas sistem seperti keamanan, performa, dan kegunaan.
- *Contoh*: Menetapkan enkripsi data sebagai bagian dari non-functional requirement (security).
_Basis: material, analysis_

## 4. Dokumen URS (User Requirement Specification) (`s4`)
URS mendeskripsikan kebutuhan bisnis dan ekspektasi user.
- Memuat **User Stories** yang menjawab: siapa pengguna aplikasi, fitur apa yang dibutuhkan agar dapat berfungsi, dan mengapa pengguna membutuhkan fitur tersebut.
- Dikonfirmasi melalui **UAT (User Acceptance Testing)**, yaitu proses pengujian oleh pengguna untuk memastikan aplikasi sesuai kebutuhan.
- URS kemudian digabungkan ke dalam dokumen SRS.

- **URS**: User Requirement Specification, dokumen kebutuhan pengguna.
- **UAT**: User Acceptance Testing, pengujian aplikasi oleh pengguna untuk memastikan kesesuaian kebutuhan.
- *Contoh*: Pengguna melakukan UAT untuk memverifikasi apakah fitur login sudah sesuai dengan ekspektasi bisnis.
_Basis: material, analysis_

## 5. Dokumen SysRS (System Requirement Specification) (`s5`)
SysRS merinci spesifikasi sistem secara teknis dan operasional yang mencakup:
a. **System capabilities**: Kemampuan yang harus dimiliki sistem.
b. **Interface and user characteristics**: Interaksi sistem dan karakteristik pengguna.
c. **Policy**: Kebijakan dan aturan internal organisasi.
d. **Regulation**: Peraturan atau standar eksternal.
e. **Personnel**: Orang yang terlibat dalam operasi dan pemeliharaan.
f. **Performance**: Standar kinerja sistem.
g. **Security**: Perlindungan data dan pencegahan akses tidak sah.
h. **System acceptance kriteria**: Kriteria kelayakan penerimaan sistem.
i. **Hardware expectation**: Kebutuhan perangkat keras.

- **SysRS**: System Requirement Specification, dokumen spesifikasi kebutuhan sistem.
- *Contoh*: Menentukan spesifikasi RAM dan prosesor server sebagai bagian dari hardware expectation.
_Basis: material, analysis_

## Pertanyaan Terbuka
- Bagaimana detail implementasi pada tahap Design hingga Deployment secara mendalam?
