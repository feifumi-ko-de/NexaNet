# Skenario Pengujian NexaNet

Gunakan saat demo/presentasi.

## Pelanggan

1. Buka `/`. Pastikan daftar PC dan tarif tampil.
2. Buka `/reservasi`. Isi data valid, pilih PC-01, tanggal besok, 10:00, 2 jam.
3. Submit. Pastikan muncul kode booking dan total sesuai tarif x durasi.
4. Buka `/cek-reservasi`. Cari menggunakan kode booking + nomor HP. Pastikan status PENDING dan pembayaran UNPAID.
5. Coba membuat booking dengan PC dan jadwal yang sama. Sistem harus menolak karena bentrok.

## Admin / CRUD

1. Login `/admin/login` dengan `admin` / `admin123`.
2. Tambah PC baru -> lihat -> edit -> hapus.
3. Tambah tarif baru -> lihat -> edit -> hapus.
4. Buka daftar reservasi. Ubah status pembayaran menjadi PAID setelah simulasi pelanggan membayar cash.
5. Ubah status PENDING -> CONFIRMED -> COMPLETED.

## Bukti untuk lampiran proposal

Ambil screenshot: halaman beranda, form reservasi, halaman sukses booking, cek booking, dashboard admin, CRUD PC, CRUD tarif, dan CRUD reservasi.
