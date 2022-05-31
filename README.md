# drax-sdk-nodejs

This package allows interfacing to the Drax IoT platform (https://draxcloud.com/)
To use this plugin you need to create a project on the platform. After project creation you must use API_KEY and API_SECRET of project to:
 - publish state on node;
 - listen the node configuration;
 
### Installation 
To install the package you need to run the following command:

`$ npm install drax-sdk-nodejs`

### Usage 
Before use methods of sdk you need to do create a configuration file (config.json) with this structure:
```javascript
{
    "draxPublicKey": "DRAX_PUB_KEY",
    "project":{
        "id": "PROJECT_ID",
        "apiKey": "PROJECT_API_KEY",
        "apiSecret": "PROJECT_API_SECRET"
    },
    "keys": [
        {
            "nodeId": "NODE_ID",
            "privateKey": "NODE_PRIVATE_KEY"
        }

    ]
}
```
DRAX_PUB_KEY is the cloud public key for ECDH algorithm. Default is:
"bb099d6dce1a953c7c5d2380815ee02ea191b39206000000ceefb3c222b480459556ce440379cef89db0ccfc04000000"
PROJECT_ID, PROJECT_API_KEY, PROJECT_API_SECRET is the id of project you get after Project creation on Drax.
"keys" is an array of private keys associated with nodes created on drax. After node creation, Drax return NODE_PUBLIC_KEY and NODE_PRIVATE_KEY. It needs to be stored in a Keystore.

#### Example 
```javascript
const { Drax } = require("@applica-of-things/drax-sdk");
const { Keystore } = require("@applica-of-things/drax-sdk/keystore");
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
    var state = {dato: "Hello World!"}
    drax.setState(3393, "homematicip:gateway:test", state, false)

    drax.addConfigurationListener("configurations/homematicip", listeners)
  })
  .catch(e => {})
```

To create Drax object you need to load the correct parameters. The properties of the parameters are the following:
                    
| Parameter  | Description  | Default|
| :------------ |:---------------:| -----:|
|host     | Is the address of AMQP broker | amqp://35.205.187.28 |
| port      | Port of AMQP broker        |  5672 |
| vhost | vhost of AMQP broker       | "/" |
| config | configuration file  |  |
                    

### Future improvements
The next release would have setConfiguration and StateLister.