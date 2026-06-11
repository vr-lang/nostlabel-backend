import { Server } from "socket.io";
import { isOriginAllowed } from "../utils/corsHelper.js";

let io = null;
const userSockets = new Map(); // userId -> socketId
const adminSockets = new Set(); // set of admin socketIds

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        console.warn(`[Socket CORS Audit] REJECTED ORIGIN: ${origin}`);
        return callback(null, false);
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room based on user role
    socket.on("register", (data) => {
      if (data && data.userId) {
        userSockets.set(data.userId, socket.id);
        socket.join(`user_${data.userId}`);
        console.log(`User registered: ${data.userId} with socket ${socket.id}`);

        if (data.role === "ADMIN") {
          adminSockets.add(socket.id);
          socket.join("admins");
          console.log(`Admin joined socket room: ${socket.id}`);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Clean up socket IDs
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      adminSockets.delete(socket.id);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Notification helper functions
const sendOrderNotificationToAdmin = (order) => {
  if (io) {
    io.to("admins").emit("new_order", {
      message: `New Order Placed: #${order.orderNumber}`,
      order,
    });
  }
};

const sendOrderStatusNotificationToUser = (userId, order) => {
  if (io) {
    io.to(`user_${userId}`).emit("order_status_update", {
      message: `Your order #${order.orderNumber} status is now: ${order.orderStatus}`,
      order,
    });
  }
};

export { initSocket, getIO, sendOrderNotificationToAdmin, sendOrderStatusNotificationToUser };
