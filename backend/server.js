const express = require('express');
const app = express();
const port = 3000;
const morgan = require('morgan')
const { readdirSync } = require('fs')
const cors = require('cors')
const bodyParse = require('body-parser');
const { disconnect } = require('process');
const { connectDB, disconnectDB } = require('./config/db'); 
const bodyParser = require('body-parser');
const WebSocket = require('ws');

app.use(morgan('dev'))
app.use(cors())
app.use(bodyParser.json({limit : ' 10mb'}))

app.server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
// Setup WebSocket server
const wss = new WebSocket.Server({ noServer: true });  // Create WebSocket server
// WebSocket connection logic
wss.on('connection', (ws) => {
  console.log('🟢 New WebSocket client connected!');
  ws.on('message', (message) => {
    console.log('📩 Received:', message.toString());
    ws.send('✅ Hello from server');
  });
  ws.send('🚀 Welcome to the WebSocket server!');
});

// Upgrade HTTP server to WebSocket server
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// app
readdirSync('./Routes').map((r) => app.use('/api', require('./Routes/' + r)))

// test
app.get('/',(req,res) =>{
  res.send('มาแล้วจร้าาา')
});

// database 
connectDB();

process.on('SIGINT', () =>{
  disconnectDB().then(() => process.exit());
});

//  run server
// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });

