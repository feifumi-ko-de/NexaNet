# NexaNet Reservation — Project 3 PKWU XII RPL

Sistem reservasi warnet berbasis web dengan **Node.js, Express, EJS, MySQL/SQL, CSS, dan JavaScript**.

Konsep usaha: pelanggan **reservasi PC lewat website**, lalu **datang ke warnet dan membayar cash langsung di lokasi**. Tidak memakai payment gateway.

## Fitur

- Reservasi pelanggan tanpa login.
- Pilih PC, tanggal, jam mulai, dan durasi.
- Cek bentrok jadwal otomatis.
- Harga otomatis berdasarkan tarif PC.
- Kode booking otomatis.
- Cek status reservasi dengan kode booking + nomor HP.
- Admin login.
- CRUD PC.
- CRUD tarif.
- Kelola status reservasi.
- Tandai pembayaran CASH menjadi PAID setelah pelanggan membayar di warnet.
- Dashboard admin.
- **Database otomatis dibuat saat aplikasi pertama kali dijalankan jika belum ada.**

## Persiapan

Install:

- Node.js LTS
- XAMPP (cukup MySQL; Apache tidak wajib)
- VS Code

Pastikan **MySQL XAMPP berstatus Running**.

## Cara paling gampang di Windows

1. Extract ZIP.
2. Buka folder proyek di VS Code.
3. Pastikan MySQL XAMPP aktif.
4. Jalankan `SETUP_WINDOWS.bat` sekali.
5. Jalankan `START.bat`.
6. Buka `http://localhost:3000`.

Mulai sekarang aplikasi akan mencoba memastikan database `nexanet` tersedia ketika start. Jadi kasus **Unknown database 'nexanet'** tidak muncul lagi selama MySQL aktif dan konfigurasi .env benar.

## Cara manual

```bash
npm install
npm run setup-db
npm start
```

Buka:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/admin/login
```

Akun demo:

```text
Username: admin
Password: admin123
```

## Konfigurasi .env

Jika memakai XAMPP default:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nexanet
SESSION_SECRET=rahasia-nexanet
```

## Alur pembayaran

1. Pelanggan membuat reservasi.
2. Sistem memberikan kode booking.
3. Pelanggan datang ke warnet.
4. Admin menemukan reservasi berdasarkan kode booking.
5. Pelanggan membayar **cash**.
6. Admin mengubah pembayaran menjadi `PAID`.
7. Admin mengubah status reservasi sesuai proses (`CONFIRMED`, `COMPLETED`, atau `CANCELLED`).

## Struktur utama

```text
config/db.js          koneksi MySQL
 database/schema.sql  struktur tabel + data demo
 database/init.js     membuat DB otomatis bila belum ada
 routes/customer.js   halaman & proses reservasi pelanggan
 routes/admin.js      login + CRUD admin
 middleware/auth.js   proteksi halaman admin
 views/                template EJS
 public/css/           styling
 public/js/            javascript frontend
 docs/                 proposal, flowchart, survei, pengujian
```

## Catatan tugas Project 3

Proposal, survei, harga pesaing, dan biaya usaha **tetap harus menggunakan data nyata milik sendiri**. Template proposal dan spreadsheet yang disediakan tidak boleh dipresentasikan sebagai hasil survei asli.


## Akun Pelanggan
NexaNet sekarang memiliki register/login pelanggan di `/akun/register` dan `/akun/login`. Password disimpan menggunakan `scrypt`. Akun pelanggan dapat dipakai untuk mengisi otomatis nama, nomor HP, dan email pada form reservasi. Reservasi tetap boleh dilakukan tanpa login.

Demo customer:
- Username: `user`
- Password: `user12345`
