var debug = require('debug')('l2cap-ble');
var spawn = require('child_process').spawn;

var ATT_OP_ERROR                    = 0x01;
var ATT_OP_MTU_REQ                  = 0x02;
var ATT_OP_MTU_RESP                 = 0x03;
var ATT_OP_FIND_INFO_REQ            = 0x04;
var ATT_OP_FIND_INFO_RESP           = 0x05;
var ATT_OP_FIND_BY_TYPE_REQ         = 0x06;
var ATT_OP_FIND_BY_TYPE_RESP        = 0x07;
var ATT_OP_READ_BY_TYPE_REQ         = 0x08;
var ATT_OP_READ_BY_TYPE_RESP        = 0x09;
var ATT_OP_READ_REQ                 = 0x0a;
var ATT_OP_READ_RESP                = 0x0b;
var ATT_OP_READ_BLOB_REQ            = 0x0c;
var ATT_OP_READ_BLOB_RESP           = 0x0d;
var ATT_OP_READ_MULTI_REQ           = 0x0e;
var ATT_OP_READ_MULTI_RESP          = 0x0f;
var ATT_OP_READ_BY_GROUP_REQ        = 0x10;
var ATT_OP_READ_BY_GROUP_RESP       = 0x11;
var ATT_OP_WRITE_REQ                = 0x12;
var ATT_OP_WRITE_RESP               = 0x13;
var ATT_OP_WRITE_CMD                = 0x52;
var ATT_OP_PREP_WRITE_REQ           = 0x16;
var ATT_OP_PREP_WRITE_RESP          = 0x17;
var ATT_OP_EXEC_WRITE_REQ           = 0x18;
var ATT_OP_EXEC_WRITE_RESP          = 0x19;
var ATT_OP_HANDLE_NOTIFY            = 0x1b;
var ATT_OP_HANDLE_IND               = 0x1d;
var ATT_OP_HANDLE_CNF               = 0x1e;
var ATT_OP_SIGNED_WRITE_CMD         = 0xd2;

var GATT_PRIM_SVC_UUID              = 0x2800;
var GATT_INCLUDE_UUID               = 0x2802;
var GATT_CHARAC_UUID                = 0x2803;

var GATT_CLIENT_CHARAC_CFG_UUID     = 0x2902;
var GATT_SERVER_CHARAC_CFG_UUID     = 0x2903;

var ATT_ECODE_SUCCESS               = 0x00;
var ATT_ECODE_INVALID_HANDLE        = 0x01;
var ATT_ECODE_READ_NOT_PERM         = 0x02;
var ATT_ECODE_WRITE_NOT_PERM        = 0x03;
var ATT_ECODE_INVALID_PDU           = 0x04;
var ATT_ECODE_AUTHENTICATION        = 0x05;
var ATT_ECODE_REQ_NOT_SUPP          = 0x06;
var ATT_ECODE_INVALID_OFFSET        = 0x07;
var ATT_ECODE_AUTHORIZATION         = 0x08;
var ATT_ECODE_PREP_QUEUE_FULL       = 0x09;
var ATT_ECODE_ATTR_NOT_FOUND        = 0x0a;
var ATT_ECODE_ATTR_NOT_LONG         = 0x0b;
var ATT_ECODE_INSUFF_ENCR_KEY_SIZE  = 0x0c;
var ATT_ECODE_INVAL_ATTR_VALUE_LEN  = 0x0d;
var ATT_ECODE_UNLIKELY              = 0x0e;
var ATT_ECODE_INSUFF_ENC            = 0x0f;
var ATT_ECODE_UNSUPP_GRP_TYPE       = 0x10;
var ATT_ECODE_INSUFF_RESOURCES      = 0x11;

