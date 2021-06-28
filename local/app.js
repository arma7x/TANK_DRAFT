const BULLET_SIZE = 4;
var myId = parseInt(Math.random() * 1e10 + 1001);
var socket = null;
var currentPlayer = null;
var otherPlayers = {};

var game = {
  resources: [
    { name: "greentank", type: "image", "src": "tank-green.png",  }
  ],
  loaded: function() {
    me.pool.register("greentank", game.Tank);
    me.pool.register("bullet", game.Bullet);
    this.playScreen = new game.PlayScreen();
    me.state.set(me.state.PLAY, this.playScreen);
    me.state.change(me.state.PLAY);
    
    socket.on("positions", function(data) {
      if (data[socket.id].length > 0) {
        console.log('Exec', socket.id, data[socket.id]);
        currentPlayer.pos.x = me.Math.clamp(data[socket.id][0], currentPlayer.minX, currentPlayer.maxX);
        currentPlayer.pos.y = me.Math.clamp(data[socket.id][1], currentPlayer.minY, currentPlayer.maxY);
        if (currentPlayer.__DIRECTION__ !== data[socket.id][2]) {
          rotateTank(currentPlayer, data[socket.id][2]);
        }
      }
      for (let p in data) {
        if (p !== socket.id && otherPlayers[p] == null) {
          otherPlayers[p] = me.game.world.addChild(me.pool.pull("greentank"));
          console.log('Add', p);
        } else if (p !== socket.id && otherPlayers[p]) {
          if (data[p].length > 0 && otherPlayers[p].pos) {
            otherPlayers[p].pos.x = me.Math.clamp(data[p][0], otherPlayers[p].minX, otherPlayers[p].maxX);
            otherPlayers[p].pos.y = me.Math.clamp(data[p][1], otherPlayers[p].minY, otherPlayers[p].maxY);
            if (otherPlayers[p].__DIRECTION__ !== data[p][2]) {
              rotateTank(otherPlayers[p], data[p][2]);
            }
          }
        }
      }
    });

    socket.on("disconnected", function(id) {
      if (otherPlayers[id]) {
        me.game.world.removeChild(otherPlayers[id]);
        delete otherPlayers[id];
      }
    })

  },
  onload: function () {
    if (!me.video.init(240, 320, {parent: document.body, scale: "auto", renderer: me.video.CANVAS})) {
      alert("Your browser does not support HTML5 Canvas :(");
      return;
    }

    me.audio.init("ogg");
    me.loader.preload(game.resources, this.loaded.bind(this));
    socket = io("ws://127.0.0.1:3000", { transports: ["websocket"] });
  },
};

game.PlayScreen = me.Stage.extend({
  onResetEvent: function() {
    currentPlayer = me.game.world.addChild(me.pool.pull("greentank"));
    me.game.world.addChild(new me.ColorLayer("background", "#A00"), 0);
    
    me.input.bindKey(me.input.KEY.LEFT, "left");
    me.input.bindKey(me.input.KEY.RIGHT, "right");
    me.input.bindKey(me.input.KEY.UP, "up");
    me.input.bindKey(me.input.KEY.DOWN, "down");
  },
  onDestroyEvent: function() {
    me.input.unbindKey(me.input.KEY.LEFT);
    me.input.unbindKey(me.input.KEY.RIGHT);
    me.input.unbindKey(me.input.KEY.UP);
    me.input.unbindKey(me.input.KEY.DOWN);
  }
});

