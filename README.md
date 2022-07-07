# Space Battle Online
![space battle game](./img/space_battle_game.PNG)
*Created in 2018*<br>
The online multiplayer version of [Space Battle](https://github.com/bramca/Space-Battle).<br>
It has a login page and a top down shooting game, last man standing.<br>
Written in `javascript` and `html`.<br>
Using the [p5.js](https://p5js.org/) library for the game objects and the game rendering. <br>

# How to run
To start the server you can run the command `npm start`.<br>
A server will be started on `http://localhost:3000`.<br>
When you first launch the game, no users will be registered.<br>
On the login page there is a link where you can register users.<br>
This will create a `users.db` file with the username and passwords (hashed).

# Controls
`space bar` hold it to shoot the laser beam.<br>
`arrow up` hold to thrust forward.<br>
`arrow left/right` turn the ship left or right.<br>
`a` toggle AI, let the computer play for you.<br>

# Power Ups
![shield](./img/shield.PNG) puts a shield around your ship that gives you some extra health.<br>
![heal](./img/heal.PNG) completely heals the damage taken.<br>
![speed buff](./img/speed_buff.PNG) gives you a temporary speed buff.<br>
![triple laser](./img/triple_laser.PNG) temporary shoot 3 laser beams.