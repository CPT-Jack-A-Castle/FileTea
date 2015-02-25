/*
 * sharedFilesView.js
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
    "/transport/evdWebTransport.js",
    "../common/fileTea.js"
], function (Evd, Ft) {
    // SharedFilesView
    var SharedFilesView = new Evd.Constructor ();
    SharedFilesView.prototype = new Evd.Object ();

    Evd.Object.extend (SharedFilesView.prototype, {

        _init: function (args) {
            this._parentElement = args.parentElement;
            this._files = args.fileSources;

            this._items = {};
            this._itemCount = 0;
            this._emptyNoticeElement = document.getElementById ("shared-files-list-empty-notice");

            var self = this;

            this._files.addEventListener ("new-file", function (file) {
                self.add (file);
            });

            this._files.addEventListener ("registered", function (file) {
                self.setRegistered (file.id, file.url);
            });

            this._files.addEventListener ("unregistered", function (file) {
                self.setUnregistered (file.id);
            });

            this._files.addEventListener ("update-file-size", function (file) {
                self._updateFileSize (file);
            });

            $ ("#shared-files-selector").get (0).onchange =
                function () {
                    self._addButtonOnChange ();
                };

            $ ("#share-files-btn").button ();

            require (["../common/utils"], function (Utils) {
                self._utils = Utils;
            });

            // @TODO: check if browser supports file drag-and-drop
            this._setupFileDropZone (window.document);
        },

        _addButtonOnChange: function () {
            var files = $ ("#shared-files-selector").get(0).files;
            this._files.add (files);
        },

        _newContainer: function (parent, inner, className) {
            var el = document.createElement ("div");
            el.innerHTML = inner;
            el.className = className;
            parent.appendChild (el);
            return el;
        },

        _createThumbnail: function (file, imgElement) {
            try {
                var reader = new FileReader();
                reader.onload = function (e) {
                    imgElement.src = e.target.result;
                };
                reader.readAsDataURL (file);
            }
            catch (e) {}
        },

        add: function (file) {
            var self = this;

            var id = file.id;
            var name = file.name;
            var type = file.type != "" ? file.type : "unknown";
            var size = this._utils.humanizeFileSize (file.size);

            var item = this._newContainer (this._parentElement,
                                           null,
                                           "shared-file-item");

            item.thumbEl = document.createElement ("img");
            item.thumbEl.className = "shared-file-thumb";
            if (type.indexOf ("image/") == 0 && size < 1024000)
                this._createThumbnail (file, item.thumbEl);
            else
                item.thumbEl.src = "../common/mime-type-icon-default.png";
            item.appendChild (item.thumbEl);

            item.nameEl = this._newContainer (item, name, "shared-file-name");
            item.infoEl = this._newContainer (item, size + " - " + type, "shared-file-info");

            item.urlEl = this._newContainer (item, "", "shared-file-url");
            if (file.status == Ft.SourceStatus.REGISTERED) {
                var url = file.url || "";
                item.urlEl.innerHTML = "<input type='text' readonly='true' value='"+url+"'/>";
                item.onclick = function (e) {
                    this.urlEl.childNodes.item (0).select ();
                };
                item.urlEl.title = "Copy this link and send it to share the file";
                item.urlEl.childNodes.item (0).select ();
            }
            else {
                item.urlEl.innerHTML = "<img src='../common/loading.gif'>";
            }

            item.delEl = this._newContainer (item, "", "shared-file-del-btn");
            item.delEl.title = "Unshare file '" + name + "'";
            item.delEl.onclick = function (e) {
                self.remove (id);
            };

            if (this._itemCount == 0)
                this._parentElement.removeChild (this._emptyNoticeElement);

            this._items[id] = item;
            this._itemCount++;

            this._parentElement.appendChild (item);

            this._fireEvent ("item-added", []);
        },

        isEmpty: function () {
            return this._itemCount == 0;
        },

        remove: function (id) {
            var item = this._items[id];
            if (! item)
                return;

            delete (this._items[id]);
            this._itemCount--;

            item.parentNode.removeChild (item);

            this._files.remove ([id]);

            if (this._itemCount == 0)
                this._parentElement.appendChild (this._emptyNoticeElement);
        },

        setRegistered: function (id, url) {
            var item = this._items[id];
            if (! item)
                return;

            item.urlEl.innerHTML = "<input type='text' readonly='true' value='"+url+"'/>";
            item.onclick = function (e) {
                this.urlEl.childNodes.item (0).select ();
            };
            item.urlEl.title = "Copy this link and send it to share the file";
            item.urlEl.childNodes.item (0).select ();
        },

        setUnregistered: function (id) {
            var item = this._items[id];
            if (! item)
                return;

            item.urlEl.innerHTML = "<img src='../common/loading.gif'>";
        },

        _setupFileDropZone: function (element) {
            var dropbox = element;

            dropbox.addEventListener ("dragenter", dragenter, false);
            dropbox.addEventListener ("dragover", dragover, false);
            dropbox.addEventListener ("drop", drop, false);

            function dragenter(e) {
                e.stopPropagation();
                e.preventDefault();
            }

            function dragover(e) {
                e.stopPropagation();
                e.preventDefault();
            }

            var self = this;
            function drop(e) {
                e.stopPropagation();
                e.preventDefault();

                var dt = e.dataTransfer;
                var files = dt.files;

                self._files.add (files);
            }
        },

        _updateFileSize: function (file) {
            var item = this._items[file.id];
            if (! item)
                return;

            var type = file.type != "" ? file.type : "unknown";
            var size = this._utils.humanizeFileSize (file.size);
            item.infoEl.innerHTML = size + " - " + type;
        }
    });

    return SharedFilesView;
});
