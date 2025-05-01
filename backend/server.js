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
const { socketSetup } = require('./socket'); // 🔄 แยกออก

const server = http.createServer(app);

app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json({ limit: ' 10mb' }));

// app
readdirSync('./Routes').map((r) => app.use('/api', require('./Routes/' + r)))

socketSetup(server); // ✨ เรียกใช้แยก

// database 
connectDB();

// app.server = app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});


process.on('SIGINT', () => {
  disconnectDB().then(() => process.exit());
});

