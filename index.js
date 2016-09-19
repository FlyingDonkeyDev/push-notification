'use strict';

var apn = require('apn');
var gcm = require('node-gcm');

var DeviceType = {
    IOS: 'apn',
    ANDROID: 'gcm'
};

var PushNotification = {

    DeviceType: DeviceType,

    tokens: null,

    payload: null,

    options: {apn: null, gcm: null},

    init: function(options) {
        options = options || {};
        if (options.apn) options.apn.gateway = 'gateway.sandbox.push.apple.com';
        PushNotification.options = {apn: options.apn || null, gcm: options.gcm || null};
        PushNotification.clear();
    },

    clear: function() {
        PushNotification.tokens = {apn: [], gcm: []};
        PushNotification.payload = {title: '', message: '', badge: '', sound: '', payload: null};
    },

    prepare: function(title, message, badge, sound, payload) {
        PushNotification.clear();
        PushNotification.payload = {title: title, message: message, badge: badge, sound: sound, payload: payload};
    },

    addTarget: function(type, token) {
        if (type === DeviceType.IOS) PushNotification.tokens.apn.push(token);
        else if (type === DeviceType.ANDROID) PushNotification.tokens.gcm.push(token);
    },

    push: function(callback) {
        var title = PushNotification.payload.title;
        var message = PushNotification.payload.message;
        var badge = PushNotification.payload.badge;
        var sound = PushNotification.payload.sound;
        var payload = PushNotification.payload.payload;
        var result = {
            ios: null,
            android: null
        };
        PushNotification.pushToAPN(PushNotification.tokens.apn, title, message, badge, sound, payload, function(res){
            result.ios = res;
        });
        PushNotification.pushToGCM(PushNotification.tokens.gcm, title, message, badge, sound, payload, function(res){
            result.android = res;
        });

        if(typeof callback == 'function'){
            var i = 0;
            var interval = setInterval(function () {
                i++;
                if(i == 50){
                    clearInterval(interval);
                }
                if(result.android != null && result.ios != null){
                    clearInterval(interval);
                    callback(result);
                }
            }, 500);
        }

    },

    pushToAPN: function(tokens, title, message, badge, sound, payload, callback) {
        if (!PushNotification.options.apn){
            if(typeof callback == 'function') {
                callback({message: 'No se a especificado APN'});
            }
            return;
        }
        if(!tokens.length){
            if(typeof callback == 'function') {
                callback({message: 'No hay tokens'});
            }
            return;
        }
        var connection = new apn.Connection(PushNotification.options.apn);
        tokens.map(function(token) {
            var device = new apn.Device(token);
            var notification = new apn.Notification();
            notification.title = title;
            notification.alert = message;
			notification.badge = badge;
			notification.sound = 'default';
			notification.payload = {payload: payload};
			connection.pushNotification(notification, device);
        });
        if(typeof callback == 'function') {
            callback({message: 'Done', data: 'IOS no tiene callback para mandar sus notificaciones'});
        }
    },

    pushToGCM: function(tokens, title, message, badge, sound, payload, callback) {
        if (!PushNotification.options.gcm){
            if(typeof callback == 'function') {
                callback({message: 'No se a especificado GCM'});
            }
            return;
        }
        if(!tokens.length){
            if(typeof callback == 'function') {
                callback({message: 'No hay tokens'});
            }
            return;
        }
        var notification = new gcm.Message();
        notification.addData({title: title, message: message, payload: payload});
        var sender = new gcm.Sender(PushNotification.options.gcm.apiKey);
        sender.send(notification, tokens, function(err, response){
            if(err){
                if(typeof callback == 'function'){
                    callback({message: 'Error', data: err});
                }
                //console.error('pushToGCM ERROR: ', err);
            } else {
                if(typeof callback == 'function') {
                    callback({message: 'Done', data: response});
                }
                //console.log('pushToGCM DONE: ', response);
            }
        });
    },

    pushSingle: function(type, token, title, message, badge, sound, payload) {
        if (type === DeviceType.IOS) PushNotification.pushToAPN([token], title, message, badge, sound, payload);
        else if (type === DeviceType.ANDROID) PushNotification.pushToGCM([token], title, message, badge, sound, payload);
    }

};

module.exports = PushNotification;
