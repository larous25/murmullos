import { Server, Socket } from 'socket.io';

let nextMessageId = 1;

interface NewRoomData {
  newRoom: string;
  room?: string;
}

interface ChangeRoomData {
  before: string;
  room: string;
}

interface MessagePayload {
  id: number;
  userName: string;
  msg: string;
}

interface MessageData {
  room: string;
  message: MessagePayload;
}


// Historial por sala
const roomHistories: Record<string, MessagePayload[]> = {
  default: []
};

export const snsp = (serverIo: Server) => {
  const socketsNsp = serverIo.of('/chat');

  socketsNsp.on('connection', (socket: Socket) => {

    socket.data.userName = 'anonymous';

    socket.on('join', (data: { room: string; userName: string; lastMessageId?: number }) => {
      console.log(`Usuario ${data.userName} se ha unido a la sala ${data.room}`);
      socket.data.userName = data.userName;
      socket.join(data.room);

      if (!roomHistories[data.room]) {
        roomHistories[data.room] = [];
      }

      const messages = (roomHistories[data.room] ?? [])
        .filter(m => m.id > (data.lastMessageId ?? 0));

      socket.emit('history', {
        room: data.room,
        messages
      });
    });

    // crear sala
    socket.on('newroom', (data: NewRoomData) => {
      if (!roomHistories[data.newRoom]) {
        roomHistories[data.newRoom] = [];
      }

      socket.broadcast.emit('newroom', data.newRoom);
    });

    // cambio de sala
    socket.on('changeRoom', (data: ChangeRoomData) => {
      socket.leave(data.before);
      socket.join(data.room);

      if (!roomHistories[data.room]) {
        roomHistories[data.room] = [];
      }

      socket.emit('history', {
        room: data.room,
        messages: roomHistories[data.room]
      });

    
      socket.to(data.room).emit('message', {
        userName: 'system',
        msg: `Welcome ${socket.data.userName} to ${data.room}`,
        room: data.room
      });
    });

    // mensajes
    socket.on('message', (data: MessageData) => {
      const { room, message } = data;
      console.log(`Mensaje recibido de ${socket.data.userName} en la sala ${room}:`);
      if (!roomHistories[room]) {
        roomHistories[room] = [];
      }
      console.log(`Mensaje recibido en la sala ${room}:`, message);

      const finalMessage: MessagePayload = {
        id: nextMessageId++,
        userName: socket.data.userName,
        msg: message.msg
      };

      roomHistories[room].push(finalMessage);

      socket.to(room).emit('message', {
        ...finalMessage,
        room
      });
    });
  });
}