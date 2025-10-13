import net from "net";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const client = net.createConnection({ port: 4000 }, () => {
  console.log("Conectado al servidor\n");
});

client.setEncoding("utf8");

// Mostrar msjes recibidos del servidor
client.on("data", (data) => {
  process.stdout.write(data);
});

// Leer mensajes desde consola
rl.on("line", (line) => {
  client.write(line);
});

// desconexión
client.on("end", () => {
  console.log("Desconectado del servidor");
  process.exit(0);
});