startAdvertising = function(name, serviceUuids) {
  debug('startAdvertising: name = ' + name + ', serviceUuids = ' + JSON.stringify(serviceUuids, null, 2));

  var advertisementDataLength = 3;
  var scanDataLength = 0;

  var serviceUuids16bit = [];
  var serviceUuids128bit = [];
  var i = 0;
  var j = 0;
  var k = 0;

  if (name && name.length) {
    scanDataLength += 2 + name.length;
  }

  if (serviceUuids && serviceUuids.length) {
    for (i = 0; i < serviceUuids.length; i++) {
      var serviceUuid = new Buffer(serviceUuids[i].match(/.{1,2}/g).reverse().join(''), 'hex');

      if (serviceUuid.length === 2) {
        serviceUuids16bit.push(serviceUuid);
      } else if (serviceUuid.length === 16) {
        serviceUuids128bit.push(serviceUuid);
      }
    }
  }

  if (serviceUuids16bit.length) {
    advertisementDataLength += 2 + 2 * serviceUuids16bit.length;
  }

  if (serviceUuids128bit.length) {
    advertisementDataLength += 2 + 16 * serviceUuids128bit.length;
  }

  i = 0;
  var advertisementData = new Buffer(advertisementDataLength);

  // flags
  advertisementData[i++] = 2;
  advertisementData[i++] = 0x01;
  advertisementData[i++] = 0x05;

  if (serviceUuids16bit.length) {
    advertisementData[i++] = 1 + 2 * serviceUuids16bit.length;
    advertisementData[i++] = 0x03;
    for (j = 0; j < serviceUuids16bit.length; j++) {
      for (k = 0; k < serviceUuids16bit[j].length; k++) {
        advertisementData[i++] = serviceUuids16bit[j][k];
      }
    }
  }

  if (serviceUuids128bit.length) {
    advertisementData[i++] = 1 + 16 * serviceUuids128bit.length;
    advertisementData[i++] = 0x06;
    for (j = 0; j < serviceUuids128bit.length; j++) {
      for (k = 0; k < serviceUuids128bit[j].length; k++) {
        advertisementData[i++] = serviceUuids128bit[j][k];
      }
    }
  }

  i = 0;
  var scanData = new Buffer(scanDataLength);

  // name
  if (name && name.length) {
    var nameBuffer = new Buffer(name);

    scanData[i++] = nameBuffer.length + 1;
    scanData[i++] = 0x08;
    for (j = 0; j < nameBuffer.length; j++) {
      scanData[i++] = nameBuffer[j];
    }
  }

  startAdvertisingWithEIRData(advertisementData, scanData);
};

startAdvertisingWithEIRData = function(advertisementData, scanData) {
  debug('startAdvertisingWithEIRData: advertisement data = ' + advertisementData.toString('hex') + ', scan data = ' + scanData.toString('hex'));

  var error = null;

  if (advertisementData.length > 31) {
    error = new Error('Advertisement data is over maximum limit of 31 bytes');
  } else if (scanData.length > 31) {
    error = new Error('Scan data is over maximum limit of 31 bytes');
  } else {
    hciBle_process.stdin.write(advertisementData.toString('hex') + ' ' + scanData.toString('hex') + '\n');
  }

 // emit('advertisingStart', error);
 debug("advertisement start");
};

var handles = [];

