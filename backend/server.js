// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const port = 5000;
const morgan = require('morgan')
const { readdirSync } = require('fs')
const cors = require('cors')
const { disconnect } = require('process');
const { connectDB, disconnectDB } = require('./config/db');
const bodyParser = require('body-parser');
const socketIo = require('socket.io')
const http = require('http');
const helmet = require('helmet');
const server = http.createServer(app);
const multer = require('multer');
require('./cronJobs');
const upload = multer({ dest: 'uploads/' });
const { initialize } = require('./initializer');

const path = require('path');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

readdirSync('./Routes').map((r) => app.use('/api', require('./Routes/' + r)))

// ✅ แก้ไขส่วนนี้: เรียกใช้ initialize(server) เพียงครั้งเดียว
initialize(server);

connectDB();

app.use('/uploads', express.static('uploads'));
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

process.on('SIGINT', () => {
  disconnectDB().then(() => process.exit());
});