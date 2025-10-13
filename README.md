
# Chat distribuido seguro en Node.js – Entrega Parcial

## Requisitos previos

- Tener creada la carpeta `logs/` antes de ejecutar el servidor.

---

## Ejecución

### 1. Iniciar el servidor

Abrir una terminal y ejecutar:
node server.js

El servidor se iniciará en el puerto **4000** y quedará esperando conexiones.

---

### 2. Conectarse como cliente

Abrir **una o más terminales nuevas** y ejecutar:

```bash
node client.js
```

---

## Comandos disponibles

Dentro del cliente podés usar los siguientes comandos:

| Comando        | Descripción                        |
| -------------- | ---------------------------------- |
| `/nick nombre` | Cambia tu usuario        |
| `/lista`       | Muestra usuarios conectados    |
| `/salir`       | Cierra la conexión y sale del chat |

---

## Logs

Todos los mensajes/eventos se registran en el archivo:

```
logs/chat.log
```
