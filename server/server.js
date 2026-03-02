const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")

const app = express()
app.use(cors())

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: "*" },
})

let rooms = {}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("create-room", (roomId) => {
    rooms[roomId] = {
      host: socket.id,
      users: [socket.id],
      queue: [],
    }
    socket.join(roomId)
    socket.emit("host")
  })

  socket.on("join-room", (roomId) => {
    if (rooms[roomId] && rooms[roomId].users.length < 2) {
      rooms[roomId].users.push(socket.id)
      socket.join(roomId)

      socket.emit("joined-success")
      io.to(roomId).emit("user-joined")

      // 🔥 Ask host to sync current playback state
      io.to(rooms[roomId].host).emit("request-sync", {
        roomId,
        newUser: socket.id,
      })
    } else {
      socket.emit("room-full")
    }
  })

  socket.on("control", ({ roomId, data }) => {
    socket.to(roomId).emit("control", { data })
  })

  socket.on("update-queue", ({ roomId, queue }) => {
    if (rooms[roomId]) {
      rooms[roomId].queue = queue
      io.to(roomId).emit("queue-updated", queue)
    }
  })

  socket.on("send-message", ({ roomId, message, sender }) => {
    io.to(roomId).emit("receive-message", {
      message,
      sender,
      id: Date.now(),
    })
  })

  socket.on("end-room", (roomId) => {
    if (rooms[roomId]) {
      io.to(roomId).emit("room-ended")
      delete rooms[roomId]
    }
  })

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId].users = rooms[roomId].users.filter(
        (id) => id !== socket.id
      )

      io.to(roomId).emit("user-left")

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId]
      }
    }
  })
})

server.listen(5000, () => {
  console.log("Server running on port 5000")
})