setServices = function(services) {
  // base services and characteristics
  var allServices = [
    {
      uuid: '1800',
      characteristics: [
        {
          uuid: '2a00',
          properties: ['read'],
          secure: [],
          value: new Buffer("MinMac"),
          descriptors: []
        },
        {
          uuid: '2a01',
          properties: ['read'],
          secure: [],
          value: new Buffer([0x80, 0x00]),
          descriptors: []
        }
      ]
    }
  ].concat(services);

  handles = [];

  var handle = 0;
  var i;
  var j;

  for (i = 0; i < allServices.length; i++) {
    var service = allServices[i];

    handle++;
    var serviceHandle = handle;

    handles[serviceHandle] = {
      type: 'service',
      uuid: service.uuid,
      attribute: service,
      startHandle: serviceHandle
      // endHandle filled in below
    };

    for (j = 0; j < service.characteristics.length; j++) {
      var characteristic = service.characteristics[j];

      var properties = 0;
      var secure = 0;

      if (characteristic.properties.indexOf('read') !== -1) {
        properties |= 0x02;

        if (characteristic.secure.indexOf('read') !== -1) {
          secure |= 0x02;
        }
      }

      if (characteristic.properties.indexOf('writeWithoutResponse') !== -1) {
        properties |= 0x04;

        if (characteristic.secure.indexOf('writeWithoutResponse') !== -1) {
          secure |= 0x04;
        }
      }

      if (characteristic.properties.indexOf('write') !== -1) {
        properties |= 0x08;

        if (characteristic.secure.indexOf('write') !== -1) {
          secure |= 0x08;
        }
      }

      if (characteristic.properties.indexOf('notify') !== -1) {
        properties |= 0x10;

        if (characteristic.secure.indexOf('notify') !== -1) {
          secure |= 0x10;
        }
      }

      handle++;
      var characteristicHandle = handle;

      handle++;
      var characteristicValueHandle = handle;

      handles[characteristicHandle] = {
        type: 'characteristic',
        uuid: characteristic.uuid,
        properties: properties,
        secure: secure,
        attribute: characteristic,
        startHandle: characteristicHandle,
        valueHandle: characteristicValueHandle
      };

      handles[characteristicValueHandle] = {
        type: 'characteristicValue',
        handle: characteristicValueHandle,
        value: characteristic.value
      };

      if (properties & 0x10) {
        // add client characteristic configuration descriptor

        handle++;
        var clientCharacteristicConfigurationDescriptorHandle = handle;
        handles[clientCharacteristicConfigurationDescriptorHandle] = {
          type: 'descriptor',
          handle: clientCharacteristicConfigurationDescriptorHandle,
          uuid: '2902',
          attribute: characteristic,
          properties: (0x02 | 0x04 | 0x08), // read/write
          secure: (secure & 0x10) ? (0x02 | 0x04 | 0x08) : 0,
          value: new Buffer([0x00, 0x00])
        };
      }

      for (var k = 0; k < characteristic.descriptors.length; k++) {
        var descriptor = characteristic.descriptors[k];

        handle++;
        var descriptorHandle = handle;

        handles[descriptorHandle] = {
          type: 'descriptor',
          handle: descriptorHandle,
          uuid: descriptor.uuid,
          attribute: descriptor,
          properties: 0x02, // read only
          secure: 0x00,
          value: descriptor.value
        };
      }
    }

    handles[serviceHandle].endHandle = handle;
  }

  var debugHandles = [];
  for (i = 0; i < handles.length; i++) {
    handle = handles[i];

    debugHandles[i] = {};
    for(j in handle) {
      if (Buffer.isBuffer(handle[j])) {
        debugHandles[i][j] = handle[j] ? 'Buffer(\'' + handle[j].toString('hex') + '\', \'hex\')' : null;
      } else if (j !== 'attribute') {
        debugHandles[i][j] = handle[j];
      }
    }
  }

  debug('handles = ' + JSON.stringify(debugHandles, null, 2));
};

handleRequest = function(request) {
  debug('handing request: ' + request.toString('hex'));

  var requestType = request[0];
  var response = null;

  switch(requestType) {
    case ATT_OP_MTU_REQ:
      response = handleMtuRequest(request);
      break;

    case ATT_OP_FIND_INFO_REQ:
      response = handleFindInfoRequest(request);
      break;

    case ATT_OP_FIND_BY_TYPE_REQ:
      response = handleFindByTypeRequest(request);
      break;

    case ATT_OP_READ_BY_TYPE_REQ:
      response = handleReadByTypeRequest(request);
      break;

    case ATT_OP_READ_REQ:
    case ATT_OP_READ_BLOB_REQ:
      response = handleReadOrReadBlobRequest(request);
      break;

    case ATT_OP_READ_BY_GROUP_REQ:
      response = handleReadByGroupRequest(request);
      break;

    case ATT_OP_WRITE_REQ:
    case ATT_OP_WRITE_CMD:
      response = handleWriteRequestOrCommand(request);
      break;

    default:
    case ATT_OP_READ_MULTI_REQ:
    case ATT_OP_PREP_WRITE_REQ:
    case ATT_OP_EXEC_WRITE_REQ:
    case ATT_OP_SIGNED_WRITE_CMD:
      response = errorResponse(requestType, 0x0000, ATT_ECODE_REQ_NOT_SUPP);
      break;
  }

  if (response) {
    debug('response: ' + response.toString('hex'));

    send(response);
  }
};

