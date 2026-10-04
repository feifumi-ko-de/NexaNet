const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { query } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

function verifyPassword(password, stored) {
  const [scheme, salt, expected] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  try {
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}

router.get('/login', (req, res) => res.render('admin/login', { title: 'Login Admin', error: null }));
router.post('/login', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM admins WHERE username = ? AND active = 1 LIMIT 1', [req.body.username]);
    if (!rows.length || !verifyPassword(req.body.password, rows[0].password_hash)) {
      return res.status(401).render('admin/login', { title: 'Login Admin', error: 'Username atau password salah.' });
    }
    req.session.admin = { id: rows[0].id, username: rows[0].username, name: rows[0].name };
    res.redirect('/admin');
  } catch (err) { next(err); }
});
router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

router.use(requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const [stats, reservations, computers] = await Promise.all([
      query(`SELECT
        (SELECT COUNT(*) FROM reservations WHERE booking_date = CURDATE() AND status IN ('PENDING','CONFIRMED')) AS today_reservations,
        (SELECT COUNT(*) FROM computers WHERE status = 'AVAILABLE') AS available_pcs,
        (SELECT COALESCE(SUM(total_price),0) FROM reservations WHERE booking_date = CURDATE() AND status IN ('CONFIRMED','COMPLETED')) AS today_revenue`),
      query(`SELECT r.*, c.code AS computer_code FROM reservations r JOIN computers c ON r.computer_id = c.id ORDER BY r.booking_date DESC, r.start_time DESC LIMIT 10`),
      query('SELECT COUNT(*) AS total, SUM(status = \'AVAILABLE\') AS available, SUM(status = \'MAINTENANCE\') AS maintenance, SUM(status = \'INACTIVE\') AS inactive FROM computers')
    ]);
    res.render('admin/dashboard', { title: 'Dashboard Admin', stats: stats[0], reservations, computers: computers[0] });
  } catch (err) { next(err); }
});

// PC CRUD
router.get('/pcs', async (req, res, next) => {
  try {
    const pcs = await query('SELECT c.*, r.name AS rate_name FROM computers c JOIN rates r ON c.rate_id = r.id ORDER BY c.code');
    res.render('admin/pcs', { title: 'Kelola PC', pcs });
  } catch (err) { next(err); }
});
router.get('/pcs/new', async (req, res, next) => {
  try { const rates = await query('SELECT * FROM rates ORDER BY hourly_price'); res.render('admin/pc-form', { title: 'Tambah PC', pc: {}, rates, action: '/admin/pcs' }); }
  catch (err) { next(err); }
});
router.post('/pcs', async (req, res, next) => {
  try { await query('INSERT INTO computers (code, name, rate_id, status, specs) VALUES (?, ?, ?, ?, ?)', [req.body.code, req.body.name, req.body.rate_id, req.body.status, req.body.specs || null]); res.redirect('/admin/pcs'); }
  catch (err) { next(err); }
});
router.get('/pcs/:id/edit', async (req, res, next) => {
  try { const [pcs, rates] = await Promise.all([query('SELECT * FROM computers WHERE id = ?', [req.params.id]), query('SELECT * FROM rates ORDER BY hourly_price')]); if (!pcs.length) return res.redirect('/admin/pcs'); res.render('admin/pc-form', { title: 'Edit PC', pc: pcs[0], rates, action: `/admin/pcs/${req.params.id}?_method=PUT` }); }
  catch (err) { next(err); }
});
router.put('/pcs/:id', async (req, res, next) => {
  try { await query('UPDATE computers SET code=?, name=?, rate_id=?, status=?, specs=? WHERE id=?', [req.body.code, req.body.name, req.body.rate_id, req.body.status, req.body.specs || null, req.params.id]); res.redirect('/admin/pcs'); }
  catch (err) { next(err); }
});
router.delete('/pcs/:id', async (req, res, next) => {
  try { await query('DELETE FROM computers WHERE id = ?', [req.params.id]); res.redirect('/admin/pcs'); }
  catch (err) { next(err); }
});

// Rate CRUD
router.get('/tarif', async (req, res, next) => {
  try { const rates = await query('SELECT * FROM rates ORDER BY hourly_price'); res.render('admin/rates', { title: 'Kelola Tarif', rates }); }
  catch (err) { next(err); }
});
router.get('/tarif/new', (req, res) => res.render('admin/rate-form', { title: 'Tambah Tarif', rate: {}, action: '/admin/tarif' }));
router.post('/tarif', async (req, res, next) => {
  try { await query('INSERT INTO rates (name, hourly_price, description, active) VALUES (?, ?, ?, ?)', [req.body.name, req.body.hourly_price, req.body.description || null, req.body.active ? 1 : 0]); res.redirect('/admin/tarif'); }
  catch (err) { next(err); }
});
router.get('/tarif/:id/edit', async (req, res, next) => {
  try { const rates = await query('SELECT * FROM rates WHERE id=?', [req.params.id]); if (!rates.length) return res.redirect('/admin/tarif'); res.render('admin/rate-form', { title: 'Edit Tarif', rate: rates[0], action: `/admin/tarif/${req.params.id}?_method=PUT` }); }
  catch (err) { next(err); }
});
router.put('/tarif/:id', async (req, res, next) => {
  try { await query('UPDATE rates SET name=?, hourly_price=?, description=?, active=? WHERE id=?', [req.body.name, req.body.hourly_price, req.body.description || null, req.body.active ? 1 : 0, req.params.id]); res.redirect('/admin/tarif'); }
  catch (err) { next(err); }
});
router.delete('/tarif/:id', async (req, res, next) => {
  try { await query('DELETE FROM rates WHERE id=?', [req.params.id]); res.redirect('/admin/tarif'); }
  catch (err) { next(err); }
});

// Reservation CRUD/status
router.get('/reservasi', async (req, res, next) => {
  try {
    const reservations = await query(`SELECT r.*, c.code AS computer_code, c.name AS computer_name
      FROM reservations r JOIN computers c ON r.computer_id = c.id ORDER BY r.booking_date DESC, r.start_time DESC`);
    res.render('admin/reservations', { title: 'Kelola Reservasi', reservations });
  } catch (err) { next(err); }
});
router.put('/reservasi/:id/status', async (req, res, next) => {
  try {
    const status = req.body.status;
    if (!['PENDING','CONFIRMED','COMPLETED','CANCELLED'].includes(status)) return res.redirect('/admin/reservasi');
    await query('UPDATE reservations SET status=? WHERE id=?', [status, req.params.id]);
    res.redirect('/admin/reservasi');
  } catch (err) { next(err); }
});
router.put('/reservasi/:id/payment', async (req, res, next) => {
  try { const paymentStatus = req.body.payment_status === 'PAID' ? 'PAID' : 'UNPAID'; await query('UPDATE reservations SET payment_status=? WHERE id=?', [paymentStatus, req.params.id]); res.redirect('/admin/reservasi'); }
  catch (err) { next(err); }
});
router.delete('/reservasi/:id', async (req, res, next) => {
  try { await query('DELETE FROM reservations WHERE id=?', [req.params.id]); res.redirect('/admin/reservasi'); }
  catch (err) { next(err); }
});

module.exports = router;
