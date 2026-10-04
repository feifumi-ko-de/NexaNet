const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function calculateEndTime(startTime, durationHours) {
  const [h, m] = startTime.split(':').map(Number);
  const end = h * 60 + m + durationHours * 60;
  const eh = Math.floor(end / 60);
  const em = end % 60;
  return `${String(eh % 24).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`;
}

router.get('/reservasi', async (req, res, next) => {
  try {
    const [pcs, rates] = await Promise.all([
      query(`SELECT c.*, r.name AS rate_name, r.hourly_price FROM computers c
             JOIN rates r ON c.rate_id = r.id WHERE c.status = 'AVAILABLE' ORDER BY c.code`),
      query('SELECT * FROM rates WHERE active = 1 ORDER BY hourly_price')
    ]);
    res.render('reservation-form', { title: 'Reservasi Online', pcs, rates, form: req.session.user ? { customer_name: req.session.user.full_name, phone: req.session.user.phone, email: req.session.user.email } : {}, error: null });
  } catch (err) { next(err); }
});

router.post('/reservasi', async (req, res, next) => {
  const { customer_name, phone, email, computer_id, booking_date, start_time, duration_hours, notes } = req.body;
  const duration = Number(duration_hours);
  try {
    if (!customer_name || !phone || !computer_id || !booking_date || !start_time || !duration || duration < 1 || duration > 12 || !isValidDate(booking_date)) {
      const [pcs, rates] = await Promise.all([
        query(`SELECT c.*, r.name AS rate_name, r.hourly_price FROM computers c JOIN rates r ON c.rate_id = r.id WHERE c.status = 'AVAILABLE' ORDER BY c.code`),
        query('SELECT * FROM rates WHERE active = 1 ORDER BY hourly_price')
      ]);
      return res.status(400).render('reservation-form', { title: 'Reservasi Online', pcs, rates, form: req.body, error: 'Data reservasi belum lengkap atau durasi tidak valid.' });
    }

    const pcs = await query(`SELECT c.*, r.hourly_price FROM computers c JOIN rates r ON c.rate_id = r.id WHERE c.id = ? AND c.status = 'AVAILABLE'`, [computer_id]);
    if (!pcs.length) return res.status(400).render('error', { title: 'Reservasi Ditolak', message: 'PC yang dipilih tidak tersedia.' });
    const pc = pcs[0];

    const [startHour, startMinute] = start_time.split(':').map(Number);
    const totalMinutes = startHour * 60 + startMinute + duration * 60;
    if (totalMinutes > 24 * 60) {
      const [allPcs, rates] = await Promise.all([
        query(`SELECT c.*, r.name AS rate_name, r.hourly_price FROM computers c JOIN rates r ON c.rate_id = r.id WHERE c.status = 'AVAILABLE' ORDER BY c.code`),
        query('SELECT * FROM rates WHERE active = 1 ORDER BY hourly_price')
      ]);
      return res.status(400).render('reservation-form', { title: 'Jadwal Tidak Valid', pcs: allPcs, rates, form: req.body, error: 'Durasi melewati tengah malam. Pilih jam mulai dan durasi yang selesai pada hari yang sama.' });
    }

    const end_time = calculateEndTime(start_time, duration);
    const overlaps = await query(`
      SELECT id FROM reservations
      WHERE computer_id = ? AND booking_date = ?
        AND status IN ('PENDING','CONFIRMED')
        AND (? < end_time AND ? > start_time)
      LIMIT 1
    `, [computer_id, booking_date, start_time, end_time]);
    if (overlaps.length) {
      const [allPcs, rates] = await Promise.all([
        query(`SELECT c.*, r.name AS rate_name, r.hourly_price FROM computers c JOIN rates r ON c.rate_id = r.id WHERE c.status = 'AVAILABLE' ORDER BY c.code`),
        query('SELECT * FROM rates WHERE active = 1 ORDER BY hourly_price')
      ]);
      return res.status(409).render('reservation-form', { title: 'Slot Sudah Terisi', pcs: allPcs, rates, form: req.body, error: 'Jadwal tersebut bertabrakan dengan reservasi lain. Silakan pilih jam atau PC berbeda.' });
    }

    const total_price = pc.hourly_price * duration;
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const booking_code = `NEXA-${stamp}-${suffix}`;

    await query(`INSERT INTO reservations
      (booking_code, user_id, customer_name, phone, email, computer_id, booking_date, start_time, end_time,
       duration_hours, total_price, payment_method, payment_status, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CASH', 'UNPAID', 'PENDING', ?)`,
      [booking_code, req.session.user?.id || null, customer_name.trim(), phone.trim(), email?.trim() || null, computer_id,
       booking_date, start_time, end_time, duration, total_price, notes?.trim() || null]);

    res.redirect(`/reservasi/sukses/${encodeURIComponent(booking_code)}`);
  } catch (err) { next(err); }
});

router.get('/reservasi/sukses/:code', async (req, res, next) => {
  try {
    const rows = await query(`SELECT r.*, c.code AS computer_code, c.name AS computer_name
      FROM reservations r JOIN computers c ON r.computer_id = c.id WHERE r.booking_code = ?`, [req.params.code]);
    if (!rows.length) return res.status(404).render('404', { title: 'Reservasi Tidak Ditemukan' });
    res.render('reservation-success', { title: 'Reservasi Berhasil', reservation: rows[0] });
  } catch (err) { next(err); }
});

router.get('/cek-reservasi', (req, res) => res.render('check-reservation', { title: 'Cek Reservasi', reservation: null, error: null }));
router.post('/cek-reservasi', async (req, res, next) => {
  try {
    const rows = await query(`SELECT r.*, c.code AS computer_code, c.name AS computer_name
      FROM reservations r JOIN computers c ON r.computer_id = c.id
      WHERE r.booking_code = ? AND r.phone = ?`, [req.body.booking_code, req.body.phone]);
    if (!rows.length) return res.status(404).render('check-reservation', { title: 'Cek Reservasi', reservation: null, error: 'Kode reservasi atau nomor HP tidak ditemukan.' });
    res.render('check-reservation', { title: 'Cek Reservasi', reservation: rows[0], error: null });
  } catch (err) { next(err); }
});

module.exports = router;
