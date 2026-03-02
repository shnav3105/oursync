import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { Play, Pause, SkipForward, SkipBack } from "phosphor-react"

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  transports: ["websocket"],
})

//  ADD THIS RIGHT HERE
socket.on("connect", () => {
  console.log("Socket connected:", socket.id)
})

const songs = [
  { name: "Song 1", file: "/music/song1.mp3" },
  { name: "Song 2", file: "/music/song2.mp3" },
  { name: "Song 3", file: "/music/song3.mp3" },
  { name: "Song 4", file: "/music/song4.mp3" },
  { name: "Song 5", file: "/music/song5.mp3" },
  { name: "Song 6", file: "/music/song6.mp3" },
]

export default function App() {
  const [roomId, setRoomId] = useState("")
  const [joined, setJoined] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [partnerConnected, setPartnerConnected] = useState(false)
  const [queue, setQueue] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")

  const audioRef = useRef(null)

  const formatTime = (time) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const resetRoom = () => {
    setJoined(false)
    setIsHost(false)
    setPartnerConnected(false)
    setRoomId("")
    setCurrentSongIndex(0)
    setIsPlaying(false)
    setCurrentTime(0)
    setQueue([])
    setMessages([])
  }

  useEffect(() => {
    socket.on("host", () => setIsHost(true))
    socket.on("user-joined", () => setPartnerConnected(true))
    socket.on("user-left", () => setPartnerConnected(false))
    socket.on("queue-updated", (newQueue) => setQueue(newQueue))
    socket.on("receive-message", (data) =>
      setMessages((prev) => [...prev, data])
    )
    socket.on("room-ended", () => {
      alert("Host ended the room ❤️")
      resetRoom()
    })

    socket.on("control", ({ data }) => {
      if (!isHost) {
        const audio = audioRef.current

        setCurrentSongIndex(data.index)

        // Wait until new audio source loads
        setTimeout(() => {
          audio.currentTime = data.time
          setCurrentTime(data.time)

          if (data.playing) {
            audio.play()
            setIsPlaying(true)
          } else {
            audio.pause()
            setIsPlaying(false)
          }
        }, 150)
      }
    })

    return () => socket.off()
  }, [isHost])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const setMeta = () => setDuration(audio.duration)

    const handleEnded = () => {
      if (!isHost) return

      if (queue.length > 0) {
        const next = queue[0]
        const remaining = queue.slice(1)
        const nextIndex = songs.findIndex(
          (s) => s.name === next.name
        )

        setQueue(remaining)
        socket.emit("update-queue", { roomId, queue: remaining })
        setCurrentSongIndex(nextIndex)
      } else {
        setCurrentSongIndex(
          (prev) => (prev + 1) % songs.length
        )
      }
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", setMeta)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", setMeta)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [queue, isHost, currentSongIndex])

  useEffect(() => {
    if (!isHost) return
    const audio = audioRef.current
    audio.currentTime = 0
    audio.play()
    setIsPlaying(true)

    socket.emit("control", {
      roomId,
      data: { time: 0, index: currentSongIndex, playing: true },
    })
  }, [currentSongIndex])

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8)
    setRoomId(id)
    socket.emit("create-room", id)
    setJoined(true)
  }

  const joinRoom = () => {
    if (!socket) {
      console.log("Socket not ready")
      return
    }

    if (!socket.connected) {
      console.log("Socket not connected yet")
      return
    }

    console.log("Emitting join-room:", roomId)

    socket.emit("join-room", roomId)
  }

  const syncState = (time, index, playing) => {
    socket.emit("control", {
      roomId,
      data: { time, index, playing },
    })
  }

  const playMusic = () => {
    audioRef.current.play()
    setIsPlaying(true)
    syncState(audioRef.current.currentTime, currentSongIndex, true)
  }

  const pauseMusic = () => {
    audioRef.current.pause()
    setIsPlaying(false)
    syncState(audioRef.current.currentTime, currentSongIndex, false)
  }

  const handleSeek = (e) => {
    if (!isHost) return
    const rect = e.target.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    syncState(newTime, currentSongIndex, isPlaying)
  }

  const addToQueue = (song) => {
    const updated = [...queue, song]
    setQueue(updated)
    socket.emit("update-queue", { roomId, queue: updated })
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    const sender = isHost ? "host" : "listener"
    socket.emit("send-message", {
      roomId,
      message: newMessage,
      sender,
    })
    setNewMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-rose-950 to-pink-950 text-white flex items-center justify-center">
      {!joined ? (
        <Card className="w-[400px] p-6 space-y-4 bg-black/70 border-pink-900">
          <h1 className="text-3xl text-center text-pink-300">
            ❤️ Our Room
          </h1>
          <Button onClick={createRoom} className="w-full bg-pink-600">
            Create Room
          </Button>
          <Input
            placeholder="Enter Room Code"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="bg-zinc-800 text-white"
          />
          <Button onClick={joinRoom} className="w-full bg-rose-700">
            Join Room
          </Button>
        </Card>
      ) : (
        <Card className="w-[800px] p-6 bg-black/70 border-pink-900 space-y-6">
          <div className="flex justify-between">
            <h2 className="text-white font-semibold">
              Room: <span className="text-pink-400">{roomId}</span>
            </h2>
            <Badge className="bg-pink-600">
              {partnerConnected ? "Connected ❤️" : "Waiting..."}
            </Badge>
          </div>

          <h3 className="text-xl text-pink-300">
            {songs[currentSongIndex].name}
          </h3>

          {/* 🎚 Draggable Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              step="0.1"
              disabled={!isHost}
              onChange={(e) => {
                if (!isHost) return
                const newTime = Number(e.target.value)
                audioRef.current.currentTime = newTime
                setCurrentTime(newTime)

                socket.emit("control", {
                  roomId,
                  data: {
                    time: newTime,
                    index: currentSongIndex,
                    playing: isPlaying,
                  },
                })
              }}
              className="w-full accent-pink-500 cursor-pointer disabled:opacity-50"
            />

            <div className="flex justify-between text-sm text-zinc-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={songs[currentSongIndex].file}
          />

          {isHost && (
            <div className="flex gap-6 justify-center">
              <Button onClick={() =>
                setCurrentSongIndex((p) => (p - 1 + songs.length) % songs.length)
              }>
                <SkipBack size={22} weight="fill" />
              </Button>

              <Button onClick={isPlaying ? pauseMusic : playMusic}>
                {isPlaying ? (
                  <Pause size={22} weight="fill" />
                ) : (
                  <Play size={22} weight="fill" />
                )}
              </Button>

              <Button onClick={() =>
                setCurrentSongIndex((p) => (p + 1) % songs.length)
              }>
                <SkipForward size={22} weight="fill" />
              </Button>
            </div>
          )}

          {/* Scrollable All Songs */}
          <div>
            <h4 className="text-pink-300 mb-2">All Songs</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {songs.map((song, i) => (
                <div
                  key={i}
                  className="flex justify-between bg-zinc-800 p-2 rounded"
                >
                  <span>{song.name}</span>
                  <Button
                    size="sm"
                    onClick={() => addToQueue(song)}
                    className="bg-pink-600"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Queue */}
          <div>
            <h4 className="text-pink-300 mb-2">Up Next</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {queue.length === 0 && (
                <p className="text-zinc-400 text-sm">
                  No songs queued
                </p>
              )}
              {queue.map((song, i) => (
                <div key={i} className="bg-zinc-800 p-2 rounded">
                  {song.name}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-black/50 rounded p-4 h-48 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-2">
              {messages.map((msg) => {
                const isMine =
                  msg.sender === (isHost ? "host" : "listener")

                return (
                  <div
                    key={msg.id}
                    className={`flex mb-2 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                        isMine
                          ? "bg-pink-600 text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) =>
                  setNewMessage(e.target.value)
                }
                placeholder="Type message..."
                className="bg-zinc-800 text-white"
              />
              <Button
                onClick={sendMessage}
                className="bg-pink-600"
              >
                Send
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}