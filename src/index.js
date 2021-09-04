const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
//sets up server to use socket.IO
const io = socketio(server);

//SOCKET EMITS
// socket.emit -> emits to a specific socket
// io.emit -> emits to every connected client 
// socket.broadcast.emit -> send to every client but the one making the call 

// io.to.emit -> emits to everybody in a specific room
// socket.broadcast.to.emit -> like broadcast above but limiting to a specific chatroom
//
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

//socket contains info about the connection
io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }

        socket.join(user.room);
        //emit event from srv to client
        socket.emit('message', generateMessage('Chat admin', 'Welcome!'));
        //emits event to everybody excepting this connection
        socket.broadcast.to(user.room).emit('message', generateMessage('Chat admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback();
    });



    //callback is used to aknowledge the event to the client
    socket.on('sendMessage', (msg, callback) => {
        //initialize a badWords package filter
        const filter = new Filter();
        const user = getUser(socket.id);

        if (filter.isProfane(msg)) {
            return callback('Profanity is not allowed!!');
        }

        //emits to all available connections
        io.to(user.room).emit('message', generateMessage(user.username, msg));
        callback();
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('locationMessage', generateMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`))
        callback();
    })

    //When a socket is disconnected
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Chat admin', `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log('Server is running on port ' + port);
})