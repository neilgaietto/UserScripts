// ==UserScript==
// @name         Mavenlink
// @version      0.4.5
// @updateURL    https://github.com/neilgaietto/UserScripts/raw/master/Mavenlink.user.js
// @description  ABT Mavenlink Script
// @author       ABT
// @match        https://atlanticbt.mavenlink.com/*
// @grant        none
// ==/UserScript==

// functions
var getQueryParameters = function (str) {
    return (str || document.location.search).replace(/(^\?)/, '').split("&").map(function (n) { return n = n.split("="), this[n[0]] = n[1], this }.bind({}))[0];
};

var initYourTasksView = function () {
    // remove pto tasks
    var ptoTasks = $('tr[data-story-id=96718717], tr[data-story-id=96718727]');
    ptoTasks.remove();

    // remove milestones
    $('tr.milestone').remove();

    // hightlight tasks
    $('.task.substory').css('background-color', 'lightcyan');

    // add Type
    if ($('.task-tracker table thead tr:contains("Type")').length === 0) {
        $('.task-tracker table thead tr').append("<th class=\"assignees\" data-column=\"6\" tabindex=\"0\" scope=\"col\" role=\"columnheader\" aria-disabled=\"false\" unselectable=\"on\" aria-sort=\"none\" style=\"-webkit-user-select: none;\"><div class=\"tablesorter-header-inner\">Type</div></th>")

        $('.task-tracker table tbody').find('tr').each(function () {
            var classNames = $(this).attr('class').split(" ");
            var taskType = classNames[0];

            $(this).append("<td class=\"due-date\">" + taskType + "</td>");
        })
    }
};

var updateYourTasksView = function() {
    $('.task-tracker table tbody').find('tr').each(function() {
        if($(this).find('td').length === 6) {
            var classNames = $(this).attr('class').split(" ");
            var taskType = classNames[0];

            $(this).append("<td class=\"due-date\">" + taskType + "</td>");
        }
    });
};

var updateTasksMenuItem = function() {
	var lnk = $('.navigation-application .link.tasks.application-link a.outer-link');
	lnk.attr('href','/stories#upcoming?assignedToYou=true');
	lnk.find('span.nav-link-text').text('Your Tasks');
};

var init = function () {
    // reset vars
    params = getQueryParameters(window.location.search);

    // Tasks > Your Tasks
    if (window.location.href === "https://atlanticbt.mavenlink.com/stories#upcoming?assignedToYou=true") {
        initYourTasksView();

        // add table sort, http://mottie.github.io/tablesorter/docs/index.html
        if (!loaded) {
            $.getScript("https://mottie.github.io/tablesorter/dist/js/jquery.tablesorter.min.js", function (data, textStatus, jqxhr) {
                $('.task-tracker table').tablesorter({
                    sortList: [[0, 0], [6, 0]]
                });
            });
            loaded = true;
        }

        $(document).ajaxComplete(function (event, xhr, settings) {
            updateYourTasksView();
        });
    }

    // Project > Task Tracker
    if (params.tab === "local-tracker") {
        if(!loaded) {
            // expand all
            $(document).ajaxComplete(function (event, xhr, settings) {
                // milestone clicked
                $('.row-wrapper > .rows > .row').on('click', function () {
                    milestoneIndex = $(this).index();
                    milestone = $('.row-wrapper > .rows > .row')[milestoneIndex];
                })

                $(milestone).children('ul.substory-rows').children('li:has(div[data-status][data-status!=completed])').find('.toggler.substory-toggle:not(.expanded):not(.working):not(.invisible)').each(function () {
                    $(this).addClass('working').click();
                });
            });

            loaded = true;
        }
    }

	//Update Tasks link to My Tasks
	updateTasksMenuItem();
};

// vars
var loaded = false;
var milestone;
var milestoneIndex;
var params = getQueryParameters(window.location.search);

// ajax events
$(document).ajaxComplete(function (event, xhr, settings) {
    init();
});
