import io from 'socket.io-client';

let socket;

export const connectSocket = () => {
    socket = io('http://localhost:5000');  // URL ของ WebSocket Server
    socket.on('connect', () => {
        console.log('🟢 Connected to WebSocket server');
    });

    socket.on('receiveMessage', (message) => {
        console.log('📩 New message received:', message);
        // ฟังก์ชันในการรับข้อความสามารถทำอย่างอื่น เช่น อัพเดท UI
    });
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        console.log('🔴 Disconnected from WebSocket');
    }
};

export const sendMessage = (room, message) => {
    if (socket) {
        socket.emit('sendMessage', { room, message });
    }
};

export const joinRoom = (room) => {
    if (socket) {
        socket.emit('joinRoom', room);
        console.log(`Socket joined room: ${room}`);
    }
};
