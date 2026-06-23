const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jinju2024';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

function readAll() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

app.post('/api/submit', (req, res) => {
  const submissions = readAll();
  const incoming = req.body;
  const entry = { id: Date.now().toString(), submittedAt: new Date().toISOString(), data: incoming };
  const idx = submissions.findIndex(s => s.data.studentId && s.data.studentId === incoming.studentId);
  if (idx >= 0) submissions[idx] = entry;
  else submissions.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
  res.json({ success: true });
});

app.get('/api/submissions', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
  }
  res.json(readAll());
});

app.delete('/api/submissions/:id', (req, res) => {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
  }
  const filtered = readAll().filter(s => s.id !== req.params.id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
  res.json({ success: true });
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(nets)) {
    for (const n of iface) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  console.log('\n✅ 진주보건대 창업 워크시트 서버 실행 중\n');
  console.log(`   로컬:     http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`   네트워크: http://${ip}:${PORT}  ← 학생 접속 주소`));
  console.log(`   관리자:   http://localhost:${PORT}/admin.html`);
  console.log(`\n   관리자 비밀번호: ${ADMIN_PASSWORD}`);
  console.log('   (변경: ADMIN_PASSWORD=새비밀번호 node server.js)\n');
});
