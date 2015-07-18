'use strict';

var gameW = 1000;
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

var ReactionButton = function(game, x, y, callback, callbackContext) {
    Phaser.Button.call(this, game, x, y, '', callback, callbackContext);
    this.bodySprite = this.game.add.sprite(0, 0, 'button');
    this.bodySprite.anchor.setTo(0.5, 0.5);
    this.addChild(this.bodySprite);
    this.bodySprite.animations.add('needReaction', null, 4, true);
}
ReactionButton.prototype = Object.create(Phaser.Button.prototype);
ReactionButton.prototype.constructor = ReactionButton;
ReactionButton.prototype.playAnimation = function() {
    this.bodySprite.animations.play('needReaction');
}
ReactionButton.prototype.stopAnimation = function() {
    this.bodySprite.animations.stop(null, true);
}

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
    
    this.MAX_SPEED = 100; // pixels/second
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
        this.game.load.spritesheet('controlButton', 'assets/controlButton.png', 64, 64, 9);
        this.game.load.spritesheet('button', 'assets/button.png', 50, 50, 2);
        this.game.load.spritesheet('schemat', 'assets/schemat.png', 600, 100, 4);
        
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
        //AUTOSTART
		//this.game.time.events.add(Phaser.Timer.SECOND * 1.5, this.startSimulation, this).autoDestroy = true;		
	    this.game.stage.backgroundColor = '#fff';
		
		var background = game.add.graphics(0, 0);
		background.beginFill(0xEEEEEE);
		background.drawRect(0, 0, 1000, 400);
		background.endFill();
		background.beginFill(0xDDDDDD);
		background.drawRect(0, 400, 600, 200);
		background.endFill();
		background.beginFill(0xCCCCCC);
		background.drawRect(600, 400, 400, 200);
		background.endFill();
		
        this.game.physics.startSystem(Phaser.Physics.ARCADE);
                        
        //TRACKS
        this.tracksJSON = this.game.cache.getJSON('tracksPoints');
        this.tracksBitmap = this.game.add.bitmapData(this.game.width, this.game.height);
        this.drawTracks(this.tracksBitmap, this.tracksJSON.points, this.tracksJSON.isCycle);
        this.tracks = this.game.add.sprite(0, 0, this.tracksBitmap);
        
        //SENSORS
        this.sensors = this.game.add.group();
        this.drawSensors(this.sensors, this.tracksJSON.points);
        
        //TRAIN
        this.train = new Train(this.game, this.tracksJSON.points, 0, this.tracksJSON.isCycle);
        this.game.add.existing(this.train);
        this.isTrainOverSensor = false;
        
        this.wagons = this.game.add.group();
        for (var i = 1; i < 1; i++) {
            this.wagons.add(new Train(this.game, this.tracksJSON.points, i, this.tracksJSON.isCycle));
        }
        
		this.game.add.button(0, 330, 'controlButton', this.startSimulation, this, 2, 1, 0, 1);
		this.game.add.button(70, 330, 'controlButton', this.stopSimulation, this, 5, 4, 3, 4);
		this.game.add.button(140, 330, 'controlButton', this.resetSimulation, this, 8, 7, 6, 7);
		
        //// SCHEMA
        this.schema = this.game.add.sprite(600, 0, 'schemat');
        this.schema.animations.add('step1', [0, 1], 4, true);
        this.schema.animations.add('step2', [2, 3], 4, true);
        
		//// DESCRIPTION	
        this.descriptionTitle = this.game.add.text(20, 420, 'OPIS', {
            font: '30px Arial',
            fill: '#000'
        });
        this.descriptionText = this.game.add.text(20, 450, '', {
            font: '20px Arial',
            fill: '#222'
        });
		
		//// CONTROL PANEL
        //REACTION BUTTON
        this.controlPanel = this.game.add.group();
		this.controlPanel.x = 600;
		this.controlPanel.y = 400;
        this.reactionButton = this.controlPanel.add(new ReactionButton(this.game, 50, 50, this.reactionClick, this));
        this.reactionButton.anchor.setTo(0.5, 0.5);
    },
    startSimulation: function () {
        this.descriptionText.setText("Start symulacji");
        this.train.start();
        this.wagons.callAll('start');
		this.schema.animations.play('step1');
    },
    stopSimulation: function () {
        this.train.stop();
        this.wagons.callAll('stop');
		this.schema.animations.stop();
    },
    resetSimulation: function () {
        this.restartGame();
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
        this.descriptionText.setText("Wymagana reakcja");
        this.isReaction = false;
        this.schema.animations.play('step2');
        this.reactionButton.angle = 45;
        this.reactionButton.playAnimation();
        this.game.time.events.add(Phaser.Timer.SECOND * 1.5, this.checkReaction, this).autoDestroy = true;
    },
    reactionClick: function () {
        if (!this.isReaction) {
            this.isReaction = true;
            this.reactionButton.angle = 0;
            this.reactionButton.stopAnimation();
        }
    },
    checkReaction: function () {
        if (!this.isReaction) {
            this.reactionButton.angle = 0;
            this.reactionButton.stopAnimation();
            this.stopSimulation();
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

var game = new Phaser.Game(gameW, gameH, Phaser.CANVAS, 'gameDiv');
game.state.add('boot', new Boot());
game.state.add('preload', new Preload());
game.state.add('main', new Main());
game.state.start('boot');
