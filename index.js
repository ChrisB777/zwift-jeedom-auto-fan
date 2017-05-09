var ZwiftAccount = require("zwift-mobile-api");
var config = require('./config.json');
var account = new ZwiftAccount(config.username, config.password);

// Get profile for "me"
account.getProfile().profile().then(p => {
    console.log(p);  // JSON of rider profile (includes id property you can use below)
});