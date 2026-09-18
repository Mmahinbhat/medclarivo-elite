const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Notification = require('../models/Notification');
const Call = require('../models/Call');
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
    console.log(`[Socket] User connected: ${socket.userId}, socket: ${socket.id}`);

    // ── WebRTC Call Signaling ──────────────────────────────────
    // Caller initiates a call
    socket.on('call:initiate', async ({ receiverId, callerName, callerAvatar }) => {
      try {
        console.log(`[Call] Initiate: caller=${socket.userId}, receiver=${receiverId}, callerName=${callerName}`);

        // Check how many sockets are in the receiver's room
        const receiverRoom = io.sockets.adapter.rooms.get(`user:${receiverId}`);
        console.log(`[Call] Receiver room user:${receiverId} has ${receiverRoom ? receiverRoom.size : 0} socket(s)`);

        const call = await Call.create({
          caller: socket.userId,
          receiver: receiverId,
          status: 'ringing',
        });

        console.log(`[Call] Created call ${call._id}, emitting call:incoming to user:${receiverId}`);

        io.to(`user:${receiverId}`).emit('call:incoming', {
          callId: call._id.toString(),
          callerId: socket.userId,
          callerName: callerName || 'Unknown',
          callerAvatar: callerAvatar || '',
        });

        socket.emit('call:ringing', { callId: call._id.toString() });

        // Auto-miss after 30 seconds if not answered
        setTimeout(async () => {
          const c = await Call.findById(call._id);
          if (c && c.status === 'ringing') {
            c.status = 'missed';
            await c.save();
            io.to(`user:${socket.userId}`).emit('call:missed', { callId: call._id.toString() });
            io.to(`user:${receiverId}`).emit('call:missed', { callId: call._id.toString() });
          }
        }, 30000);
      } catch (err) {
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });

    // Receiver accepts the call
    socket.on('call:accept', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call || call.status !== 'ringing') return;

        call.status = 'ongoing';
        call.startedAt = new Date();
        await call.save();

        io.to(`user:${call.caller.toString()}`).emit('call:accepted', { callId });
        io.to(`user:${call.receiver.toString()}`).emit('call:accepted', { callId });
      } catch (err) {
        socket.emit('call:error', { message: 'Failed to accept call' });
      }
    });

    // Receiver rejects the call
    socket.on('call:reject', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call || call.status !== 'ringing') return;

        call.status = 'rejected';
        await call.save();

        io.to(`user:${call.caller.toString()}`).emit('call:rejected', { callId });
      } catch (err) {
        socket.emit('call:error', { message: 'Failed to reject call' });
      }
    });

    // Either side ends the call
    socket.on('call:end', async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call || call.status === 'ended') return;

        call.status = 'ended';
        call.endedAt = new Date();
        if (call.startedAt) {
          call.duration = Math.round((call.endedAt - call.startedAt) / 1000);
        }
        await call.save();

        io.to(`user:${call.caller.toString()}`).emit('call:ended', {
          callId,
          duration: call.duration,
        });
        io.to(`user:${call.receiver.toString()}`).emit('call:ended', {
          callId,
          duration: call.duration,
        });
      } catch (err) {
        socket.emit('call:error', { message: 'Failed to end call' });
      }
    });

    // WebRTC offer/answer/ICE exchange — relay to the other user
    socket.on('call:offer', ({ callId, targetUserId, offer }) => {
      io.to(`user:${targetUserId}`).emit('call:offer', {
        callId,
        fromUserId: socket.userId,
        offer,
      });
    });

    socket.on('call:answer', ({ callId, targetUserId, answer }) => {
      io.to(`user:${targetUserId}`).emit('call:answer', {
        callId,
        fromUserId: socket.userId,
        answer,
      });
    });

    socket.on('call:ice-candidate', ({ callId, targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
        callId,
        fromUserId: socket.userId,
        candidate,
      });
    });
    // ── End Call Signaling ─────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.userId}, reason: ${reason}`);
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
