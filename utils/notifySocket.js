const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Notification = require('../models/Notification');
const { sendPushToUser, sendPushToAll } = require('./webPush');
const { sendFcmToUser, sendFcmToAll } = require('./fcmPush');

let io = null;

/**
 * Call this once from server.js, passing the raw http.Server instance
 * (the one returned by http.createServer(app) / app.listen()).
 *
 *   const http = require('http');
 *   const server = http.createServer(app);
 *   require('./utils/notifySocket').init(server);
 *   server.listen(PORT, ...);
 */
function init(httpServer) {
  io = new Server(httpServer, {
   cors: {
  origin: [process.env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:5500', 'capacitor://localhost', 'https://localhost', 'http://localhost'].filter(Boolean),
  credentials: true,
},
  });

  // Auth handshake: client connects with `io(url, { auth: { token: jwt } })`
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id || decoded._id || decoded.userId; // match whatever your JWT payload uses
      if (!socket.userId) return next(new Error('Invalid token payload'));

      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    // Every user gets a private room named after their own id — lets us
    // target "notify this one user" without tracking socket ids manually.
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      // socket.io auto-leaves rooms on disconnect, nothing to clean up here
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized — call init(httpServer) first in server.js');
  return io;
}

/**
 * Create a notification in the DB and push it in real time.
 * Use this from anywhere in the app instead of writing directly to the model
 * (e.g. inside your existing message-send route, or an admin announcement route).
 *
 * @param {Object} opts
 * @param {string|null} opts.recipient   User id, or null for a broadcast
 * @param {boolean} [opts.isBroadcast]   true = goes to all users
 * @param {'message'|'system'|'feature'|'mention'} opts.type
 * @param {string} opts.title
 * @param {string} [opts.body]
 * @param {string} [opts.link]
 * @param {string} [opts.sender]         User id of whoever triggered it
 */
async function notify({ recipient = null, isBroadcast = false, type, title, body, link, sender }) {
  const notification = await Notification.create({
    recipient,
    isBroadcast,
    type,
    title,
    body,
    link,
    sender,
  });

  const payload = {
    _id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    createdAt: notification.createdAt,
  };

  if (isBroadcast) {
    io.emit('notification', payload); // everyone connected right now (in-app bell)
    sendPushToAll(payload).catch(() => {});
    sendFcmToAll(payload).catch(() => {}); // phone/browser tray, including users not currently on the site
  } else if (recipient) {
    io.to(`user:${recipient}`).emit('notification', payload);
    sendPushToUser(recipient, payload).catch(() => {});
    sendFcmToUser(recipient, payload).catch(() => {});
  }

  return notification;
}

module.exports = { init, getIo, notify };
