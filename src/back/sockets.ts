import { Server, Socket } from 'socket.io';


interface NewRoomData {
  newRoom: string;
  room?: string;
}

interface ChangeRoomData {
  before: string;
  room: string;
}

interface MessagePayload {
  userName: string;
  msg?: string | undefined;
  type?: 'text' | 'file' | undefined;
  fileName?: string | undefined;
  url?: string | undefined;
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
    // guardamos username en el socket
    socket.data.userName = 'anonymous';

    socket.on('join', (data: { room: string; userName: string }) => {
      socket.data.userName = data.userName;
      socket.join(data.room);

      if (!roomHistories[data.room]) {
        roomHistories[data.room] = [];
      }

      socket.emit('history', {
        room: data.room,
        messages: roomHistories[data.room]
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

      if (!roomHistories[room]) {
        roomHistories[room] = [];
      }

      // Ahora procesamos los datos dependiendo de si es texto o archivo
      const finalMessage: MessagePayload = {
        userName: socket.data.userName,
        type: message.type || 'text',
        msg: message.msg,
        fileName: message.fileName,
        url: message.url
      };

      roomHistories[room].push(finalMessage);

      socket.to(room).emit('message', {
        ...finalMessage,
        room
      });
    });
  });
}