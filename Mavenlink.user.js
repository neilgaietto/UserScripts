// ==UserScript==
// @name         Mavenlink
// @version      2.0.0
// @updateURL    https://github.com/neilgaietto/UserScripts/raw/master/Mavenlink.user.js
// @description  ABT Mavenlink Script
// @author       ABT
// @match        https://atlanticbt.mavenlink.com/*
// @grant        none
// ==/UserScript==

window.abtMaven = (function (mavenlink, $, window, document) {

    //========== Utilities ==========//
    //function getQueryParameters(str) {
    //    return (str || document.location.search).replace(/(^\?)/, '').split("&").map(function (n) {
    //        return n = n.split("="), this[n[0]] = n[1], this
    //    }.bind({}))[0];
    //}

    function highlightCurrentUser() {
        var currentUserId = mavenlink.currentUser["id"].toString();
        $('div.assignees .input-field input').each(function () {
            var selectedIds = ($(this).val() || "").split(",");
            var isSelected = $.inArray(currentUserId, selectedIds) > -1;
            if (isSelected) {
                $(this).closest('div.assignees').find('div.readonly').css('color', '#23cf5f');
            }
        });
    }

    function updateTasksMenuItem() {
        var lnk = $('.navigation-application .link.tasks.application-link a.outer-link');
        lnk.attr('href', '/stories#upcoming?assignedToYou=true');
        lnk.find('span.nav-link-text').text('Your Tasks');
    }

    //function addMidnightRadio() {

    //    //check if custom theme is enabled
    //    var useTheme = settings().theme;
    //    if (useTheme) {
    //        $('body').addClass('midnight-theme');
    //    }

    //    // add radio
    //    $('#header').append("<div id='midnight' class='group'><label class='switch switch-flat'><input class='switch-input' type='checkbox' " + (useTheme ? "checked='checked'" : "") + " /><span class='switch-label' data-on='On' data-off='Off'></span><span class='switch-handle'></span></label></div>");

    //    // toggle radio
    //    $("#midnight input").click(function () {
    //        $('body').toggleClass("midnight-theme");
    //        settings({ theme: $('body').hasClass("midnight-theme") });
    //    });
    //}


    function dailyWelcomeMessages() {

        if ($('body.dashboard').length) {
            var today = (new Date()).getDay();
            var messages = [
                "Selfless.  <em>Sunday.</em>",
                "Oof.       <em>Monday.</em>",
                "Meh.       <em>Tuesday.</em>",
                "Hump Day.  <em>Wednesday.</em>",
                "Throwback. <em>Thursday.</em>",
                "TGIF.      <em>Friday.</em>",
                "Party.     <em>Saturday.</em>"
            ];
            $('body.dashboard h1.content-title').html(messages[today]);
        }

    }

 
    function settings(settingValue) {
        //Properties: Theme = true|false

        var key = 'abt-view-settings';
        //grab cookie value
        var cookieVal = JSON.parse($.cookie(key));
        //set defaults if missing
        cookieVal = cookieVal || { theme: true };
        if (settingValue) {
            //apply changed values
            cookieVal = $.extend(cookieVal, settingValue);
        }
        //save changes
        $.cookie(key, JSON.stringify(cookieVal), { path: '/' });

        //return settings
        return cookieVal;
    }


    function init() {
        // add new styles
        //$('head').append('<link rel="stylesheet" type="text/css" href="https://abtjs.s3.amazonaws.com/css/Mavenlink.style.css">');

        // add radio for midnight theme
        //addMidnightRadio();

        // Update Tasks link to My Tasks
        updateTasksMenuItem();


        // update handler
        $(document).ajaxComplete(function (event, xhr, settings) {

            // add welcome messages
            dailyWelcomeMessages();

            // highlights the current user in task lists
            highlightCurrentUser();
        });
    }


    return { init: init };
})(window.Mavenlink, jQuery, window, document);

window.abtMavenTimer = (function () {

    function onTaskLoaded(task) {
        console.log({ f: 'onTaskLoaded', task });
        //add timer button
    }

    function initTimerView() {

        $(document).on('ajaxComplete.task', function (event, xhr, settings) {
            //if (!taskView.task && settings.url.indexOf('/api/v1/stories/') == 0) {
                //$(event.currentTarget).off('ajaxComplete.task')
                //console.log(xhr.responseText);
                if (!xhr.responseJSON
                  || !xhr.responseJSON.results
                  || xhr.responseJSON.results.length != 1) {
                    return;
                }

                var resultKey = xhr.responseJSON.results[0];
                var task = xhr.responseJSON[resultKey.key][resultKey.id];

                onTaskLoaded(task);
            //}
        });
    }

    function init() {
        initTimerView();
    };

    var timerView = {
        timers: undefined
    };

    return {
        init: init
    };
})();

// ready events
$(document).ready(function () {
    abtMaven.init();
    abtMavenTimer.init();
});
