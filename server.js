import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import winston from "winston";
import dotenv from "dotenv";

// Logger con winston
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: "chat.log",
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      )
    }),
    new winston.transports.Console({
      level: "info",
      format: winston.format.simple()
    })
  ]
});

// Server HTTP + EXPRESS
const app = express();
app.use(express.json());
app.use(express.static("public"));

dotenv.config();
const SECRET = process.env.JWT_SECRET;

// Usuarios
const users = [
  { username: "bauti", password: "bautipass" },
  { username: "user1", password: "pass1" },
  { username: "juan", password: "perez" },
  { username: "pepito", password: "pepito" },
  { username: "asd", password: "asd" }
];

// sessionKey por usuario
const sessionKeys = new Map();

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    logger.info(`Login fallido para usuario: ${username}`);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign({ username }, SECRET, { expiresIn: "12h" });
  const sessionKey = CryptoJS.lib.WordArray.random(16).toString();

  sessionKeys.set(username, sessionKey);

  logger.info(`${username} inició sesión`);

  res.json({ token, sessionKey });
});

const server = http.createServer(app);

// Server WEBSOCKET
const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // ws → username

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  try {
    const data = jwt.verify(token, SECRET);
    req.username = data.username;

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit("connection", ws, req.username);
    });

  } catch (e) {
    socket.destroy();
  }
});

wss.on("connection", (ws, username) => {
  clients.set(ws, username);
  logger.info(`Usuario conectado: ${username}`);

  const joinMsg = `${username} se unió al chat`;
  broadcast(joinMsg, ws);

  ws.on("message", data => {
    const key = sessionKeys.get(username);

    const decrypted = CryptoJS.AES.decrypt(data.toString(), key)
      .toString(CryptoJS.enc.Utf8);

    logger.info(`Mensaje de ${username}: ${decrypted}`);

    broadcast(`${username}: ${decrypted}`, ws);
  });

  ws.on("close", () => {
    clients.delete(ws);
    logger.info(`Usuario desconectado: ${username}`);
    broadcast(`${username} salió del chat`);
  });

  ws.on("error", err => {
    logger.info(`Error en WS de ${username}: ${err.message}`);
  });
});

// broadcast
function broadcast(text, except = null) {
  for (const [ws, user] of clients.entries()) {
    if (ws === except) continue;

    const key = sessionKeys.get(user);
    const encrypted = CryptoJS.AES.encrypt(text, key).toString();

    ws.send(encrypted);
  }

  logger.info(`Broadcast: ${text}`);
}

// Inicio del sv
server.listen(4000, () => {
  logger.info("Servidor iniciado en http://localhost:4000");
});
