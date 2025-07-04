import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (onItemsData) => {
  if (!socket) {
    socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("🟢 Connected to WebSocket server");
    });

    socket.on("itemsData", (items) => {
      if (typeof onItemsData === "function") {
        onItemsData(items);
      }
    });

    socket.on("receiveMessage", (message) => {
      console.log("📩 New message received:", message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔴 Disconnected from WebSocket");
  }
};

export const sendMessage = (room, message) => {
  if (socket) {
    socket.emit("sendMessage", { room, message });
  }
};

export const joinRoom = (room) => {
  if (socket) {
    socket.emit("joinRoom", room);
    console.log(`Socket joined room: ${room}`);
  }
};
