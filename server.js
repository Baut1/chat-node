import net from "net";
import fs from "fs";

// clientes conectados
const clients = [];

// registrar mensajes en logs/chat.log
function logMessage(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync("logs/chat.log", `[${timestamp}] ${message}\n`);
}

// Crea server TCP
const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  socket.name = `User${clients.length + 1}`;
  clients.push(socket);

  console.log(`${socket.name} se conectó`);
  logMessage(`${socket.name} se conectó`);

  // bienvenida
  socket.write(`👋 Bienvenido, ${socket.name}!\n`);
  broadcast(`${socket.name} se unió al chat.\n`, socket);

  // cuando recibimos datos del cliente
  socket.on("data", (data) => {
    const message = data.trim();

    // cmandos basicos
    if (message.startsWith("/nick ")) {
      const newNick = message.split(" ")[1];
      const oldNick = socket.name;
      socket.name = newNick;
      broadcast(`${oldNick} ahora se llama ${newNick}\n`, socket);
      return;
    }

    if (message === "/lista") {
      socket.write(
        `Conectados: ${clients.map((c) => c.name).join(", ")}\n`
      );
      return;
    }

    if (message === "/salir") {
      socket.end("Hasta pronto!\n");
      return;
    }

    // enviar broadcast a todos
    broadcast(`${socket.name}: ${message}\n`, socket);
    logMessage(`${socket.name}: ${message}`);
  });

  // desconexión
  socket.on("end", () => {
    clients.splice(clients.indexOf(socket), 1);
    broadcast(`${socket.name} salió del chat.\n`);
    logMessage(`${socket.name} se desconectó`);
  });

  // error handling
  socket.on("error", (err) => {
    console.error(`Error con ${socket.name}: ${err.message}`);
  });
});

// Función para reenviar mensajes a todos SALVO al emisor
function broadcast(message, sender) {
  clients.forEach((client) => {
    if (client !== sender) client.write(message);
  });
}

// Arrancar servidor
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
