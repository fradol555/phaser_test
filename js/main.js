'use strict';

var gameW = 600;
var gameH = 600;

var Sensor = function(game, x, y) {
    Phaser.Sprite.call(this, game, x, y, 'sensor');
    this.anchor.setTo(0.5, 0.5);
    this.game.physics.enable(this, Phaser.Physics.ARCADE);
    this.width = 20;
    this.height = 20;
}
Sensor.prototype = Object.create(Phaser.Sprite.prototype);
Sensor.prototype.constructor = Sensor;

var Train = function(game, points, gap, isCycle) {
    Phaser.Sprite.call(this, game, 0, 0, 'train');
    this.anchor.setTo(0.5, 0.5);
    this.game.physics.enable(this, Phaser.Physics.ARCADE);

    this.points = points;
    this.currentPointIt = 0;
    this.currentPoint = this.points[this.currentPointIt];    
    this.isCycle = isCycle || false;

    this.x = this.currentPoint.x;
    this.y = this.currentPoint.y;
    if (gap > 0) {
        var lastPoint = this.points[this.points.length - 1];
        var rotation = this.game.math.angleBetween(this.x, this.y, lastPoint.x, lastPoint.y);
        this.x += Math.cos(rotation) * this.width * 1.1 * gap;
        this.y += Math.sin(rotation) * this.width * 1.1 * gap;
    }
    this.run = false;
    
    this.MAX_SPEED = 200; // pixels/second
};
Train.prototype = Object.create(Phaser.Sprite.prototype);
Train.prototype.constructor = Train;
Train.prototype.update = function () {
    if (this.run) {
        // Calculate distance to target
        var distance = this.game.math.distance(this.x, this.y, this.currentPoint.x, this.currentPoint.y);
        
        // If the distance > MIN_DISTANCE then move
        if (this.game.time.fps * Math.floor(distance) > this.MAX_SPEED ) {
            // Calculate the angle to the target
            var rotation = this.game.math.angleBetween(this.x, this.y, this.currentPoint.x, this.currentPoint.y);

            // Calculate velocity vector based on rotation and this.MAX_SPEED
            this.body.velocity.x = Math.cos(rotation) * this.MAX_SPEED;
            this.body.velocity.y = Math.sin(rotation) * this.MAX_SPEED;
        } else {
            this.body.velocity.setTo(0, 0);
            this.x = this.currentPoint.x;
            this.y = this.currentPoint.y;
            if (this.currentPointIt < this.points.length - 1) {
                this.currentPointIt += 1;
                this.currentPoint = this.points[this.currentPointIt];
            } else {
                if (this.isCycle) {
                    this.currentPointIt = 0;
                    this.currentPoint = this.points[this.currentPointIt];
                } else {
                    this.stop();
                }
            }
        }
    }
},
Train.prototype.start = function () {
    this.run = true;
};
Train.prototype.stop = function () {
    this.run = false;
    this.body.velocity.setTo(0, 0);
};

function Boot () {
}
Boot.prototype = {
    preload: function () {
        this.game.time.advancedTiming = true;
        this.load.image('preloader', 'assets/preloader.gif');
    },
    create: function () {
        this.game.input.maxPointers = 1;
        this.game.state.start('preload');
    }
};

function Preload () {
    this.asset = null;
    this.ready = false;
}
Preload.prototype = {    
    preload: function () {
        this.load.onLoadComplete.addOnce(this.onLoadComplete, this);
        this.asset = this.add.sprite(this.game.width / 2, this.game.height / 2, 'preloader');
        this.asset.anchor.setTo(0.5, 0.5);
        this.load.setPreloadSprite(this.asset);
    
        this.game.stage.backgroundColor = '#71c500';
        this.game.load.image('train', 'assets/bird.png');
        this.game.load.image('sensor', 'assets/pipe.png');
        this.game.load.image('button', 'assets/pipe.png');
        
        this.game.load.json('tracksPoints', 'assets/tracks.json', true);
    },
    create: function () {
        this.asset.cropEnabled = false;
    },
    update: function () {
        if (!!this.ready) {
            this.game.state.start('main');
        }
    },
    onLoadComplete: function () {
        this.ready = true;
    }
};

