/*
 * contentManager.js
 *
 * FileTea, low-friction file sharing <http://filetea.net>
 *
 * Copyright (C) 2011-2015, Igalia S.L.
 *
 * Authors:
 *   Eduardo Lima Mitev <elima@igalia.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * version 3, or (at your option) any later version as published by
 * the Free Software Foundation.
 *
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Affero General Public License at http://www.gnu.org/licenses/agpl.html
 * for more details.
 */

define ([
    "/transport/evdWebTransport.js"
], function (Evd) {

    // FragidNavigator
    var FragidNavigator = new Evd.Constructor ();
    FragidNavigator.prototype = new Evd.Object ();

    Evd.Object.extend (FragidNavigator.prototype, {

        _init: function (args) {
            this._interval = 50;

            this._currentFragid = null;

            var self = this;
            this._checkFunc = function () {
                self.check ();
            };

            this._intervalId = null;

            if (args.autoStart !== false)
                this.start ();
        },

        _getFragmentId: function () {
            var hash = window.location.hash;
            if (hash)
                hash = hash.substr (1);
            return hash;
        },

        check: function () {
            var newFragid = this._getFragmentId ();
            if (newFragid != this._currentFragid) {
                var oldFragid = this._currentFragid;
                this._currentFragid = newFragid;
                this._fireEvent ("change", [oldFragid, newFragid]);
            }
        },

        start: function () {
            if (! this._intervalId) {
                this._intervalId = window.setInterval (this._checkFunc, this._interval);
                this.check ();
            }
        },

        stop: function () {
            if (this._intervalId) {
                window.removeInterval (this._intervalId);
                this._currentFragid = null;
            }
        },

        navigateTo: function (fragId) {
            window.location.hash = fragId;
        },

        getFragid: function () {
            return this._currentFragid;
        }
    });

    // ContentManager
    var ContentManager = new Evd.Constructor ();
    ContentManager.prototype = new Evd.Object ();

    Evd.Object.extend (ContentManager.prototype, {

        Mode: {
            DYNAMIC:  0,
            STATIC:   1,
            VOLATILE: 2
        },

        _init: function (args) {
            this._fragidNav = new FragidNavigator({ autoStart: false });

            var self = this;
            this._fragidNav.addEventListener ("change",
                function (oldState, newState) {
                    if (newState == "")
                        newState = self._default;

                    self.open (newState);
                });

            this._contents = {};

            require (["../common/utils"], function (Utils) {
                self._utils = Utils;
            });
        },

        add: function (id, name, url, content, mode) {
            var c = {
                id: id,
                name: name,
                url: url,
                content: content,
                mode: mode !== undefined ? mode : this.Mode.DYNAMIC
            };

            this._contents[id] = c;
        },

        setDefault: function (id) {
            this._default = id;
        },

        open: function (id, callback) {
            var self = this;

            var c = this._contents[id];
            if (! c) {
                this._fireEvent ("not-found", [id]);

                return true;
            }

            if (c.content == null && c.mode != this.Mode.STATIC) {
                self._fireEvent ("add", [c.id, c.name]);
                self._fireEvent ("loading", [c.id]);

                jQuery.ajax ({
                    url: c.url,
                    success: function (data, statusText) {
                        c.content = data;
                        self._fireEvent ("add", [c.id, c.name, c.content]);
                        self._fireEvent ("show", [c.id, c.name]);
                        if (callback)
                            callback (c.content);
                    }
                });
            }
            else {
                self._fireEvent ("show", [c.id, c.name, c.content]);
            }

            return true;
        },

        invalidate: function (id) {
            var c = this._contents[id];
            if (! c)
                return this;

            if (c.mode == this.Mode.DYNAMIC)
                c.content = null;
            else if (c.mode == this.Mode.VOLATILE)
                delete (this._contents[id]);

            return this;
        },

        start: function () {
            this._fragidNav.start ();
        },

        getCurrent: function () {
            return this._fragidNav.getFragid ();
        }
    });

    return ContentManager;
});
