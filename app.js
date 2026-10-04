require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const methodOverride = require('method-override');

const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const { query } = require('./config/db');
const { initializeDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'nexanet-demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  res.locals.user = req.session.user || null;
  next();
});

app.locals.currency = (value) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(value || 0);
app.locals.formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
app.locals.toTime = (value) => {
  if (!value) return '-';
  return String(value).slice(0, 5);
};

app.get('/', async (req, res, next) => {
  try {
    const [pcs, rates] = await Promise.all([
      query('SELECT c.*, r.name AS rate_name, r.hourly_price FROM computers c JOIN rates r ON c.rate_id = r.id ORDER BY c.code'),
      query('SELECT * FROM rates WHERE active = 1 ORDER BY hourly_price')
    ]);
    res.render('home', { title: 'NexaNet - Reservasi Warnet', pcs, rates });
  } catch (err) { next(err); }
});

app.use('/', customerRoutes);
app.use('/akun', authRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Halaman Tidak Ditemukan' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Terjadi Kesalahan', message: err.message });
});

async function startServer() {
  try {
    await initializeDatabase();
    await query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`NexaNet berjalan di http://localhost:${PORT}`);
      console.log(`Admin: http://localhost:${PORT}/admin/login`);
    });
  } catch (err) {
    console.error('Gagal memulai NexaNet. Pastikan MySQL/XAMPP aktif dan cek .env.');
    console.error(err.message);
    process.exit(1);
  }
}

startServer();
