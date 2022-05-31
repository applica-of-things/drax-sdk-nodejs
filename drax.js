const AmqpDraxBroker = require("./consumer/amqpDraxBroker")

class Drax {
  constructor(params){
    this.draxBroker  = new AmqpDraxBroker(params)
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
}

module.exports = {
  Drax: Drax
}