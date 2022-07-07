var ship;
var lasers = [];
var shootmodus = 1;
var field = { width: 1200, height: 1200 };
var radius = 15;
var sessionID;
var socket = io();
var c;
var removelasers = [];
var otherplayers = {};
var poweruptypes = ['shield', 'tripleshot', 'doublespeed', 'fullhealth'];
var powerups = {};
var removepowerups = [];
var powerupfreq = {};
for (let i = 0; i < poweruptypes.length; i++) {
    powerupfreq[poweruptypes[i]] = {};
}

window.addEventListener("keydown", function (e) {
    // space en arrow keys
    if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

function setup() {
    sessionID = document.getElementById("clientName").textContent;
    c = createCanvas(window.innerWidth, window.innerHeight);
    document.getElementById("canvascontainer").appendChild(c.canvas);
    document.body.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    let playercolor = 'rgb('+floor(random(0, 255))+','+floor(random(0, 255))+','+floor(random(0, 255))+')';
    ship = new Ship(playercolor , createVector(random(-field.width + radius, field.width - radius), random(-field.height + radius, field.height - radius)), radius);
    socket.emit('playerinfo', { sessionID: sessionID, x: ship.pos.x, y: ship.pos.y, angle: ship.angle, life: ship.life, color: ship.shipcolor, rotation: ship.rotation , shield: ship.shield });
    socket.on('otherplayerinfo', function (data) {
        otherplayers[data.id] = new Ship(data.ship.color, createVector(data.ship.pos.x, data.ship.pos.y), radius);
        otherplayers[data.id].life = data.ship.life;
        otherplayers[data.id].shield = data.ship.shield;
    });
    socket.on('removeplayer', function (data) {
        delete otherplayers[data.id];
    });
    // niet gebruiken, veel lag
    socket.on('sendnewrotation', function (data) {
        if (otherplayers[data.id]) {
            otherplayers[data.id].setRotation(data.rotation);
            otherplayers[data.id].pos.x = data.pos.x;
            otherplayers[data.id].pos.y = data.pos.y;
        }
    });
    socket.on('sendthrusting', function (data) {
        if (otherplayers[data.id]) {
            otherplayers[data.id].thrusting = data.thrusting;
            otherplayers[data.id].pos.x = data.pos.x;
            otherplayers[data.id].pos.y = data.pos.y;
        }
    });
    socket.on('sendupdatedposition', function (data) {
        if (otherplayers[data.id]) {
            otherplayers[data.id].pos.x = data.pos.x;
            otherplayers[data.id].pos.y = data.pos.y;
            otherplayers[data.id].angle = data.angle;
            otherplayers[data.id].life = data.life;
        }
    });
    socket.on('sendshoot', function (data) {
        if (otherplayers[data.id]) {
            otherplayers[data.id].shoot(data.velocity, data.shootmod);
        }
    });
    // clientside bots
    // for (let i = 0; i < 10; i++) {
    //     let playercolor = 'rgb('+floor(random(0, 255))+','+floor(random(0, 255))+','+floor(random(0, 255))+')';
    //     otherplayers[i] = new Ship(playercolor , createVector(random(-field.width + radius, field.width - radius), random(-field.height + radius, field.height - radius)), radius);
    //     otherplayers[i].bot = true;
    // }
    socket.emit('givepowerups', {});
    socket.on('getpowerups', function (data) {
        for (let i in data) {
            powerups[i] = new Powerup({ x: data[i].x, y: data[i].y }, data[i].type, data[i].radius);
            powerupfreq[data[i].type][i] = powerups[i];
        }
    });
    socket.on('sendremovedpowerups', function (data) {
        while (data.removepowerups.length > 0) {
            let index = data.removepowerups.pop();
            if (powerups[index]) {
                delete powerupfreq[powerups[index].type][index];
                delete powerups[index];                
            }
        }
    });
    socket.on('newplayerinfo', function (data) {
        if (otherplayers[data.id]) {
            otherplayers[data.id].poweruptimer = data.ship.poweruptimer;
            otherplayers[data.id].poweruptimerbool = data.ship.poweruptimerbool;
            otherplayers[data.id].life = data.ship.life;
            otherplayers[data.id].shield = data.ship.shield;
            otherplayers[data.id].shootmodus = data.ship.shootmodus;
            otherplayers[data.id].thrustspeed = data.ship.thrustspeed;
        }
    });
    socket.on('sendnewpowerups', function (data) {
        for (let i = 0; i < data.removedindexes.length; i++) {
            powerups[data.removedindexes[i]] = new Powerup({ x: data.newpowerups[i].x, y: data.newpowerups[i].y }, data.newpowerups[i].type, data.newpowerups[i].radius);
        }
    });
}

function draw() {
    background(0);
    translate(c.width/2, c.height/2);
    translate(-ship.pos.x, -ship.pos.y);
    for (let i = -field.width + 100; i < field.width; i += 100) {
        stroke('rgba(255,255,255,0.4)');
        line(i, -field.height, i, field.height);
    }
    for (let i = -field.height + 100; i < field.height; i += 100) {
        stroke('rgba(255,255,255,0.4)');
        line(-field.width, i, field.width, i);
    }
    stroke(255);
    line(-field.width, -field.height, -field.width, field.height);
    line(-field.width, field.height, field.width, field.height);
    line(field.width, field.height, field.width, -field.height);
    line(field.width, -field.height, -field.width, -field.height);
    ship.render(c);
    ship.turn();
    ship.update(field);
    ship.thrust();

    for (let i in powerups) {
        powerups[i].render();
        if (!powerups[i].removed && powerups[i].checkPickUp(ship)) {
            removepowerups.push(i);
        }
    }

    if (removepowerups.length > 0) {
        socket.emit('removepowerups', { removepowerups: removepowerups });
        socket.emit('newshipinfo', { life: ship.life, shield: ship.shield, shootmodus: ship.shootmodus, thrustspeed: ship.thrustspeed, poweruptimer: ship.poweruptimer, poweruptimerbool: ship.poweruptimerbool });
    }

    while (removepowerups.length > 0) {
        let index = removepowerups.pop();
        if (powerups[index]) {
            delete powerupfreq[powerups[index].type][index];
            delete powerups[index];
        }
    }

    for (let key in otherplayers) {
        otherplayers[key].render(c);
        otherplayers[key].turn();
        otherplayers[key].update(field);
        otherplayers[key].thrust();
        // client side bots
        // if (otherplayers[key].bot) {
        //     if (Object.keys(otherplayers).length > 0) {
        //         let firstplayer = ship;
        //         let mindist = dist(otherplayers[key].pos.x, otherplayers[key].pos.y, firstplayer.pos.x, firstplayer.pos.y);
        //         let closestplayer = firstplayer;
        //         for (let k in otherplayers){
        //             if (k != key) {
        //                 if (dist(otherplayers[k].pos.x, otherplayers[k].pos.y, otherplayers[key].pos.x, otherplayers[key].pos.y) < mindist) {
        //                     mindist = dist(otherplayers[k].pos.x, otherplayers[k].pos.y, otherplayers[key].pos.x, otherplayers[key].pos.y);
        //                     closestplayer = otherplayers[k];
        //                 }
        //             }
        //         }
        //         let theta = Math.round(Math.atan2(closestplayer.pos.y - otherplayers[key].pos.y, closestplayer.pos.x - otherplayers[key].pos.x) * 100) / 100;
        //         let shipangle = Math.round(otherplayers[key].angle * 100) / 100;
        //         if (theta-shipangle > 0.05 && shipangle < theta) {
        //             otherplayers[key].setRotation(0.05);
        //         } else if (shipangle-theta > 0.05 && shipangle > theta) {
        //             otherplayers[key].setRotation(-0.05);
        //         } else {
        //             otherplayers[key].setRotation(0);
        //         }

        //         if (mindist > 600) {
        //             otherplayers[key].thrusting = true;
        //         } else {
        //             otherplayers[key].thrusting = !otherplayers[key].thrusting;
        //             if (otherplayers[key].rotation === 0) {
        //                 otherplayers[key].shoot(3, shootmodus);
        //                 socket.emit('shoot', { velocity: 3, shootmod: shootmodus });
        //             }
        //         }
                
        //     } else {
        //         otherplayers[key].setRotation(0);
        //         otherplayers[key].thrusting = false;
        //     }
        // }
    }

    if (ship.bot) {
        if (Object.keys(otherplayers).length > 0) {
            let firstplayer = otherplayers[Object.keys(otherplayers)[0]];
            let mindist = dist(ship.pos.x, ship.pos.y, firstplayer.pos.x, firstplayer.pos.y);
            let closestplayer = firstplayer;
            for (let key in otherplayers){
                if (dist(ship.pos.x, ship.pos.y, otherplayers[key].pos.x, otherplayers[key].pos.y) < mindist) {
                    mindist = dist(ship.pos.x, ship.pos.y, otherplayers[key].pos.x, otherplayers[key].pos.y);
                    closestplayer = otherplayers[key];
                }
            }
            let theta = Math.round(Math.atan2(closestplayer.pos.y - ship.pos.y, closestplayer.pos.x - ship.pos.x) * 100) / 100;
            let shipangle = Math.round(ship.angle * 100) / 100;
            if (theta-shipangle > 0.05 && shipangle < theta) {
                ship.setRotation(0.05);
            } else if (shipangle-theta > 0.05 && shipangle > theta) {
                ship.setRotation(-0.05);
            } else {
                ship.setRotation(0);
            }

            if (mindist > 600) {
                ship.thrusting = true;
            } else {
                ship.thrusting = !ship.thrusting;
                if (ship.rotation === 0) {
                    ship.shoot(3, ship.shootmodus);
                    socket.emit('shoot', { velocity: 3, shootmod: ship.shootmodus });
                }
            }
            
        } else {
            ship.setRotation(0);
            ship.thrusting = false;
        }
    }

    for (let i = 0; i < lasers.length; i++) {
        if (!lasers[i].removed) {
        lasers[i].render();
        lasers[i].update();
            if (lasers[i].checkEdges(field)) {
                lasers[i].removed = true;
                removelasers.push(i);
            }
            if (lasers[i].hit(ship)) {
                if (ship.shield > 0) {
                    ship.shield -= 0.01;
                } else if (ship.life > 0) {
                    ship.life -= 0.01;
                } else {
                    gameover();
                }
                lasers[i].removed = true;
                removelasers.push(i);
            }
            for (let key in otherplayers) {
                if (lasers[i].hit(otherplayers[key])) {
                    if (otherplayers[key].shield > 0) {
                        otherplayers[key].shield -= 0.01;
                    } else if (otherplayers[key].life > 0) {
                        otherplayers[key].life -= 0.01;
                    }
                    // else {
                    //     // client side bots
                    //     delete otherplayers[key];
                    // }
                    lasers[i].removed = true;
                    removelasers.push(i);
                }
            }
        }
    }

    while (removelasers.length > 0) {
        let index = removelasers.pop();
        lasers.splice(index, 1);
    }
    if (keyIsDown(32) && !keyIsDown(LEFT_ARROW) && !keyIsDown(RIGHT_ARROW)) {
        ship.shoot(3, ship.shootmodus);
        socket.emit('shoot', { velocity: 3, shootmod: ship.shootmodus });
    }
    socket.emit('updatepositionandangle', { x: ship.pos.x, y: ship.pos.y, angle: ship.angle, life: ship.life });
}

function keyPressed() {
    if (keyCode === LEFT_ARROW) {
        ship.setRotation(-0.05);
        // socket.emit('updaterotation', { rotation: ship.rotation, x: ship.pos.x, y: ship.pos.y });
    } else if (keyCode === RIGHT_ARROW) {
        ship.setRotation(0.05);
        // socket.emit('updaterotation', { rotation: ship.rotation, x: ship.pos.x, y: ship.pos.y });
    } else if (keyCode === UP_ARROW) {
        ship.thrusting = true;
        socket.emit('updatethrusting', { thrusting: ship.thrusting, x: ship.pos.x, y: ship.pos.y });
    } else if (key === 'B') {
        // in commentaar voor classic
        // ship.pulse();
    } else if (key === 'W') {
        // in commentaar voor classic
        // ship.bombwall();
    } else if (key === '1') {
        // in commentaar voor classic
        // shootmodus = 1;
    } else if (key === '2') {
        // in commentaar voor classic
        // shootmodus = 2;
    } else if (key === '3') {
        // in commentaar voor classic
        // shootmodus = 3;
    } else if (key === 'X') {
        // in commentaar voor classic
        // ship.nuke();
    } else if (key === 'A') {
        ship.bot = !ship.bot;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
        ship.setRotation(0);
        // socket.emit('updaterotation', { rotation: ship.rotation, x: ship.pos.x, y: ship.pos.y });
    } else if (keyCode === UP_ARROW) {
        ship.thrusting = false;
        socket.emit('updatethrusting', { thrusting: ship.thrusting, x: ship.pos.x, y: ship.pos.y });
    }
}

function gameover() {
    window.location.href = "/menu";
}
