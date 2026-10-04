const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { query } = require('../config/db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, expected] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  try {
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

function renderRegister(res, form = {}, error = null) {
  return res.status(error ? 400 : 200).render('register', {
    title: 'Daftar Akun - NexaNet', form, error
  });
}

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login User - NexaNet', error: null });
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).render('login', { title: 'Login User - NexaNet', error: 'Username dan password wajib diisi.', form: req.body });
    }

    const rows = await query('SELECT id, full_name, username, email, phone, password_hash FROM users WHERE username = ? AND active = 1 LIMIT 1', [username.trim()]);
    if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
      return res.status(401).render('login', { title: 'Login User - NexaNet', error: 'Username atau password salah.', form: req.body });
    }

    req.session.user = {
      id: rows[0].id,
      full_name: rows[0].full_name,
      username: rows[0].username,
      email: rows[0].email,
      phone: rows[0].phone
    };
    res.redirect(req.session.afterLogin || '/');
    delete req.session.afterLogin;
  } catch (err) { next(err); }
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  renderRegister(res);
});

router.post('/register', async (req, res, next) => {
  try {
    const full_name = String(req.body.full_name || '').trim();
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const password_confirm = String(req.body.password_confirm || '');

    if (full_name.length < 2 || full_name.length > 100) {
      return renderRegister(res, req.body, 'Nama lengkap harus 2-100 karakter.');
    }
    if (!/^[A-Za-z0-9_]{4,30}$/.test(username)) {
      return renderRegister(res, req.body, 'Username harus 4-30 karakter dan hanya boleh huruf, angka, atau underscore.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return renderRegister(res, req.body, 'Format email tidak valid.');
    }
    if (!/^\+?[0-9\s-]{8,20}$/.test(phone)) {
      return renderRegister(res, req.body, 'Nomor HP tidak valid.');
    }
    if (password.length < 6) {
      return renderRegister(res, req.body, 'Password minimal 6 karakter.');
    }
    if (password !== password_confirm) {
      return renderRegister(res, req.body, 'Konfirmasi password tidak sama.');
    }

    const duplicate = await query('SELECT username, email FROM users WHERE username = ? OR email = ? LIMIT 1', [username, email]);
    if (duplicate.length) {
      if (duplicate[0].username === username) return renderRegister(res, req.body, 'Username sudah digunakan.');
      return renderRegister(res, req.body, 'Email sudah terdaftar.');
    }

    const password_hash = hashPassword(password);
    const result = await query(
      'INSERT INTO users (full_name, username, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
      [full_name, username, email, phone, password_hash]
    );

    req.session.user = { id: result.insertId, full_name, username, email, phone };
    res.redirect('/');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return renderRegister(res, req.body, 'Username atau email sudah digunakan.');
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
