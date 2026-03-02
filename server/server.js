const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()

// Allow all origins (safe here because no auth)
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // 🔥 disable polling completely
})

const rooms = {}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id)

  socket.on("create-room", (roomId) => {
    rooms[roomId] = {
      host: socket.id,
      listeners: [],
      currentTime: 0,
      isPlaying: false,
      currentSong: 0,
      queue: [],
    }

    socket.join(roomId)
    socket.emit("room-created", roomId)
  })

  socket.on("join-room", (roomId) => {
    const room = rooms[roomId]
    if (!room) return

    if (room.listeners.length >= 1) {
      socket.emit("room-full")
      return
    }

    room.listeners.push(socket.id)
    socket.join(roomId)

    socket.emit("room-joined", room)
  })

  socket.on("play", ({ roomId, currentTime }) => {
    const room = rooms[roomId]
    if (!room) return

    room.isPlaying = true
    room.currentTime = currentTime

    socket.to(roomId).emit("play", { currentTime })
  })

  socket.on("pause", ({ roomId, currentTime }) => {
    const room = rooms[roomId]
    if (!room) return

    room.isPlaying = false
    room.currentTime = currentTime

    socket.to(roomId).emit("pause", { currentTime })
  })

  socket.on("seek", ({ roomId, currentTime }) => {
    const room = rooms[roomId]
    if (!room) return

    room.currentTime = currentTime
    socket.to(roomId).emit("seek", { currentTime })
  })

  socket.on("next-song", ({ roomId, songIndex }) => {
    const room = rooms[roomId]
    if (!room) return

    room.currentSong = songIndex
    room.currentTime = 0
    room.isPlaying = true

    io.to(roomId).emit("next-song", { songIndex })
  })

  socket.on("add-to-queue", ({ roomId, song }) => {
    const room = rooms[roomId]
    if (!room) return

    room.queue.push(song)
    io.to(roomId).emit("queue-updated", room.queue)
  })

  socket.on("chat-message", ({ roomId, message, sender }) => {
    io.to(roomId).emit("chat-message", {
      message,
      sender,
      timestamp: Date.now(),
    })
  })

  socket.on("disconnect-room", (roomId) => {
    io.to(roomId).emit("room-ended")
    delete rooms[roomId]
  })
})

app.get("/", (req, res) => {
  res.send("OurSync Backend Running 🚀")
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log("Server running on port", PORT)
})