handleMtuRequest = function(request) {
  var mtu = request.readUInt16LE(1);

  if (mtu < 23) {
    mtu = 23;
  } else if (mtu > 256) {
    mtu = 256;
  }

  _mtu = mtu;

  var response = new Buffer(3);

  response.writeUInt8(ATT_OP_MTU_RESP, 0);
  response.writeUInt16LE(mtu, 1);

  return response;
};

handleFindInfoRequest = function(request) {
  debug("handling findInfoRequest");
  var response = null;

  var startHandle = request.readUInt16LE(1);
  var endHandle = request.readUInt16LE(3);

  var infos = [];
  var uuid = null;

  for (i = startHandle; i <= endHandle; i++) {
    var handle = handles[i];

    if (!handle) {
      break;
    }

    uuid = null;

    if ('service' === handle.type) {
      uuid = '2800';
    } else if ('includedService' === handle.type) {
      uuid = '2802';
    } else if ('characteristic' === handle.type) {
      uuid = '2803';
    } else if ('characteristicValue' === handle.type) {
      uuid = handles[i - 1].uuid;
    } else if ('descriptor' === handle.type) {
      uuid = handle.uuid;
    }

    if (uuid) {
      infos.push({
        handle: i,
        uuid: uuid
      });
      debug("pushed " + uuid);
    }
  }

  if (infos.length) {
    debug("infos.lenght");
    var uuidSize = infos[0].uuid.length / 2;
    var numInfo = 1;

    for (i = 1; i < infos.length; i++) {
      if (infos[0].uuid.length !== infos[i].uuid.length) {
        break;
      }
      numInfo++;
    }
    debug("numInfo = " + numInfo);
    var lengthPerInfo = (uuidSize === 2) ? 4 : 18;
    var maxInfo = Math.floor((_mtu - 2) / lengthPerInfo);
    numInfo = Math.min(numInfo, maxInfo);
    debug("numInfo2 = " + numInfo + " " + maxInfo + " " +_mtu);

    response = new Buffer(2 + numInfo * lengthPerInfo);

    response[0] = ATT_OP_FIND_INFO_RESP;
    response[1] = (uuidSize === 2) ? 0x01 : 0x2;

    for (i = 0; i < numInfo; i++) {
      var info = infos[i];

      response.writeUInt16LE(info.handle, 2 + i * lengthPerInfo);
      debug("write to response");
      uuid = new Buffer(info.uuid.match(/.{1,2}/g).reverse().join(''), 'hex');
      for (var j = 0; j < uuid.length; j++) {
        response[2 + i * lengthPerInfo + 2 + j] = uuid[j];
      }
    }
  } else {
    response = errorResponse(ATT_OP_FIND_INFO_REQ, startHandle, ATT_ECODE_ATTR_NOT_FOUND);
  }
  
  debug("respnse = " + response);

  return response;
};

handleFindByTypeRequest = function(request) {
  var response = null;

  var startHandle = request.readUInt16LE(1);
  var endHandle = request.readUInt16LE(3);
  var uuid = request.slice(5, 7).toString('hex').match(/.{1,2}/g).reverse().join('');
  var value = request.slice(7).toString('hex').match(/.{1,2}/g).reverse().join('');

  var handles = [];
  var handle;

  for (var i = startHandle; i <= endHandle; i++) {
    handle = handles[i];

    if (!handle) {
      break;
    }

    if ('2800' === uuid && handle.type === 'service' && handle.uuid === value) {
      handles.push({
        start: handle.startHandle,
        end: handle.endHandle
      });
    }
  }

  if (handles.length) {
    var lengthPerHandle = 4;
    var numHandles = handles.length;
    var maxHandles = Math.floor((_mtu - 1) / lengthPerHandle);

    numHandles = Math.min(numHandles, maxHandles);

    response = new Buffer(1 + numHandles * lengthPerHandle);

    response[0] = ATT_OP_FIND_BY_TYPE_RESP;

    for (i = 0; i < numHandles; i++) {
      handle = handles[i];

      response.writeUInt16LE(handle.start, 1 + i * lengthPerHandle);
      response.writeUInt16LE(handle.end, 1 + i * lengthPerHandle + 2);
    }
  } else {
    response = errorResponse(ATT_OP_FIND_BY_TYPE_REQ, startHandle, ATT_ECODE_ATTR_NOT_FOUND);
  }

  return response;
};

