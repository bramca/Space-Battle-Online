//require stuff
var express = require('express');
var bodyparser = require('body-parser');
var path = require("path");
var login = require("./routes/login.js");
var register = require("./routes/register.js");
var menu = require("./routes/menu.js");
var logout = require("./routes/logout.js");
var game = require("./routes/game.js");
const pug = require('pug');
var fs = require("fs");
var session = require('express-session')

var app = express();
global.users = {};

/*
    x live highscore
    ingame menu
    x opeten
    x replace
    x loggedIn boolean per client
*/

app.use(session({
    secret: 'agario12345',
    resave: false,
    saveUninitialized: true
}));

//Set views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, './public')));

//use bodyparser
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

//Check if the user is already logged in, if not redirect to the login page
app.use(function (req, res, next) {
    if (!global.users[req.sessionID]) {
        global.users[req.sessionID] = {};
    }
    if (req.url != "/login" && req.url != "/register") {
        if (!global.users[req.sessionID].loggedIn) {
            res.redirect("/login");
        }
        else {
            if (req.url == "/") {
                req.url = "/menu";
            }
            next();
        }
    }
    else {
        next();
    }
});


//routes
app.use("/login", login);
app.use("/register", register);
app.use("/menu", menu);
app.use("/logout", logout);
app.use("/game", game);

//server
var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
});

//websockets

var clients = {};
var io = require('socket.io')(server);
var field = { width: 1200, height: 1200 };
var powerupcount = 20;
var poweruptypes = ['shield', 'tripleshot', 'doublespeed', 'fullhealth'];
var powerups = {};

var radius = 15;

function random(begin, end) {
    return begin + Math.floor(Math.random() * (Math.abs(begin) + Math.abs(end) + 1));
}

for (let i = 0; i < powerupcount; i++) {
    let type = poweruptypes[random(0, poweruptypes.length-1)];
    powerups[i] = { x: random(-field.width+2*radius, field.width-2*radius), y: random(-field.height+2*radius, field.height-2*radius), type: type, radius: 2*radius };
}

io.on('connection', function (client) {
    console.log(global.timestamp() + "\tclient connected: " + client.id);
    clients[client.id] = client;

    client.on('newshipinfo', function (data) {
        clients[this.id].ship.shield = data.shield;
        clients[this.id].ship.life = data.life;
        clients[this.id].ship.shootmodus = data.shootmodus;
        clients[this.id].ship.thrustspeed = data.thrustspeed;
        clients[this.id].ship.poweruptimer = data.poweruptimer;
        clients[this.id].ship.poweruptimerbool = data.poweruptimerbool;
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('newplayerinfo', {
                    id: this.id,
                    ship: data
                });
            }
        }
    });
    client.on('givepowerups', function (data) {
        client.emit('getpowerups', powerups);
    });

    client.on('removepowerups', function (data) {
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('sendremovedpowerups', {
                    removepowerups: data.removepowerups
                });
            }
        }
        var removedindexes = [];
        while (data.removepowerups.length > 0) {
            let index = data.removepowerups.pop();
            if (powerups[index]) {
                delete powerups[index];
                removedindexes.push(index);
            }
        }
        let newpowerups = [];
        for (let i = 0; i < removedindexes.length; i++) {
            let index = removedindexes[i];
            let type = poweruptypes[random(0, poweruptypes.length-1)];
            powerups[index] = { x: random(-field.width+2*radius, field.width-2*radius), y: random(-field.height+2*radius, field.height-2*radius), type: type, radius: 2*radius };
            newpowerups.push(powerups[index]);
        }
        for (let key in clients) {
            clients[key].emit('sendnewpowerups', {
                removedindexes: removedindexes,
                newpowerups: newpowerups
            });
        }
    });

    client.on("playerinfo", function (data) {
        clients[this.id].sessionID = data.sessionID;
        clients[this.id].ship = {};
        clients[this.id].ship.pos = {};
        clients[this.id].ship.pos.x = data.x;
        clients[this.id].ship.pos.y = data.y;
        clients[this.id].ship.angle = data.angle;
        clients[this.id].ship.life = data.life;
        clients[this.id].ship.color = data.color;
        clients[this.id].ship.rotation = data.rotation;
        clients[this.id].ship.shield = data.shield;
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('otherplayerinfo', {
                    id: this.id,
                    ship: clients[this.id].ship
                });
                clients[this.id].emit('otherplayerinfo', {
                    id: key,
                    ship: clients[key].ship
                });
            }
        }
    });

    client.on('shoot', function (data) {
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('sendshoot', { velocity: data.velocity, shootmod: data.shootmod, id: this.id });
            }
        }
    });

    client.on('updatepositionandangle', function (data) {
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('sendupdatedposition', { pos: { x: data.x, y: data.y }, angle: data.angle, id: this.id, life: data.life });
            }
        }
    });

    client.on('updaterotation', function (data) {
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('sendnewrotation', { id: this.id, rotation: data.rotation, pos: { x: data.x, y: data.y } });
            }
        }
    });

    client.on('updatethrusting', function (data) {
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('sendthrusting', { id: this.id, thrusting: data.thrusting, pos: { x: data.x, y: data.y } });
            }
        }
    });

    client.on('disconnect', function () {
        console.log(global.timestamp() + "\tclient disconnected: " + this.id);
        for (let key in clients) {
            if (key != this.id) {
                clients[key].emit('removeplayer', { id: this.id });
            }
        }
        delete clients[this.id];
    });
});

//Timestamp
global.timestamp = function () {
    let date = new Date();
    return (date.getHours() < 10 ? '0' : '') + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":" + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
};

module.exports = app;
