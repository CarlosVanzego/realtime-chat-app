const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

// Set views directory and view engine
app.set('views', './views')
app.set('view engine', 'ejs')

// Serve static files from the 'public' directory
app.use(express.static('public'))

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }))

// Object to store rooms and users
const rooms = { }

// Route for the home page
app.get('/', (req, res) => {
  res.render('index', { rooms: rooms })
})

// Route for creating a new room
app.post('/room', (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect('/')
  }
  rooms[req.body.room] = { users: {} }
  res.redirect(req.body.room)
  // Send message that new room was created
  io.emit('room-created', req.body.room)
})

// Route for accessing a room
app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.redirect('/')
  }
  res.render('room', { roomName: req.params.room })
})

// Start the server listening on port 3000
server.listen(3000)

// Socket.io connection handling
io.on('connection', socket => {
  // Event handler for when a new user joins a room
  socket.on('new-user', (room, name) => {
    socket.join(room)
    rooms[room].users[socket.id] = name
    socket.to(room).broadcast.emit('user-connected', name)
  })
  // Event handler for when a chat message is sent
  socket.on('send-chat-message', (room, message) => {
    socket.to(room).broadcast.emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
  })
  // Event handler for when a user disconnects
  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).broadcast.emit('user-disconnected', rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
  })
})

// Function to get the rooms a user is in
function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}