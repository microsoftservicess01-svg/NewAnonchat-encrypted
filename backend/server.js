import express from "express";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import cors from "cors";
import { initDB, registerUser, authenticateUser, closeAndEncryptDB } from "./db.js";
import process from "process";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

(async ()=>{ await initDB(); })();

app.get("/", (req, res) => res.send("AnonChat secure signaling & auth server"));

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: "username & password required" });
  try {
    const result = await registerUser(username, password);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({ error: "username & password required" });
  const auth = await authenticateUser(username, password);
  if (!auth) return res.status(401).json({ error: "Invalid credentials" });
  return res.json({ message: "Login successful", username });
});

// Map username -> socketId and socketId -> username
const users = new Map();
const sockets = new Map();

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("register", (username) => {
    if(!username) return;
    users.set(username, socket.id);
    sockets.set(socket.id, username);
    socket.emit("registered", { username });
    console.log("registered", username, socket.id);
  });

  // encrypted signaling: server just forwards encrypted blobs
  socket.on("enc-offer", ({ to, blob }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("enc-offer", { from: sockets.get(socket.id), blob });
    else socket.emit("user-not-found", { to });
  });

  socket.on("enc-answer", ({ to, blob }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("enc-answer", { from: sockets.get(socket.id), blob });
  });

  socket.on("enc-candidate", ({ to, blob }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("enc-candidate", { from: sockets.get(socket.id), blob });
  });

  socket.on("disconnect", () => {
    const username = sockets.get(socket.id);
    if(username){
      users.delete(username);
      sockets.delete(socket.id);
      console.log("user disconnected", username);
    }
  });
});

const PORT = process.env.PORT || 10000;
process.on('SIGINT', async ()=>{ console.log('shutting down, encrypting DB'); await closeAndEncryptDB(); process.exit(0); });
process.on('SIGTERM', async ()=>{ console.log('shutting down, encrypting DB'); await closeAndEncryptDB(); process.exit(0); });

server.listen(PORT, () => console.log(`Backend running on ${PORT}`));
