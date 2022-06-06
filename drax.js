const { reject } = require("underscore")
const DraxClient = require("./backend/draxClient")
const AmqpDraxBroker = require("./consumer/amqpDraxBroker")

class Drax {
  constructor(params){
    this.draxBroker  = new AmqpDraxBroker(params)
    this.draxClient = new DraxClient(params)
  }

  start(){
    return new Promise((resolve, reject) => {
      this.draxBroker.start().then(() => {
        resolve()
      })
      .catch(e => {reject})
    })
  }

  addConfigurationListener(topic, listeners = []){
    this.draxBroker.addConfigurationListener(topic, listeners)
  }

  setState(nodeId, urn, state, cryptographyDisabled = false){
    this.draxBroker.setState(nodeId, urn, state, cryptographyDisabled)
  }

  handshake(node){
    return new Promise((resolve, reject) => {
      this.draxClient.handshake(node)
      .then((res) => resolve(res))
      .catch((err) => reject(err))
    })
  }
}

module.exports = {
  Drax: Drax
}