handleReadByGroupRequest = function(request) {
  var response = null;

  var startHandle = request.readUInt16LE(1);
  var endHandle = request.readUInt16LE(3);
  var uuid = request.slice(5).toString('hex').match(/.{1,2}/g).reverse().join('');

  debug('read by group: startHandle = 0x' + startHandle.toString(16) + ', endHandle = 0x' + endHandle.toString(16) + ', uuid = 0x' + uuid.toString(16));

  if ('2800' === uuid || '2802' === uuid) {
    var services = [];
    var type = ('2800' === uuid) ? 'service' : 'includedService';
    var i;

    for (i = startHandle; i <= endHandle; i++) {
      var handle = handles[i];

      if (!handle) {
        break;
      }

      if (handle.type === type) {
        services.push(handle);
      }
    }

    if (services.length) {
      var uuidSize = services[0].uuid.length / 2;
      var numServices = 1;

      for (i = 1; i < services.length; i++) {
        if (services[0].uuid.length !== services[i].uuid.length) {
          break;
        }
        numServices++;
      }

      var lengthPerService = (uuidSize === 2) ? 6 : 20;
      var maxServices = Math.floor((_mtu - 2) / lengthPerService);
      numServices = Math.min(numServices, maxServices);

      response = new Buffer(2 + numServices * lengthPerService);

      response[0] = ATT_OP_READ_BY_GROUP_RESP;
      response[1] = lengthPerService;

      for (i = 0; i < numServices; i++) {
        var service = services[i];

        response.writeUInt16LE(service.startHandle, 2 + i * lengthPerService);
        response.writeUInt16LE(service.endHandle, 2 + i * lengthPerService + 2);

        var serviceUuid = new Buffer(service.uuid.match(/.{1,2}/g).reverse().join(''), 'hex');
        for (var j = 0; j < serviceUuid.length; j++) {
          response[2 + i * lengthPerService + 4 + j] = serviceUuid[j];
        }
      }
    } else {
      response = errorResponse(ATT_OP_READ_BY_GROUP_REQ, startHandle, ATT_ECODE_ATTR_NOT_FOUND);
    }
  } else {
    response = errorResponse(ATT_OP_READ_BY_GROUP_REQ, startHandle, ATT_ECODE_UNSUPP_GRP_TYPE);
  }

  return response;
};

