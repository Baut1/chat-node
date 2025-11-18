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
app.use(express.static("cliente"));

// JWT SECRET
dotenv.config();
const SECRET = process.env.JWT_SECRET;

// Usuarios
const usuarios = [
  { usuario: "bauti", password: "bautipass" },
  { usuario: "user1", password: "pass1" },
  { usuario: "juan", password: "perez" },
  { usuario: "pepito", password: "pepito" },
  { usuario: "asd", password: "asd" }
];

// sessionKey por usuario
const sessionKeys = new Map();
// Login
app.post("/login", (req, res) => {
  const { usuario, password } = req.body;

  const user = usuarios.find(u => u.usuario === usuario && u.password === password);
  if (!user) {
    logger.info(`Login fallido para usuario: ${usuario}`);
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign({ usuario }, SECRET, { expiresIn: "24h" });
  const sessionKey = CryptoJS.lib.WordArray.random(16).toString();

  sessionKeys.set(usuario, sessionKey);

  logger.info(`${usuario} inició sesión`);

  res.json({ token, sessionKey });
});

const server = http.createServer(app);

// Server WEBSOCKET
const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // ws → usuario

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  try {
    const data = jwt.verify(token, SECRET);
    req.usuario = data.usuario;

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit("connection", ws, req.usuario);
    });

  } catch (e) {
    socket.destroy();
  }
});

wss.on("connection", (ws, usuario) => {
  clients.set(ws, usuario);

  logger.info(`Usuario conectado: ${usuario}`);
  const joinMsg = `${usuario} se unió al chat`;
  broadcast(joinMsg, ws);

  ws.on("message", data => {
    const key = sessionKeys.get(usuario);

    const decrypted = CryptoJS.AES.decrypt(data.toString(), key)
      .toString(CryptoJS.enc.Utf8);

    logger.info(`Mensaje de ${usuario}: ${decrypted}`);
    broadcast(`${usuario}: ${decrypted}`, ws);
  });

  ws.on("close", () => {
    clients.delete(ws);
    logger.info(`Usuario desconectado: ${usuario}`);
    broadcast(`${usuario} salió del chat`);
  });

  ws.on("error", err => {
    logger.info(`Error en WS de ${usuario}: ${err.message}`);
  });
});

// broadcast
function broadcast(texto, except = null) {
  for (const [ws, usuario] of clients.entries()) {
    if (ws === except) continue;

    const key = sessionKeys.get(usuario);
    const encrypted = CryptoJS.AES.encrypt(texto, key).toString();

    ws.send(encrypted);
  }

  logger.info(`Broadcast: ${texto}`);
}

// Inicio del sv
server.listen(4000, () => {
  logger.info("Servidor iniciado en http://localhost:4000");
});