me.event.subscribe(me.event.KEYDOWN, function (action, keyCode, edge) {
  const plyr = currentPlayer
  const time = 30;
  const yAxis = ['up', 'down'];

  if (keyCode === 32) {
    var bX, bY, bD;
    if (yAxis.indexOf(plyr.__DIRECTION__) > -1) {
      if (plyr.__DIRECTION__ === 'down')
        bX = plyr.pos.x - (BULLET_SIZE/2), bY = plyr.pos.y + (plyr.height / 2), bD = 'down';
      else
        bX = plyr.pos.x - (BULLET_SIZE/2), bY = plyr.pos.y - (plyr.height / 2) - (BULLET_SIZE/2), bD = 'up';
    } else {
      if (plyr.__DIRECTION__ === 'right')
        bX = plyr.pos.x + (plyr.width / 2), bY = plyr.pos.y - (BULLET_SIZE/2), bD = 'right';
      else
        bX = plyr.pos.x + (plyr.width / 2) - (BULLET_SIZE/2) - plyr.width, bY = plyr.pos.y - (BULLET_SIZE/2), bD = 'left';
    }
    const b = me.game.world.addChild(me.pool.pull("bullet", bX, bY))
    b.__DIRECTION__ = bD;
  } else {
    if (action === "left") {
      if (plyr.__DIRECTION__ !== 'left') {
        rotateTank(plyr, 'left');
      } else
        plyr.pos.x -= plyr.vel * time / 1000;
    } else if (action === "right"){
      if (plyr.__DIRECTION__ !== 'right') {
        rotateTank(plyr, 'right');
      } else
        plyr.pos.x += plyr.vel * time / 1000;
    } else if (action === "up") {
      if (plyr.__DIRECTION__ !== 'up') {
        rotateTank(plyr, 'up');
      } else
        plyr.pos.y -= plyr.vel * time / 1000;
    } else if (action === "down") {
      if (plyr.__DIRECTION__ !== 'down') {
        rotateTank(plyr, 'down');
      } else
        plyr.pos.y += plyr.vel * time / 1000;
    }
    me.Math.clamp(plyr.pos.y, plyr.minY, plyr.maxY);
    me.Math.clamp(plyr.pos.x, plyr.minX, plyr.maxX);

  }
  socket.emit("move", {data: [plyr.pos.x, plyr.pos.y, plyr.__DIRECTION__]});
});

game.Tank = me.Sprite.extend({
  init: function() {
    this._super(me.Sprite, "init", [
      me.game.viewport.width / 2,
      me.game.viewport.height / 2,
      {
        image: me.loader.getImage("greentank"),
      }
    ]);
    this.__DIRECTION__ = 'down';
    this.scale(0.7, 0.7);
    this.vel = 65;
    this.minX = (this.width / 2);
    this.maxX = me.game.viewport.width - (this.height / 2);
    this.minY = (this.height / 2);
    this.maxY = me.game.viewport.height - (this.height / 2);
  },
  update: function(time) {
    this._super(me.Sprite, "update", [time]);
    return true;
  }
});

game.Bullet = me.Entity.extend({
    init : function (x, y) {
        this._super(me.Entity, "init", [x, y, { width: BULLET_SIZE, height: BULLET_SIZE }]);
        this.vel = 250;
        this.body.collisionType = me.collision.types.PROJECTILE_OBJECT;
        this.renderable = new (me.Renderable.extend({
            init : function () {
                this._super(me.Renderable, "init", [0, 0, BULLET_SIZE, BULLET_SIZE]);
            },
            destroy : function () {},
            draw : function (renderer) {
                var color = renderer.getColor();
                renderer.setColor('#000');
                renderer.fillRect(0, 0, this.width, this.height);
                renderer.setColor(color);
            }
        }));
        this.alwaysUpdate = true;
    },

    update : function (time) {
      if (this.__DIRECTION__) {
        if (this.__DIRECTION__ === 'down') {
          this.pos.y += this.vel * time / 1000;
          if (this.pos.y + this.height >= me.game.viewport.height) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'up') {
          this.pos.y -= this.vel * time / 1000;
          if (this.pos.y - this.height <= 0) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'right') {
          this.pos.x += this.vel * time / 1000;
          if (this.pos.x + this.width >= me.game.viewport.width) {
              me.game.world.removeChild(this);
          }
        } else if (this.__DIRECTION__ === 'left') {
          this.pos.x -= this.vel * time / 1000;
          if (this.pos.x - this.width <= 0) {
              me.game.world.removeChild(this);
          }
        }
      }
      me.collision.check(this);
      return true;
    }
});

function rotateTank(tank, to) {
  const dirAngle = {up: 0, right: 90, down: 180, left: 270};
  const x = dirAngle[to] - dirAngle[tank.__DIRECTION__];
  tank.__DIRECTION__ = to;
  tank.rotate(x * Math.PI / 180);
}

me.device.onReady(function onReady() {
  game.onload();
});