handleReadByTypeRequest = function(request) {
  var response = null;

  var startHandle = request.readUInt16LE(1);
  var endHandle = request.readUInt16LE(3);
  var uuid = request.slice(5).toString('hex').match(/.{1,2}/g).reverse().join('');
  var i;
  var handle;

  debug('read by type: startHandle = 0x' + startHandle.toString(16) + ', endHandle = 0x' + endHandle.toString(16) + ', uuid = 0x' + uuid.toString(16));

  if ('2803' === uuid) {
    var characteristics = [];

    for (i = startHandle; i <= endHandle; i++) {
      handle = handles[i];

      if (!handle) {
        break;
      }

      if (handle.type === 'characteristic') {
        characteristics.push(handle);
      }
    }

    if (characteristics.length) {
      var uuidSize = characteristics[0].uuid.length / 2;
      var numCharacteristics = 1;

      for (i = 1; i < characteristics.length; i++) {
        if (characteristics[0].uuid.length !== characteristics[i].uuid.length) {
          break;
        }
        numCharacteristics++;
      }

      var lengthPerCharacteristic = (uuidSize === 2) ? 7 : 21;
      var maxCharacteristics = Math.floor((_mtu - 2) / lengthPerCharacteristic);
      numCharacteristics = Math.min(numCharacteristics, maxCharacteristics);

      response = new Buffer(2 + numCharacteristics * lengthPerCharacteristic);

      response[0] = ATT_OP_READ_BY_TYPE_RESP;
      response[1] = lengthPerCharacteristic;

      for (i = 0; i < numCharacteristics; i++) {
        var characteristic = characteristics[i];

        response.writeUInt16LE(characteristic.startHandle, 2 + i * lengthPerCharacteristic);
        response.writeUInt8(characteristic.properties, 2 + i * lengthPerCharacteristic + 2);
        response.writeUInt16LE(characteristic.valueHandle, 2 + i * lengthPerCharacteristic + 3);

        var characteristicUuid = new Buffer(characteristic.uuid.match(/.{1,2}/g).reverse().join(''), 'hex');
        for (var j = 0; j < characteristicUuid.length; j++) {
          response[2 + i * lengthPerCharacteristic + 5 + j] = characteristicUuid[j];
        }
      }
    } else {
      response = errorResponse(ATT_OP_READ_BY_TYPE_REQ, startHandle, ATT_ECODE_ATTR_NOT_FOUND);
    }
  } else {
    var valueHandle = null;
    var secure = false;

    for (i = startHandle; i <= endHandle; i++) {
      handle = handles[i];

      if (!handle) {
        break;
      }

      if (handle.type === 'characteristic' && handle.uuid === uuid) {
        valueHandle = handle.valueHandle;
        secure = handle.secure & 0x02;
        break;
      } else if (handle.type === 'descriptor' && handle.uuid === uuid) {
        valueHandle = i;
        secure = handle.secure & 0x02;
        break;
      }
    }

    if (secure && (_security !== 'medium' && _security !== 'high')) {
      response = errorResponse(ATT_OP_READ_BY_TYPE_REQ, startHandle, ATT_ECODE_AUTHENTICATION);
    } else if (valueHandle) {
      var data = handles[valueHandle].value;

      var dataLength = Math.min(data.length, _mtu - 4);
      response = new Buffer(4 + dataLength);

      response[0] = ATT_OP_READ_BY_TYPE_RESP;
      response[1] = dataLength + 2;
      response.writeUInt16LE(valueHandle, 2);

      for (i = 0; i < dataLength; i++) {
        response[i + 4] = data[i];
      }
    } else {
      response = errorResponse(ATT_OP_READ_BY_TYPE_REQ, startHandle, ATT_ECODE_ATTR_NOT_FOUND);
    }
  }

  return response;
};

