const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

var positions = {}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {

  setInterval(() => {
    io.emit('positions', positions);
  }, 16);

  if (!positions[socket.id]) {
    positions[socket.id] = [];
  }

  socket.on('chat message', msg => {
    io.emit('chat message', msg);
  });
  
  socket.on('move', msg => {
    if (positions[socket.id]) {
      positions[socket.id] = msg.data;
    }
  });

  socket.on("disconnect", (reason) => {
    delete positions[socket.id];
    io.emit('disconnected', socket.id);
  });

});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
