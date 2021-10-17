var _connected = false;
var _txChar;
var _rxChar;
var _read_in_progress = false;
var _write_in_progress = false;
var _onReceive;
var _onDisconnect;
var _curDevice;

// dlog = function () { }
dlog = console.log;

function biii_ble_isSupprted() {
    return 'bluetooth' in navigator;
}

async function biii_ble_RequestDevice(filter) {
    //
    biii_ble_DisconnectDevice();
    _curDevice = null;
    //
    if (biii_ble_isSupprted()) {
        dlog('using ', filter);
        return navigator.bluetooth.requestDevice(filter).then(
            (dev) => {
                dlog('got ', dev);
                _curDevice = dev;
                return 0;
            }, (err) => {
                dlog(err);
                return 1;
            });
    } else {
        dlog('webble not supported');
        return 2;
    }
}

function biii_ble_onDisconnected(event) {
    _connected = false;
    let device = event.target;
    console.log('Device ' + device.name + ' is d_connected. reconnecting');
    // _curDevice.gatt.connect();
    if (_onDisconnect) _onDisconnect();
}

async function biii_ble_ConnectDevice(filter, uuid, rxch, txch, rxFx, onDisconnect) {
    if (_curDevice == null) {
        rcode = biii_ble_RequestDevice(filter);
        if (rcode != 0) {
            return false;
        }
    }
    dlog('using ', uuid, txch, rxch);
    _onReceive = rxFx;
    _onDisconnect = onDisconnect;
    // Set up event listener for when device gets d_connected.
    _curDevice.addEventListener('gattserverdisconnected', biii_ble_onDisconnected);
    //
    return _curDevice.gatt.connect()
        .then(server => {
            dlog('Connected to ', server.device.name);
            return server.getPrimaryService(uuid);
        })
        .then(service => {
            _service = service;
            dlog('Service found ', service.uuid);
            return service.getCharacteristic(rxch);
        })
        .then(ch => {
            _rxChar = ch;
            dlog('rx hooked ', ch.uuid);
            return _service.getCharacteristic(txch);
        })
        // .then(ch => ch.startNotifications())
        // .then(ch => {
        //     ch.addEventListener('characteristicvaluechanged', biii_ble_rxValueChange);
        //     dlog('Rx hooked ', txch.uuid);
        //     return _service.getCharacteristic(txch);
        // })
        .then(ch => {
            _txChar = ch;
            dlog('tx hooked ', ch.uuid);
            _connected = true;
            return true;
        })
        .catch(error => {
            dlog(error);
            _curDevice = null;
            _connected = false;
            return false;
        });
}

async function biii_ble_TxBytes(value) {
    if ((_txChar != null) && (_write_in_progress == false)) {
        _write_in_progress = true;
        dlog((new Date()).toISOString(), '[TX]', value);
        await  _txChar.writeValue(value);
        _write_in_progress = false;
    }
}

async function biii_ble_RxBytes() {
    if ((_rxChar != null) && (_read_in_progress == false)) {
        _read_in_progress = true;
        value =  await _rxChar.readValue();
        bytes = new Uint8Array(value.buffer);
        dlog((new Date()).toISOString(), '[RX]', bytes);
        _read_in_progress = false;
        return bytes;
    }
    return null;
}


function biii_ble_DisconnectDevice() {
    var rcode;
    if (_connected) {
        if (_curDevice) {
            _curDevice.gatt.disconnect();
            dlog('d_connected');
            rcode = 'D_connected';
        } else {
            dlog('NOT_AVAILABLE');
            rcode = 'NOT_AVAILABLE';
        }
        _onReceive = null;
        _txChar = null;
        _rxChar = null;
        _connected = false;
    } else {
        dlog('NOT_CONNECTED');
        rcode = 'NOT_CONNECTED';
    }
    return rcode;;
}