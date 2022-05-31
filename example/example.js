const { Drax } = require("../drax");
const { Keystore } = require("../keystore");
const config = require("./config.json");
const { HTSensor } = require("./listeners/htsensor");
const { Rele } = require("./listeners/rele");
const { Trv } = require("./listeners/trv");
new Keystore().instance().addConfig(config)

var params = {
  host: null,
  port: null,
  vhost: null,
  config
}

var trv = new Trv()
var rele = new Rele()
var htsensor = new HTSensor()

var listeners = [trv, rele, htsensor]

var drax  = new Drax(params)
drax.start()
  .then(() => {
    var state = {temperatura: 84, battery: 78}
    drax.setState(3420, null, state, false)

    drax.addConfigurationListener("configurations/homematicip", listeners)
  })
  .catch(e => {})