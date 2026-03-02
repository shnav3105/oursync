❤️ Our Room – Real-Time LDR Music Sync App

Our Room is a private 2-user real-time music synchronization app built for long-distance relationships.
It allows two people to listen to music in perfect sync while chatting together in real time.

Listen together. Stay connected. Feel closer — even miles apart.

🌟 Features

🎵 Real-time synchronized music playback

👑 Host-controlled room

⏯ Play / Pause / Next / Previous

🔁 Auto-play next song

📍 Seek synchronization

🔒 Only 2 users allowed per room

💬 Real-time private chat

❤️ Live partner connection indicator

🚪 End Room with automatic redirect

🎨 Romantic red / black / pink UI theme
-------------------------------------------------------
🛠 Tech Stack

Frontend

React (Vite)

Tailwind CSS

shadcn/ui

Phosphor Icons

Socket.io-client
--------------------------------------------------------------
Backend

Node.js

Express

Socket.io
-------------------------------------------------------------------
📁 Project Structure
oursync/
│
├── server/
│   └── server.js
│
├── client/
│   ├── public/music/
│   └── src/App.jsx
│
└── README.md
-----------------------------------------------------------
🚀 How To Run Locally
1️⃣ Clone Repository
git clone <your-repo-url>
cd oursync
---------------------------------------------------------
2️⃣ Start Backend
cd server
npm install
npm run dev
---------------------------------------------------
Backend runs on:

http://localhost:5000
--------------------------------------------------
3️⃣ Start Frontend
cd client
npm install
npm run dev
-----------------------------------------------------
Frontend runs on:

http://localhost:5173
-------------------------------------------------
🎶 Add Your Own Music
Place .mp3 files inside:

client/public/music/

Update the songs array in:

client/src/App.jsx

Example:

const songs = [
  { name: "Perfect - Ed Sheeran", file: "/music/perfect.mp3" },
  { name: "Until I Found You", file: "/music/until.mp3" },
]
🔄 How Synchronization Works

Host emits playback events.

Server broadcasts to listener.

Listener updates playback state.

Song end automatically triggers next track.

All communication handled via WebSockets (Socket.io).

🚪 End Room Logic

When host ends the room:

Server emits room-ended

Listener receives notification

Both users return to home screen

Room is deleted from memory

🔮 Future Improvements

🌍 Deployment (Render + Vercel)

🔔 Typing indicator

🕒 Message timestamps

🔐 Room password protection

🎧 Shuffle & Loop mode

📱 Mobile optimization

❤️ Built For

Long-distance couples who want to:

Share music moments

Feel connected in real time

Experience something intimate and private

Built with ❤️ using React, Node.js, and Socket.io.