handleReadOrReadBlobRequest = function(request) {
  var response = null;

  var requestType = request[0];
  var valueHandle = request.readUInt16LE(1);
  var offset = (requestType === ATT_OP_READ_BLOB_REQ) ? request.readUInt16LE(3) : 0;

  var handle = handles[valueHandle];

  if (handle) {
    var result = null;
    var data = null;
    var handleType = handle.type;

    var callback = (function(requestType, valueHandle) {
      return function(result, data) {
        var callbackResponse = null;

        if (ATT_ECODE_SUCCESS === result) {
          var dataLength = Math.min(data.length, _mtu - 1);
          callbackResponse = new Buffer(1 + dataLength);

          callbackResponse[0] = (requestType === ATT_OP_READ_BLOB_REQ) ? ATT_OP_READ_BLOB_RESP : ATT_OP_READ_RESP;
          for (i = 0; i < dataLength; i++) {
            callbackResponse[1 + i] = data[i];
          }
        } else {
          callbackResponse = errorResponse(requestType, valueHandle, result);
        }

        debug('read response: ' + callbackResponse.toString('hex'));

        send(callbackResponse);
      }.bind(this);
    }.bind(this))(requestType, valueHandle);

    if (handleType === 'service' || handleType === 'includedService') {
      result = ATT_ECODE_SUCCESS;
      data = new Buffer(handle.uuid.match(/.{1,2}/g).reverse().join(''), 'hex');
    } else if (handleType === 'characteristic') {
      var uuid = new Buffer(handle.uuid.match(/.{1,2}/g).reverse().join(''), 'hex');

      result = ATT_ECODE_SUCCESS;
      data = new Buffer(3 + uuid.length);
      data.writeUInt8(handle.properties, 0);
      data.writeUInt16LE(handle.valueHandle, 1);

      for (i = 0; i < uuid.length; i++) {
        data[i + 3] = uuid[i];
      }
    } else if (handleType === 'characteristicValue' || handleType === 'descriptor') {
      var handleProperties = handle.properties;
      var handleSecure = handle.secure;
      var handleAttribute = handle.attribute;
      if (handleType === 'characteristicValue') {
        handleProperties = handles[valueHandle - 1].properties;
        handleSecure = handles[valueHandle - 1].secure;
        handleAttribute = handles[valueHandle - 1].attribute;
      }

      if (handleProperties & 0x02) {
        if (handleSecure & 0x02 && (_security !== 'medium' && _security !== 'high')) {
          result = ATT_ECODE_AUTHENTICATION;
        } else {
          data = handle.value;

          if (data) {
            result = ATT_ECODE_SUCCESS;
          } else {
            //handleAttribute.emit('readRequest', offset, callback);
	    debug("emit readRequest");
          }
        }
      } else {
        result = ATT_ECODE_READ_NOT_PERM; // non-readable
      }
    }

    if (data && typeof data === 'string') {
      data = new Buffer(data);
    }

    if (result === ATT_ECODE_SUCCESS && data && offset) {
      if (data.length < offset) {
        errorCode = ATT_ECODE_INVALID_OFFSET;
        data = null;
      } else {
        data = data.slice(offset);
      }
    }

    if (result !== null) {
      callback(result, data);
    }
  } else {
    response = errorResponse(requestType, valueHandle, ATT_ECODE_INVALID_HANDLE);
  }

  return response;
};

handleWriteRequestOrCommand = function(request) {
  var response = null;

  var requestType = request[0];
  var withoutResponse = (requestType === ATT_OP_WRITE_CMD);
  var valueHandle = request.readUInt16LE(1);
  var data = request.slice(3);
  var offset = 0;

  var handle = handles[valueHandle];

  if (handle) {
    if (handle.type === 'characteristicValue') {
      handle = handles[valueHandle - 1];
    }

    var handleProperties = handle.properties;
    var handleSecure = handle.secure;

    if (handleProperties && (withoutResponse ? (handleProperties & 0x04) : (handleProperties & 0x08))) {

      var callback = (function(requestType, valueHandle, withoutResponse) {
        return function(result) {
          if (!withoutResponse) {
            var callbackResponse = null;

            if (ATT_ECODE_SUCCESS === result) {
              callbackResponse = new Buffer([ATT_OP_WRITE_RESP]);
            } else {
              callbackResponse = errorResponse(requestType, valueHandle, result);
            }

            debug('write response: ' + callbackResponse.toString('hex'));

            send(callbackResponse);
          }
        }.bind(this);
      }.bind(this))(requestType, valueHandle, withoutResponse);

      if (handleSecure & (withoutResponse ? 0x04 : 0x08) && (_security !== 'medium' && _security !== 'high')) {
        response = errorResponse(requestType, valueHandle, ATT_ECODE_AUTHENTICATION);
      } else if (handle.type === 'descriptor' || handle.uuid === '2902') {
        var result = null;

        if (data.length !== 2) {
          result = ATT_ECODE_INVAL_ATTR_VALUE_LEN;
        } else {
          var value = data.readUInt16LE(0);
          var handleAttribute = handle.attribute;

          handle.value = data;

          if (value & 0x0001) {
            var updateValueCallback = (function(valueHandle, attribute) {
              return function(data) {
                var dataLength = Math.min(data.length, _mtu - 3);
                var notifyMessage = new Buffer(3 + dataLength);

                notifyMessage.writeUInt8(ATT_OP_HANDLE_NOTIFY, 0);
                notifyMessage.writeUInt16LE(valueHandle, 1);

                for (var i = 0; i < dataLength; i++) {
                  notifyMessage[3 + i] = data[i];
                }

                debug('notify message: ' + notifyMessage.toString('hex'));
                send(notifyMessage);

                //attribute.emit('notify');
		debug("emit notify");
              }.bind(this);
            }.bind(this))(valueHandle - 1, handleAttribute);

            //handleAttribute.emit('subscribe', _mtu - 3, updateValueCallback);
		debug("emit subsribe");
          } else {
           // handleAttribute.emit('unsubscribe');
		debug("emit unsubscribe");
          }

          result = ATT_ECODE_SUCCESS;
        }

        callback(result);
      } else {
        //handle.attribute.emit('writeRequest', data, offset, withoutResponse, callback);
		debug("emit writeRequest");
	debug("data written " + data.length + " : " + data.toString("hex"));
	receivedBits += data.length *8;
	debug("Total received bits: " + receivedBits);
	if(receivedBits >= 10000){
	  var end = new Date() - start;
	  var speed = receivedBits / end;
	  debug("10kb received in " + end + "ms. Speed: " + speed + " kbps");
	  receivedBits = 0;
	  start = new Date();
	}
      }
    } else {
      response = errorResponse(requestType, valueHandle, ATT_ECODE_WRITE_NOT_PERM);
    }
  } else {
    response = errorResponse(requestType, valueHandle, ATT_ECODE_INVALID_HANDLE);
  }

  return response;
};

