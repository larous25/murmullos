import http, { IncomingMessage, ServerResponse } from 'http';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';

const filePath = new URL('../front/index.html', import.meta.url);

interface NewRoomData {
  newRoom: string;
  room?: string;
}

interface ChangeRoomData {
  before: string;
  room: string;
}

interface MessagePayload {
  msg: string;
}

interface MessageData {
  room: string;
  message: MessagePayload;
}

// 1. Estructura para guardar el historial en memoria
const roomHistories: Record<string, MessagePayload[]> = {
  'default': []
};

const server = http.createServer(
  (req: IncomingMessage, res: ServerResponse) => {
    fs.readFile(
      filePath,
      (err, data) => {
        if (err) {
          res.writeHead(500);
          return res.end(String(err));
        }

        res.writeHead(200, {
          'Content-Type': 'text/html'
        });

        res.end(data);
      }
    );
  }
);

server.listen(Number(process.env.PORT) || 3000);

/* mini-logger */
server
  .on('listening', () => {
    console.log('-----------------------');
    console.log('server is running');
    console.log('-----------------------');
  })
  .on('connection', () => {
    console.log('new connection');
  })
  .on('request', (req) => {
    console.log(`request to ${req.url} - ${req.method}`);
  });

/* sockets */
const serverIo = new Server(server);
const socketsNsp = serverIo.of('/chat');

socketsNsp.on('connection', (socket: Socket) => {
  // 2. Al conectar, el usuario entra a default y recibe su historial
  socket.join('default');
  socket.emit('history', {
    room: 'default',
    messages: roomHistories['default']
  });

  socket.on('newroom', (data: NewRoomData) => {
    // 3. Si la sala no existe en el historial, la inicializamos vacía
    if (!roomHistories[data.newRoom]) {
      roomHistories[data.newRoom] = [];
    }
    socket.broadcast.emit('newroom', data.newRoom);
  });

  socket.on('changeRoom', (data: ChangeRoomData) => {
    socket.leave(data.before);
    socket.join(data.room);

    // Asignamos a una variable para garantizar el tipo en TypeScript
    let history = roomHistories[data.room];

    if (!history) {
      history = [];
      roomHistories[data.room] = history;
    }

    // Usamos la variable 'history' que ya está garantizada como MessagePayload[]
    socket.emit('history', {
      room: data.room,
      messages: history
    });

    socket.to(data.room).emit('message', {
      msg: `Welcome ${socket.id}`,
      room: data.room
    });
  });

  socket.on('message', (data: MessageData) => {
    console.log('message', data);

    let history = roomHistories[data.room];

    if (!history) {
      history = [];
      roomHistories[data.room] = history;
    }

    // TypeScript ahora sabe con certeza que 'history' es un arreglo válido
    history.push(data.message);

    socket.to(data.room).emit('message', {
      msg: data.message.msg,
      room: data.room
    });
  });
});