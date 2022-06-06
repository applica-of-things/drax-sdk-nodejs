const axios = require('axios');

class DraxClient{
    constructor(params){
        this.params = params
        this.serviceUrl = 'https://draxcloud.com/core'
    }

    handshake(node){
        var data = {
            urn: node.urn,
            projectId: this.params.config.project.id,
            supportedTypes: node.supportedTypes || [],
            configurationPublishTopic: node.configurationPublishTopic,
            statePublishTopic: node.statePublishTopic,
            initialState: node.initialState || {},
            name: node.name,
            extras: node.extras || []
        }

        var headers = {
            "drax-api-secret": this.params.config.project.apiSecret,
            "drax-api-key": this.params.config.project.apiKey
        }

        axios
            .post(this.serviceUrl + '/handshake', data, {headers})
            .then(res => {
                console.log(`statusCode: ${res.status}`);
                console.log(res);
            })
            .catch(error => {
                console.error(error);
            });
    }

}

module.exports = DraxClient