function Main() {
}
Main.prototype = {
    create: function () {      
        this.game.time.events.add(Phaser.Timer.SECOND * 1.5, this.start, this).autoDestroy = true;
	    this.game.stage.backgroundColor = '#71c5cf';
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
                        
        //TRACKS
        this.tracksJSON = this.game.cache.getJSON('tracksPoints');
        this.tracksBitmap = this.game.add.bitmapData(this.game.width, this.game.height);
        this.drawTracks(this.tracksBitmap, this.tracksJSON.points, true);
        this.tracks = this.game.add.sprite(0, 0, this.tracksBitmap);
        
        //SENSORS
        this.sensors = this.game.add.group();
        this.drawSensors(this.sensors, this.tracksJSON.points);
        
        //TRAIN
        this.train = new Train(this.game, this.tracksJSON.points, 0, true);
        this.game.add.existing(this.train);
        this.isTrainOverSensor = false;
        
        this.wagons = this.game.add.group();
        for (var i = 0; i < 5; i++) {
            this.wagons.add(new Train(this.game, this.tracksJSON.points, i, true));
        }
        
        
        this.reactionButton = this.game.add.button(50, 50, 'button', this.reactionClick, this);
        this.reactionButton.anchor.setTo(0.5, 0.5);
        
        this.score = 0;
        this.labelScore = game.add.text(this.game.width / 2, 20, '0', {
            font: '30px Arial',
            fill: '#fff'
        });
        
        this.endInfo = game.add.text(125, 250, 'Click anywhere to restart.', {
            font: '30px Arial',
            fill: '#fff'
        });
        this.endInfo.visible = false;
    },
    start: function () {
        this.train.start();
        this.wagons.callAll('start');
    },
    stop: function () {
        this.train.stop();
        this.wagons.callAll('stop');
    },
    update: function () {
        if (!this.train.inWorld) {
            this.restartGame();
        }
        if (!this.isTrainOverSensor) {
            this.isTrainOverSensor = this.game.physics.arcade.overlap(this.train, this.sensors, this.needReaction, null, this);
        } else {
            this.isTrainOverSensor = this.game.physics.arcade.overlap(this.train, this.sensors, null, null, this);
        }
    },    
    drawTracks: function (bitmap, points, isCycle) {
        var i;
        bitmap.ctx.beginPath();
        bitmap.ctx.lineWidth = "10";
        bitmap.ctx.moveTo(points[0].x, points[0].y);
        for (i = 1; i < points.length; i += 1) {
            bitmap.ctx.lineTo(points[i].x, points[i].y);
        }
        if (isCycle) {            
            bitmap.ctx.lineTo(points[0].x, points[0].y);
        }
        bitmap.ctx.stroke();
    },    
    drawSensors: function (group, points) {
        var i;
        for (i = 1; i < points.length; i += 1) {
            if (points[i].sensor) {
                group.add(new Sensor(group.game, points[i].x, points[i].y));
            }
        }
    },    
    needReaction: function () {
        this.isReaction = false;
        this.reactionButton.angle = 45;
        this.game.time.events.add(Phaser.Timer.SECOND * 1.5, this.checkReaction, this).autoDestroy = true;
    },
    reactionClick: function () {
        if (!this.isReaction) {
            this.isReaction = true;
            this.reactionButton.angle = 0;
        }
    },
    checkReaction: function () {
        if (!this.isReaction) {
            this.reactionButton.angle = 0;
            this.stop();
            this.endInfo.visible = true;
            this.game.input.onDown.addOnce(this.restartGame, this);
        } else {
            this.score += 1;
            this.labelScore.setText(this.score.toString());
        }
    },
    restartGame: function () {
        this.game.state.start('main');
    }
};


// Add and start the 'main' state to start the game

// Initialize Phaser, and create a 400x490px game
var game = new Phaser.Game(gameW, gameH, Phaser.CANVAS, 'gameDiv');
game.state.add('boot', new Boot());
game.state.add('preload', new Preload());
game.state.add('main', new Main());
game.state.start('boot');