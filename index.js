const fs = require('fs');

if(!fs.existsSync('./config.json')){
    console.error('Configuration file "config.json" do not exist. See config.example.json');
	process.exit(1);
}


var ZwiftAccount = require("zwift-mobile-api");
var config = require('./config.json');
var account = new ZwiftAccount(config.username, config.password);
var playerId = null;

console.log('Zwift Jeedom auto fan is starting');

try{

    console.log('Getting your profile ...');
    // Get profile for "me"
    account.getProfile().profile().then(p => {
        // console.log(p);  // JSON of rider profile (includes id property you can use below)
	    playerId = p.id;

		console.log('Your id: '+playerId);

		var world = account.getWorld(1);

		console.log("Starting the rider status polling");
		let statusPolling = setInterval(() => {
			console.log('Getting the rider status');

			world.riderStatus(playerId).then(status => {

				var justWatching = status.justWatching;
				var cadenceUHz = status.cadenceUHz;
				var speed = status.speed;
				var heartrate = status.heartrate;
				var power = status.power;

				console.log('cadence: '+cadenceUHz+', speed: '+speed+', heart: '+heartrate+', power: '+power+', justWatching: '+justWatching);
				// console.log(status); // JSON of rider status
			}).catch(error => {
				console.log('Not riding');
				// console.error('There was an error when getting the player status!');
			});
		}, 12000);
    });
} catch (err) {
	console.error('There was an error!', err);
}
