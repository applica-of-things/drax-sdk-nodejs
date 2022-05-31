const amqp = require('amqplib/callback_api');
const _ = require('underscore');
const { crypto_sign, crypto_pkcs7CalculatePaddedSize, crypto_unsign } = require('drax-ecdh');
const { Keystore } = require('../keystore');
/**
 * @AmqpDraxBroker
 * @param {number} params - drax configuration params
 * * host - 
 * * port - 
 * * vhost -
 * * config - 
 * * 
 */
class AmqpDraxBroker{
    constructor(params){
        this.params = params
        this.connection = null
        this.channel = null
    }

    start(){
        const host = this.params.host || "amqp://35.205.187.28"
        const port = this.params.port || 5672
        const password = this.params.config.project.apiSecret
        const user = this.params.config.project.apiKey
        const vhost = this.params.vhost || "/"
        const projectId = this.params.config.project.id

        const opt = { credentials: require('amqplib').credentials.plain(user, password)};

        return new Promise((resolve, reject) => {
            amqp.connect(host, opt, (err, conn) => {
                this.connection = conn
                this.channel = conn.createChannel();
                if (err){
                    console.error("Cannot start DraxBroker: ", err)
                    reject(err)
                }
                resolve();
            })
    
            console.log("Drax Broker started on %s:%s", host, port)
        })

    }

    stop(){
        this.channel.close((err) => {
            if (err){
                throw console.error("DraxBroker close channel error: ", err)
            } else {
                console.log("Drax channel correctly closed")

                this.connection.close((err) => {
                    if (err){
                        throw console.error("DraxBroker close connection error: ", err)
                    } else {
                        console.log("Drax connection correctly closed")
                    }
                })
            }
        })
    }

    setState(nodeId, urn, state, cryptographyDisabled = false){        
        var stateRequest = {
            apiKey: this.params.config.project.apiKey,
            apiSecret: this.params.config.project.apiSecret,
            nodeId: nodeId,
            urn: urn,
            cryptographyDisabled: cryptographyDisabled
        }

        var data = JSON.stringify(state)

        var payload = [];
        var buffer = new Buffer.from(data, 'utf8');
        for (var i = 0; i < buffer.length; i++) {
            payload.push(buffer[i]);
        }

        if (cryptographyDisabled){
            stateRequest.state = payload
        } else {
            var padded_data_size = crypto_pkcs7CalculatePaddedSize(payload, payload.length);
            var signed_data = new Uint8Array(padded_data_size);

            try{
                var privateKey = new Keystore().instance().getPrivateKey(nodeId).privateKey;
                var publicKey = new Keystore().instance().getCloudPublicKey();
                var len = crypto_sign(privateKey, publicKey, payload, payload.length, signed_data);
                var _s = []
                for (var i = 0; i < signed_data.length; i++) {
                    _s.push(signed_data[i]);
                }
                stateRequest.state = _s;
            } catch(e) {
                console.log(e)
            }
        }
        console.log("State Request: ", stateRequest)

        var exchange = 'amq.topic';

        this.channel.assertExchange(exchange, 'topic', {
            durable: true
        });
        this.channel.publish(exchange, `${this.params.projectId}.requests.states`, Buffer.from(JSON.stringify(stateRequest)))

        console.log("Encripted Payload: ", payload);
    }



    addConfigurationListener(topic, listeners = []){
        var projectTopic = this.params.config.project.id + "." + topic.replace("/", ".")
        console.log("Consuming topic: ", projectTopic)
        var exchange = 'amq.topic';
        var _q = null

        this.channel.assertQueue('', {exclusive: true}, (error, q) => {
            if (error) {
                throw error
            }
            
            console.log(' [*] Waiting for logs. To exit press CTRL+C')
            
            this.channel.bindQueue(q.queue, exchange, projectTopic);
            this.channel.consume(q.queue, (msg) => {

                console.log(" [x] %s:'%s'", msg.fields.routingKey, msg.content);

                var signed_data = Buffer.from(JSON.stringify((JSON.parse(msg.content).configuration)), "base64");
                var payloadEncripted = []
                for (var i = 0; i < signed_data.length; i++) {
                    payloadEncripted.push(signed_data[i]);
                }

                var received_data = new Buffer.alloc(signed_data.length);
                try{
                    var privateKey = new Keystore().instance().getPrivateKey(JSON.parse(msg.content).nodeId).privateKey;
                    var publicKey = new Keystore().instance().getCloudPublicKey();
    
                    var original_len = crypto_unsign(privateKey, publicKey, payloadEncripted, payloadEncripted.length, received_data);
                    var response = JSON.parse(msg.content)
                    response.configuration = JSON.parse(received_data.slice(0, original_len))
                    
                    listeners.forEach(listener => {
                        if (_.isFunction(listener.run)){
                            listener.run(response)
                        }
                    })
                }catch(e) {
                    console.log(e)
                }
                
            }, {
                    noAck: true
                }
            )
        })
        
    }
}

module.exports = AmqpDraxBroker