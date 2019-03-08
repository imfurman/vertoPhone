/**
 * Created by igor on 30.09.16.
 */

"use strict";

const SETTINGS_LOCAL_STORAGE = ['selectedAudio', 'selectedSpeaker', 'selectedVideo', 'sessid'];

let Helper = {
    session: null,
    phoneWindow: null,
    missedNotifications: {},
    videoParamsBest: {},
    extensionPort: null,
    settings: {},

    init: () => {
        const video = document.createElement('video');
        video.id = "localTagVideo";
        video.volume = 1;
        video.style.display = 'none';
        document.body.appendChild(video);

        Helper.getSettings(data => {
            if (!Helper.session && data && data.server) {
                Helper.session  = new Session(data);
            }
        });
    },

    refreshVertoDevice: () => {
        $.verto.init({skipPermCheck: false}, ()=> {
            Helper.videoParamsBest = {};
            Helper.setVertoDevices();

            let count = $.verto.videoDevices.length;

            $.verto.videoDevices.forEach( (i) => {
                console.log('try check test video ', i);
                $.FSRTC.getValidRes(i.id, (r) => {
                    Helper.videoParamsBest[i.id] = {
                        w: r.bestResSupported[0],
                        h: r.bestResSupported[1]
                    };

                    if (!--count && Helper.session && Helper.videoParamsBest[Helper.session.selectedVideo]) {
                        Helper.session.verto.videoParams({
                            minWidth: Helper.videoParamsBest[Helper.session.selectedVideo].w,
                            minHeight: Helper.videoParamsBest[Helper.session.selectedVideo].h,
                            maxWidth: Helper.videoParamsBest[Helper.session.selectedVideo].w,
                            maxHeight: Helper.videoParamsBest[Helper.session.selectedVideo].h
                        })
                    }
                });


            })
        })
    },

    deleteDomain: (param) => {
        if (typeof param == "string") {
            let i = param.indexOf('@');
            if (~i) {
                param = param.substr(0, i);
            }
        }
        return param;
    },

    sendSession: (action, obj) => {
        var data = {action: action, data: obj};
        var event = new CustomEvent('message', { 'detail': data });

        window.dispatchEvent(event);
    },

    getWindowById: (id) => {
        return window;
        //return chrome.app.window.get(id);
    },

    clearNotification: (notification) => {
        notification.close();
    },

    createNotificationMsg: (title, message, contextMessage, imgUri, time) => {
        Helper.createNotification({
            iconUrl: imgUri || 'images/phone16.png',
            title: title,
            message: message,
            contextMessage: contextMessage
        }, (notification) => {
            if (time) {
                setTimeout(() => {
                    notification.close();
                }, time)
            }
        });
    },

    createNotification: (params, cb) => {
        if(window.Notification) {
            Notification.requestPermission().then((status) => {
                var message = params.message;

                if (params.contextMessage) {
                    message = message + '(' + params.contextMessage + ')';
                }

                var notification = new Notification(params.title, {
                    body: message,
                    icon: params.iconUrl,
                    requireInteraction: params.requireInteraction || false
                });

                cb(notification);
            });
        }
        //chrome.notifications.create(params, cb);
    },

    setVertoDevices: () => {
        window.vertoDevices = {
            audioInDevices: $.verto.audioInDevices,
            audioOutDevices: $.verto.audioOutDevices,
            videoDevices: $.verto.videoDevices
        };
    },

    createVertoWindow: () => {
        window.onload = function() {
            Helper.setVertoDevices();
            window.vertoSession = Helper.session;

            Helper.getSettings(function (data) {
                Helper.sendSession('init', {
                    settings: data || {},
                    activeCalls: Helper.session && Helper.session.activeCalls,
                    logged: Helper.session && Helper.session.isLogin
                });
            });

        };
    },

    getSettings: (cb) => {
        // if (Helper.session && Helper.session._settings)
        //     return cb(Helper.session._settings);
        //
        // let settings = {
        //     iceServers: true,
        //     ring: true,
        //     alwaysOnTop: true
        // };

        cb(Helper.settings);

        // function copyTo(to, from) {
        //     for (var key in from) {
        //         if (from.hasOwnProperty(key)) {
        //             to[key] = from[key]
        //         }
        //     }
        // }
        //
        // chrome.storage.sync.get('settings', function (sync) {
        //     copyTo(settings, sync && sync.settings);
        //     chrome.storage.local.get('settings', function (local) {
        //         copyTo(settings, local && local.settings);
        //         cb(settings);
        //     });
        // });
    },

    setSettings: (data, cb) => {

        Helper.settings = Object.assign({}, Helper.settings, data);

        console.log('Save settings in Helper');
        console.log(Helper.settings);

        cb();
    },

    saveSettings: (data) => {
        if (!data.sessid ) {
            data.sessid = $.verto.genUUID();
        }

        Helper.setSettings(data, () => {
            if (Helper.session) {
                Helper.session.logout();
            }

            Helper.session = new Session(Helper.settings);
            window.vertoSession = Helper.session;

            Helper.createNotificationMsg('Save', 'Saved settings', '', 'images/success64.png', 2000);
        });
    }
};