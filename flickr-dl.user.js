// ==UserScript==
// @name         Flickr Downloader Enhanced
// @namespace    https://github.com/Hekkun/flickr-dl.userscript
// @version      0.3.0
// @description  A userscript for downloading Flickr photos.
// @author       f2face, Hekkun
// @match        https://www.flickr.com/*
// @grant	 GM_xmlhttpRequest
// @require      https://cdn.rawgit.com/uzairfarooq/arrive/v2.4.1/minified/arrive.min.js
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @updateURL	 https://github.com/Hekkun/flickr-dl.userscript/raw/master/flickr-dl.user.js
// @donwloadURL  https://github.com/Hekkun/flickr-dl.userscript/raw/master/flickr-dl.user.js
// ==/UserScript==

(function() {
    'use strict';

    function xmlOpenIntercept () {
        var proxied = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function (method, newUrl) {
            var cEvnt = new CustomEvent ('newAjaxStart', {'detail': newUrl} );
            document.body.dispatchEvent (cEvnt);

            return proxied.apply (this, [].slice.call (arguments) );
        };
    }
    addJS_Node (null, null, xmlOpenIntercept);  //-- Injects code


    //--- This code listens for the right kind of message.
    document.body.addEventListener ("newAjaxStart", receiveAjaxMessage);

    function receiveAjaxMessage (zEvent) {
        console.log ("Intercepted AJAX to: ", zEvent.detail);
    }

    function addJS_Node (text, s_URL, funcToRun, runOnLoad) {
        var D                                   = document;
        var scriptNode                          = D.createElement ('script');
        if (runOnLoad)  scriptNode.addEventListener ("load", runOnLoad);
        scriptNode.type                         = "text/javascript";
        if (text)       scriptNode.textContent  = text;
        if (s_URL)      scriptNode.src          = s_URL;
        if (funcToRun)  scriptNode.textContent  = '(' + funcToRun.toString() + ')()';

        var targ = D.getElementsByTagName ('head')[0] || D.body || D.documentElement;
        targ.appendChild (scriptNode);
    }

    // Flickr API endpoint
    var api_endpoint = 'https://api.flickr.com/services/rest/?method=flickr.photos.getSizes&format=json&nojsoncallback=1';

    function addDownloadButton(element) {
        // Arrive
        document.arrive(element, function(){
            var el = this;
            var dlbar = createButton();
            var dlbtn = dlbar.getElementsByTagName('button')[0];
            var photo_url = window.location.href;
            var interaction_bar = el.getElementsByClassName('interaction-bar');
            if (interaction_bar.length > 0) {
                dlbar.style.position = 'absolute';
                dlbar.style.top = '-60px';
                dlbar.style.right = '10px';
                interaction_bar[0].appendChild(dlbar);
                photo_url = el.getElementsByClassName('overlay')[0].getAttribute('href');
            }
            else {
                dlbar.style.marginBottom = '10px';
                dlbar.style.paddingBottom = '10px';
                dlbar.style.borderBottom = '1px solid #cfd6d9';
                el.getElementsByClassName('sub-photo-right-view')[0].prepend(dlbar);
            }

            // OnClick event
            dlbtn.addEventListener('click', function(){
                var uri = photo_url;
                console.log(uri);
                var regex_patt = /\/(\d+)\/*/gi;
                var photo_id = regex_patt.exec(uri)[1];
                var request_url = api_endpoint + '&api_key=' + getApiSiteKey() + '&photo_id=' + photo_id + '&csrf=' + getCsrfToken();
                console.log(request_url);

                console.log(photo_id);
                dlbtn.disabled = true;
                ajaxSend(request_url, function(data){
                    data = JSON.parse(data);
                    download(data);
                    dlbtn.disabled = false;
                });
            });

            var $this = $(dlbtn);

            $this.on('download-all', function(){
                console.log("Hi");
                var uri = photo_url;
                console.log(photo_url);
                var regex_patt = /\/(\d+)\//gi;
                var photo_id = regex_patt.exec(uri)[1];
                var request_url = api_endpoint + '&api_key=' + getApiSiteKey() + '&photo_id=' + photo_id + '&csrf=' + getCsrfToken();
                dlbtn.disabled = true;
                ajaxSend(request_url, function(data){
                    data = JSON.parse(data);
                    linkadd(data);
                    dlbtn.disabled = false;
                });

            });
        });

        // Leave
        document.leave(element, function(){
            document.unbindArrive(this);
        });
    }

    function createButton() {
        var dlbar = document.createElement('div');
        dlbar.className = 'tool';
        dlbar.innerHTML = '<button class="download-butt" style="min-width:0; padding:0 10px; z-index:100000;" title="Download">Download</button>';
        return dlbar;
    }

    function getApiSiteKey() {
        return unsafeWindow.YUI_config.flickr.api.site_key;
    }

    function getCsrfToken() {
        return unsafeWindow.YUI_config.flickr.csrf.token;
    }

    function basename(path) {
        return path.split('/').slice(-1)[0];
    }

    function ajaxSend(url, callback) {
		var ret = GM_xmlhttpRequest({
			method: "GET",
			url: url,
			onreadystatechange: function() {
                if (this.readyState == 4 && this.status == 200) {
                    callback(this.responseText);
                }
            }
		});
    }

    function prepareImgLink(link) {
        var img = link.split('.');
        return img.slice(0, -1).join('.') + '_d.' + img.slice(-1)[0];
    }

    function isFirefox() {
        return /Firefox\//i.test(navigator.userAgent);
    }

    function download(data) {
        console.log(data);
        if (!data.hasOwnProperty('sizes')) {
            var error_msg = 'An error occured. Please refresh the page.';
            alert(data.hasOwnProperty('message') ? error_msg+"\r\nError: "+data.message : error_msg);
            return false;
        }
        var largest_photo = data.sizes.size.slice(-1)[0];
        var img = prepareImgLink(largest_photo.source);
        var a = document.createElement('a');
        a.href = img;
        if (isFirefox())
            a.dispatchEvent(new MouseEvent('click'));
        else
            a.click();

        console.log(img);
    }

    function linkadd(data) {
        if (!data.hasOwnProperty('sizes')) {
            var error_msg = 'An error occured. Please refresh the page.';
            alert(data.hasOwnProperty('message') ? error_msg+"\r\nError: "+data.message : error_msg);
            return false;
        }
        var largest_photo = data.sizes.size.slice(-1)[0];
        var img = prepareImgLink(largest_photo.source);
        var a = document.createElement('a');
        a.href = img;
        a.text = img;
        a.style.display = 'none';
        $('#content').append(a);

        console.log(img);
    }

    // Add download button on photos grid
    addDownloadButton('.photo-list-photo-interaction');

    // Add download button on single photo page
    addDownloadButton('.photo-page-scrappy-view');

    $('document').ready(function() {
        console.log("Document finished loading...");

        var event = jQuery.Event( 'download-all' );

        var zNode = document.createElement ('div');
        zNode.innerHTML = '<button id="myButton" type="button">'
            + 'Download All</button>'
        ;
        zNode.setAttribute ('id', 'myContainer');
        $('div.fluid-subnav').append(zNode);

        //--- Activate the newly added button.
        document.getElementById ("myButton").addEventListener (
            "click", ButtonClickAction, false
        );

        function ButtonClickAction (zEvent) {
            console.log($('button.download-butt'));
            $('button.download-butt').trigger('download-all');
        }

    });
})();
