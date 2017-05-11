const fs = require('fs');

if(!fs.existsSync('./config.json')){
    console.error('Configuration file "config.json" do not exist. See config.example.json');
	process.exit(1);
}

var http = require('http');
var ZwiftAccount = require("zwift-mobile-api");
var config = require('./config.json');
var account = new ZwiftAccount(config.zwift.username, config.zwift.password);
var playerId = null;
var riding = false;
var statusPolling = null;
var countNotRiding = 0;

var setJeedomValue = function (id, value){
	var url = config.jeedom.url+'/core/api/jeeApi.php?apikey='+config.jeedom.apikey+'&type='+config.jeedom.set.type+'&id='+id+'&value='+value;
	console.log('Jeedom call: '+url);
	http.get(url);
};

console.log('Zwift Jeedom auto fan is starting');

try{

    console.log('Getting your profile ...');
    // Get profile for "me"
    account.getProfile().profile().then(p => {
		// console.log(p);  // JSON of rider profile (includes id property you can use below)
		// process.exit(12);
	    playerId = p.id;

		console.log('Your id: '+playerId);

		var world = account.getWorld(1);
				
		console.log("Starting the PC power polling (each "+config.pooling_pc+"s)");
		let computerPowerPolling = setInterval(() => {
			// Check if the PC that running Zwift is ON
			http.get(config.jeedom.url+'/core/api/jeeApi.php?apikey='+config.jeedom.apikey+'&type='+config.jeedom.get.type+'&id='+config.jeedom.get.id_power_pc, (res) => {
				const { statusCode } = res;
				let error;
				if (statusCode !== 200) {
    				error = new Error(`Request Failed.\n` + `Status Code: ${statusCode}`);
  				} 
  				
  				if (error) {
    				console.error(error.message);
    				// consume response data to free up memory
    				res.resume();
    				return;
  				}
  				
  				res.setEncoding('utf8');
				let rawData = '';
				res.on('data', (chunk) => { rawData += chunk; });
				res.on('end', () => {
					try {
					  var pcPower = parseInt(rawData);
					  console.log("pcPower: "+pcPower);
					  if(pcPower > 1){
					  	// PC is running
					  	if(statusPolling === null){
					  		console.log("Starting the rider status polling (each "+config.pooling_status+"s)");
							statusPolling = setInterval(() => {
								console.log('Getting the rider status');

								world.riderStatus(playerId).then(status => {
								
									var justWatching = status.justWatching;
									var cadence = parseInt(status.cadenceUHz/1000000*60);
									var speed = status.speed/1000000;
									var heartrate = status.heartrate;
									var power = status.power;

									console.log('cadence: '+cadence+', speed: '+speed+', heart: '+heartrate+', power: '+power+', justWatching: '+justWatching);
									
									if(!riding && justWatching == 0){
										// Start riding
										riding = true;
										countNotRiding = 0;
										setJeedomValue(config.jeedom.set.id_riding, 1);
									}
									
									if(riding){
										setJeedomValue(config.jeedom.set.id_cadence, cadence);
										setJeedomValue(config.jeedom.set.id_speed, speed);
										setJeedomValue(config.jeedom.set.id_power, power);
										setJeedomValue(config.jeedom.set.id_heart, heartrate);
										setJeedomValue(config.jeedom.set.id_touch, 1);
									}
									
									//console.log(status); // JSON of rider status
								}).catch(error => {
									console.log('Not riding');
									if(riding && countNotRiding++ > 2){
										// Stop riding
										riding = false;
										setJeedomValue(config.jeedom.set.id_riding, 0);
									}
								});
							}, config.pooling_status*1000);
					  	}
					  }else{
					  	// PC is not running
					  	if(statusPolling !== null){
					  		console.log("Stopping the rider status polling");
					  		clearInterval(statusPolling);
					  		statusPolling = null;
					  		
					  		if(riding){					  			
					  			// Stop riding
					  			riding = false;
					  			setJeedomValue(config.jeedom.set.id_riding, 0);
					  		}
					  	}
					  }
					} catch (e) {
					  console.error(e.message);
					}
				});
			}).on('error', (e) => {
  				console.error(`Got error: ${e.message}`);
			});
		}, config.pooling_pc*1000);

    });
} catch (err) {
	console.error('There was an error!', err);
}
