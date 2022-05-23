var KeystoreSingleton;

class Keystore {
    constructor(){
        
    }
    instance(){
        if (!KeystoreSingleton){
            KeystoreSingleton = new Keystore()
        }
        return KeystoreSingleton
    }
    addConfig(config){
        this.config = config
    }
    getPrivateKey(nodeId){
        var prvKey = this.config.keys.find(k => k.nodeId == nodeId)
        if (prvKey){
            return prvKey
        } else {
            throw "NodeId not found in config.json"
        }
    }
    getCloudPublicKey(){
        var pubKey = this.config.draxPublicKey
        if (pubKey){
            return pubKey
        } else {
            throw "NodeId not found in config.json"
        }
    }
}

module.exports = {
    Keystore: Keystore,
}