errorResponse = function(opcode, handle, status) {
  var buf = new Buffer(5);

  buf.writeUInt8(ATT_OP_ERROR, 0);
  buf.writeUInt8(opcode, 1);
  buf.writeUInt16LE(handle, 2);
  buf.writeUInt8(status, 4);

  return buf;
};

var _buffer = "";

var start = new Date();
var best = 0;

var onStdoutData = function(data) {
  _buffer += data.toString();

  debug('buffer = ' + JSON.stringify(_buffer));

  var newLineIndex;
  while ((newLineIndex = _buffer.indexOf('\n')) !== -1) {
    var line = _buffer.substring(0, newLineIndex);
    var found;
    var clientAddress;

    _buffer = _buffer.substring(newLineIndex + 1);

    debug('line = ' + line);

    if ((found = line.match(/^accept (.*)$/))) {
      clientAddress = found[1];

      _mtu = 23; // reset MTU

      //emit('accept', clientAddress);
		debug("emit accept");
    } else if ((found = line.match(/^disconnect (.*)$/))) {
      clientAddress = found[1];

      //emit('disconnect', clientAddress);
		debug("emit disconnecct");
    } else if ((found = line.match(/^rssi = (.*)$/))) {
      var rssi = parseInt(found[1], 10);

      //emit('rssiUpdate', rssi);
		debug("emit rssi update");
    } else if ((found = line.match(/^security (.*)$/))) {
      _security = found[1];
    } else if ((found = line.match(/^data (.*)$/))) {
      var lineData = new Buffer(found[1], 'hex');

      handleRequest(lineData);
    }
  }
};

var send = function(data) {
  debug('send: ' + data.toString('hex'));
  l2capBle_process.stdin.write(data.toString('hex') + '\n');
};

var receivedBits = 0;

var _mtu = 23;
var hciBle_dir = '/home/johan/bleno/build/Release/hci-ble';

debug('hciBl_dir = ' + hciBle_dir);

var hciBle_process = spawn(hciBle_dir);

hciBle_process.stdout.on('data', function(data){
  var line = data.toString();
  console.log("hci-ble: " + line);
});

hciBle_process.on('error', function(er) {
  console.error("error in hcible " + er);
});

startAdvertising("MyCool", ["1337"]);

 
var l2capBle_dir = '/home/johan/bleno/build/Release/l2cap-ble';

debug('l2capBle_dir = ' + l2capBle_dir);

var l2capBle_process = spawn(l2capBle_dir);
l2capBle_process.stdout.on('data', onStdoutData);

var service =  {
      uuid: '1337',
      characteristics: [
        {
          uuid: '1338',
          properties: ['writeWithoutResponse'],
          secure: [],
          value: new Buffer("1234"),
          descriptors: []
        }
      ]
    };

setServices([service]);