import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { Play, Pause, SkipForward, SkipBack } from "phosphor-react"

const songs = [
  { name: "Song 1", file: "/music/song1.mp3" },
  { name: "Song 2", file: "/music/song2.mp3" },
  { name: "Song 3", file: "/music/song3.mp3" },
  { name: "Song 4", file: "/music/song4.mp3" },
  { name: "Song 5", file: "/music/song5.mp3" },
  { name: "Song 6", file: "/music/song6.mp3" },
]

export default function App() {
  const socketRef = useRef(null)
  const audioRef = useRef(null)

  const [roomId, setRoomId] = useState("")
  const [joined, setJoined] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [partnerConnected, setPartnerConnected] = useState(false)

  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [queue, setQueue] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")

  // 🔥 SOCKET SETUP
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL, {
      transports: ["websocket"],
    })

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id)
    })

    socketRef.current.on("listener-joined", () => {
      setPartnerConnected(true)
    })

    socketRef.current.on("room-joined", () => {
      setJoined(true)
      setPartnerConnected(true)
    })

    socketRef.current.on("control", ({ data }) => {
      if (!isHost) {
        const audio = audioRef.current
        setCurrentSongIndex(data.index)

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

    socketRef.current.on("queue-updated", (newQueue) => {
      setQueue(newQueue)
    })

    socketRef.current.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data])
    })

    socketRef.current.on("room-ended", () => {
      alert("Host ended the room ❤️")
      resetRoom()
    })

    return () => {
      socketRef.current.disconnect()
    }
  }, [isHost])

  // 🎧 AUDIO EVENTS
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const setMeta = () => setDuration(audio.duration)

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", setMeta)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", setMeta)
    }
  }, [])

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

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8)
    setRoomId(id)
    setIsHost(true)
    setJoined(true)
    socketRef.current.emit("create-room", id)
  }

  const joinRoom = () => {
    if (!socketRef.current?.connected) {
      console.log("Socket not connected")
      return
    }

    console.log("Joining:", roomId)
    socketRef.current.emit("join-room", roomId)
  }

  const syncState = (time, index, playing) => {
    socketRef.current.emit("control", {
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

  const addToQueue = (song) => {
    const updated = [...queue, song]
    setQueue(updated)
    socketRef.current.emit("update-queue", { roomId, queue: updated })
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    const sender = isHost ? "host" : "listener"

    socketRef.current.emit("send-message", {
      roomId,
      message: newMessage,
      sender,
    })

    setNewMessage("")
  }

  const formatTime = (time) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
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
            <h2 className="font-semibold">
              Room: <span className="text-pink-400">{roomId}</span>
            </h2>
            <Badge className="bg-pink-600">
              {partnerConnected ? "Connected ❤️" : "Waiting..."}
            </Badge>
          </div>

          <h3 className="text-xl text-pink-300">
            {songs[currentSongIndex].name}
          </h3>

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
              syncState(newTime, currentSongIndex, isPlaying)
            }}
            className="w-full accent-pink-500"
          />

          <div className="flex justify-between text-sm text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <audio ref={audioRef} src={songs[currentSongIndex].file} />

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
        </Card>
      )}
    </div>
  )
}