// Setter opp express serveren
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;


//setter opp til server
/*var baseURL               = getBaseURL(); // Call function to determine it
 var socketIOPort          = 8080;
 var socketIOLocation      = baseURL + socketIOPort; // Build Socket.IO location
 var socket                = io.connect(socketIOLocation);

 // Build the user-specific path to the socket.io server, so it works both on 'localhost' and a 'real domain'
 function getBaseURL()
 {
 baseURL = location.protocol + "//" + location.hostname + ":" + location.port;
 return baseURL;
 }
 */

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatrommet

// Brukernavn som er tilkoblet til chatten nå
var usernames = {};
var numUsers = 0;


io.on('connection', function (socket) {
    var addedUser = false;
    //Når klient/bruker "emitter" 'new message' hører denne på og utfører
    socket.on('new message', function (data) {
        //Vi forteller klient/bruker å utføre 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data,

        });
    });


    //Når klienten/bruker "emitter" 'add user' hører denne på og utfører
    socket.on('add user', function (username) {
        //Vi lagrer brukernavnet i socket session for denne klienten/brukeren
        socket.username = username;
        // Legger til klient/bruker i den globale listen
        usernames[username] = username;
        ++numUsers;
        addedUser = true;

        socket.emit('login', {
            numUsers: numUsers,

        });
        socket.emit('add users',{
            list: usernames,


        });

        //Echoer globalt(alle brukere) at en person har koblet til
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers,


        });
        console.log(usernames);
    });

    //Når klienten/bruker "emitter" 'typing' kringkaster vi det til andre
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    //Når klienten/bruker "emitter" 'stop typing' kringkaster vi det til andre
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    //Når brukeren kobler fra. utfør denne
    socket.on('disconnect', function () {
        //Fjerner brukeren fra global brukerliste
        if (addedUser) {
            delete usernames[socket.username];
            --numUsers;



            //Echoer globalt at denne brukeren/klienten har koblet fra
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers,
                list:usernames,
            });

        }

    });



});
