let websocket = null;
let uuid = null;
let actionInfo = {};

function connectElgatoStreamDeckSocket(inPort, inPropertyInspectorUUID, inRegisterEvent, inInfo, inActionInfo) {
    uuid = inPropertyInspectorUUID;
    actionInfo = JSON.parse(inActionInfo);

    websocket = new WebSocket('ws://127.0.0.1:' + inPort);

    websocket.onopen = function () {
        const json = {
            event: inRegisterEvent,
            uuid: inPropertyInspectorUUID
        };
        websocket.send(JSON.stringify(json));
        
        // Notify the UI that we are connected
        window.dispatchEvent(new CustomEvent('sdConnected', { 
            detail: actionInfo.payload.settings 
        }));
    };

    websocket.onmessage = function (evt) {
        const jsonObj = JSON.parse(evt.data);
        if (jsonObj.event === 'didReceiveSettings') {
            window.dispatchEvent(new CustomEvent('sdSettingsReceived', { 
                detail: jsonObj.payload.settings 
            }));
        }
    };
}

const $SD = {
    onDidReceiveSettings: function(action, callback) {
        window.addEventListener('sdSettingsReceived', (ev) => callback({ payload: { settings: ev.detail } }));
        window.addEventListener('sdConnected', (ev) => callback({ payload: { settings: ev.detail } }));
    },
    setSettings: function(settings) {
        if (websocket && websocket.readyState === 1) {
            const json = {
                event: 'setSettings',
                context: uuid,
                payload: settings
            };
            websocket.send(JSON.stringify(json));
        }
    }
};
