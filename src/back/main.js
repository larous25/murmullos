'use strict';

const http   = require('http');
const io = require('socket.io');
const fs     = require('fs');
const path   = require('path');

var server = http.createServer((req, res) => {
  fs.readFile(path.join(__dirname,'../front/index.html'), (err, data) => {
    if(err){
      res.writeHead(500);
      return res.end(String(err));
    }

    res.writeHead(200, {'content-Type':'text/html'});
    res.end(data);
  });
}).listen(process.env.PORT || 3000);


/* mini-logger */
server
.on('listening', (req, res) =>{
  console.log('-----------------------');
  console.log('server is running');
  console.log('-----------------------');
})
.on('connnection', (req, res) =>{
  console.log('new connection');
})
.on('request', (req, res) => {
  console.log(`resquest to ${req.url} - ${req.method}`);
});



/* sockets */
var serverIo = io.listen(server);


let socketsNsp = serverIo.of('chat');
socketsNsp.on("connection",  (socket) => {

  socket.join('default');

  socket.on('newroom', (data) => {

    socket.broadcast.emit('newroom', data.newRoom);
    // socketsNsp.emit('newroom', data.newRoom);
  });

  socket.on('changeRoom', (data) => {

    socket.leave(data.before);
    socket.join(data.room);

    socket.to(data.room).broadcast.emit('message', {
      msg: `Wellcome ${socket.id.replace('/chat#', '')}`
    });
  });

  socket.on('message', (data) => {
    console.log('message', data);
    socket.to(data.room).broadcast.emit('message', data.message);
  });

});
