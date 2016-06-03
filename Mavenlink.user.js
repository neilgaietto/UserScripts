// ==UserScript==
// @name         Mavenlink
// @version      1.0.6
// @updateURL    https://github.com/neilgaietto/UserScripts/raw/master/Mavenlink.user.js
// @description  ABT Mavenlink Script
// @author       ABT
// @match        https://atlanticbt.mavenlink.com/*
// @grant        none
// ==/UserScript==

window.abtMaven = (function (mavenlink, $, window, document) {

    //========== Utilities ==========//
    function getQueryParameters(str) {
        return (str || document.location.search).replace(/(^\?)/, '').split("&").map(function (n) {
            return n = n.split("="), this[n[0]] = n[1], this
        }.bind({}))[0];
    }

    function expandableDescriptionTextbox() {
        $('.task-tracker .detail-layout .view .story-details .left .section.description .story-description textarea')
            .css('resize', 'both')
            .each(function () {
                var $box = $(this);

                if (!$box.data('isResized')) {
                    if ($box.height() < this.scrollHeight) {
                        $box.height(this.scrollHeight + 10);
                    }

                    $box.data('isResized', true);
                }
            });

    }

    // Prevents the special 'overdue' status Mavenlink sets on stories, restoring the value the way ML otherwise sets it
    function resetTaskStatuses() {
        var overduePillsSel = ".lozenge.pill .display[data-status='overdue']";
        var resetStatus = function (i, e) { // i is unused
            $(e).attr("data-status", $(e).find('.text').text().toLowerCase().replace(/\s/g, "-").replace(/'/, ""));
        };
        $(overduePillsSel).each(resetStatus); // Fix all current cases
        document.addEventListener("DOMNodeInserted", function (event) {
            resetStatus(0, $(event.target).find(overduePillsSel)); // Fix any added cases
        });
    }

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

    function getCurrentWorkspaceId() {
        var wsMatch = window.location.href.match(/workspaces\/([^\/]+)/i);
        if (wsMatch != null && wsMatch.length > 1) {
            return wsMatch[1];
        }
        return false;
    }

    // Given any element *inside* a story's row (not the row itself),
    //   attempts to match it with a story model (by name and depth) and returns it's ID
    function findStoryIdForRow(rowInnerElem) {
        try {
            var models = [];
            var rowLevel = $(rowInnerElem).parents('.substory-rows').length;
            var rowTitle = $(rowInnerElem).closest('.row.tbl-row').find('.column.title .field-control').children().last().text();
            for (modelIdx in window.base.data.collections.stories.storage.models) {
                var model = window.base.data.collections.stories.storage.models[modelIdx];
                if (rowTitle == model.get('title') && rowLevel == model.get('ancestor_ids').length) {
                    models.push(model.id);
                }
            }
            return models.length == 1 ? models[0] : false; // Multiple matches are impossible to distinguish, so cancel
        } catch (e) { console.error(e); }
        return false;
    }

    //========== Functions ==========//
    function updateYourTasksView() {
        // remove pto tasks
        var ptoTasks = $('tr:contains(PTO)');
        ptoTasks.remove();

        // remove milestones
        var mileStones = $('tr').has('div .story-icon.milestone');
        mileStones.remove();

        // remove huddles
        var huddles = $('tr:contains(huddle), tr:contains(Huddle)').remove();
        huddles.remove();

        // fix overdue on status pills
        resetTaskStatuses();

        // hightlight tasks
        $('.task.substory').css('background-color', 'lightcyan');
        $('.issue.substory').css('background-color', 'lavender');

        $('.task-tracker table tbody').find('tr').each(function () {
            if ($(this).find('td').length === 23) {
                var taskType = "n/a";

                if ($(this).has('.story-icon.deliverable').length >= 1) {
                    taskType = "deliverable";
                } else if ($(this).has('.story-icon.task').length >= 1) {
                    taskType = "task";
                } else if ($(this).has('.story-icon.issue').length >= 1) {
                    taskType = "issue";
                }

                $($(this).find('td')[5]).after("<td class=\"moment-cell renderable\">" + taskType + "</td>");
            }
        });

        // check table
        if (!loadedTableSorter() && $('.task-tracker table tbody tr').length > 1 && $.fn.tablesorter !== undefined) {
            addTableSort()
        } else {
            $('.task-tracker table').trigger('update');
        }
    }

    function loadedTableSorter() {
        return $('.task-tracker table').hasClass('tablesorter');
    }

    function updateTasksMenuItem() {
        var lnk = $('.navigation-application .link.tasks.application-link a.outer-link');
        lnk.attr('href', '/stories#upcoming?assignedToYou=true');
        lnk.find('span.nav-link-text').text('Your Tasks');
    }

    function updateTaskTracker() {
        // fix overdue on status pills
        resetTaskStatuses();

        // update task actions
        updateTaskActions();

        // highlights the current user in task lists
        highlightCurrentUser();

        // expand all feature
        if ($('.row-wrapper > .rows > .row').length > 0) {
            if (!loadedTaskTracker) {
                // milestone clicked
                $('.row-wrapper > .rows > .row').on('click', function () {
                    milestoneIndex = $(this).index();
                    milestone = $('.row-wrapper > .rows > .row')[milestoneIndex];
                });

                $('.toggler.substory-toggle').after(
                    function () {
                        // expand item column
                        $('.column.item').css('margin-left', '40px')

                        $(this).click(function () {
                            expandAll = false;
                        });

                        return $(this).clone().addClass('expandAll').removeClass('substory-toggle').css('left', '40px').click(function () {
                            $(this).parent().find('.toggler.substory-toggle:not(.expanded):not(.working):not(.invisible)').each(function () {
                                $(this).addClass('working').click();
                            });

                            expandAll = true;
                        });
                    }
                );

                loadedTaskTracker = true;
            }

            expandAllRows();
        }
    }

    function expandAllRows() {
        if (expandAll && milestone !== undefined) {
            $(milestone).children('ul.substory-rows').children('li:has(div[data-status][data-status!=completed][data-status!=resolved])').find('.toggler.substory-toggle:not(.expanded):not(.working):not(.invisible)').each(function () {
                $(this).addClass('working').click();
            });
        }
    }

    function updateMavenLink() {
        // Tasks > Your Tasks
        if (window.location.href.indexOf("/stories#") != -1) {
            updateYourTasksView();
        }

        // Project > Task Tracker
        if (window.location.href.indexOf("/tracker/") != -1) {
            updateTaskTracker();
        }
    }

    function addTypeToYourTasks() {
        if ($('.task-tracker table thead tr:contains("Type")').length === 0 && $('.task-tracker table thead th.due-date').length !== 0) {
            $('.task-tracker table thead th.due-date').after("<th class=\"due-date renderable\">Type</th>")
        }
    }

    function addDashboardStats() {
        var taskTable = $('#your-items-wrapper'),
            countTasks = taskTable.find('td.abt-icon-task').length,
            countBugs = taskTable.find('td.abt-icon-issue').length,
            countDeliverables = taskTable.find('td.abt-icon-deliverable').length,
            countMilestones = taskTable.find('td.abt-icon-milestone').length;

        $('#dash-stats').remove();

        taskTable.before('<div id="dash-stats" class="dash-stats"><div class="abt-icon-milestone"><strong>' + countMilestones + '</strong> <span>Milestones</span></div><div class="abt-icon-deliverable"><strong>' + countDeliverables + '</strong> <span>Deliverables</span></div><div class="abt-icon-task"><strong>' + countTasks + '</strong> <span>Tasks</span></div><div class="abt-icon-issue"><strong>' + countBugs + '</strong> <span>Bugs</span></div></div>');
    }

    function addMidnightRadio() {

        //check if custom theme is enabled
        var useTheme = settings().theme;
        if (useTheme) {
            $('body').addClass('midnight-theme');
        }

        // add radio
        $('#header').append("<div id='midnight' class='group'><label class='switch switch-flat'><input class='switch-input' type='checkbox' " + (useTheme ? "checked='checked'" : "") + " /><span class='switch-label' data-on='On' data-off='Off'></span><span class='switch-handle'></span></label></div>");

        // toggle radio
        $("#midnight input").click(function () {
            $('body').toggleClass("midnight-theme");
            settings({ theme: $('body').hasClass("midnight-theme") });
        });
    }

    function updateTaskIcons() {

        if ($('.icon-new[class*="icon-fill-task"]').length) {
            $('.icon-new[class*="icon-fill-task"]').each(function () {
                $(this).parent().addClass('abt-icon-task');
            });
        }
        if ($('.icon-new[class*="icon-fill-deliverable"]').length) {
            $('.icon-new[class*="icon-fill-deliverable"]').each(function () {
                $(this).parent().addClass('abt-icon-deliverable');
            });
        }
        if ($('.icon-new[class*="icon-fill-milestone"]').length) {
            $('.icon-new[class*="icon-fill-milestone"]').each(function () {
                $(this).parent().addClass('abt-icon-milestone');
            });
        }
        if ($('.icon-new[class*="icon-fill-issue"]').length) {
            $('.icon-new[class*="icon-fill-issue"]').each(function () {
                $(this).parent().addClass('abt-icon-issue');
            });
        }

        if ($('.flydown .icon-new[class*="icon-fill-primary"]').length) {
            $('.flydown .icon-new[class*="icon-fill-primary"]').each(function () {
                $(this).before('<div class="abt-icon-milestone" style="margin: 0 10px;"></div>');
                $(this).remove();
            });
        }
        if ($('.flydown .icon-new[class*="icon-fill-action"]').length) {
            $('.flydown .icon-new[class*="icon-fill-action"]').each(function () {
                $(this).before('<div class="abt-icon-deliverable" style="margin: 0 10px;"></div>');
                $(this).remove();
            });
        }
        if ($('.flydown .icon-new[class*="icon-fill-highlight"]').length) {
            $('.flydown .icon-new[class*="icon-fill-highlight"]').each(function () {
                $(this).before('<div class="abt-icon-task" style="margin: 0 10px;"></div>');
                $(this).remove();
            });
        }
        if ($('.flydown .icon-new[class*="icon-fill-caution"]').length) {
            $('.flydown .icon-new[class*="icon-fill-caution"]').each(function () {
                $(this).before('<div class="abt-icon-issue" style="margin: 0 10px;"></div>');
                $(this).remove();
            });
        }

    }

    function updateTaskActions() {
        if (taskTimeActionsBound) {
            return;
        }

        document.addEventListener("DOMNodeInserted", function (event) {
            $(event.target).find('.icon.icon-animated.small-x.close').each(function () {
                if ($(this).parent().find('.icon.add-time').length < 1) {
                    var storyId = findStoryIdForRow(this);
                    $(this).before(
                        $('<div>')
                            .addClass('add-time icon icon-animated finger ghosted')
                            .attr('data-tooltip', 'Add Time')
                            .click(function () {
                                window.open('/workspaces/' + getCurrentWorkspaceId() + '?tab=time-tracking' + (storyId ? '&story_id=' + storyId : ''), '_blank');
                            })
                    );
                }
            });
        });
        taskTimeActionsBound = true;
    }

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

    function addActivityHeaders() {
        if ($('#list-of-events').length) {
            var list = $('#list-of-events'),
                listItem = list.find('> ul > li');

            // console.log('list: ' + list);
            // console.log('listItem: ' + listItem);

            listItem.each(function () {

                var thisItem = $(this).find('> .post-wrapper > .content > .content-body .timestamp').text(),
                    nextItem = $(this).next().find('> .post-wrapper > .content > .content-body .timestamp').text();

                // console.log('thisItem: ' + thisItem);
                // console.log('nextItem: ' + nextItem);

                // if item 1 & item 2 are equal, do nothing

                // if item 2 & item 2 are not equal, display heading using item 2 value
                if (thisItem != nextItem) {
                    $(this).after('<li class="feed-day-header"><h2>' + nextItem + '</h2></li>');
                }

            });
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

    function addTableSort() {
        $('.task-tracker table').tablesorter({
            textExtraction: {
                4: function (node, table, cellIndex) {
                    return Date.parse(node.innerHTML)
                },
                5: function (node, table, cellIndex) {
                    return Date.parse(node.innerHTML)
                }
            }
        });
    };

    function init() {
        // add new styles
        $('head').append('<link rel="stylesheet" type="text/css" href="https://abtjs.s3.amazonaws.com/css/Mavenlink.style.css">');

        // add radio for midnight theme
        addMidnightRadio();

        // Update Tasks link to My Tasks
        updateTasksMenuItem();

        // update task icons
        updateTaskIcons();

        // add dashboard stats
        addDashboardStats();

        // add activity headers
        addActivityHeaders();

        // Tasks > Your Tasks
        if (window.location.href.indexOf("https://atlanticbt.mavenlink.com/stories#") != -1) {
            // add table sort, http://mottie.github.io/tablesorter/docs/index.html
            $.ajax({
                url: "https://mottie.github.io/tablesorter/dist/js/jquery.tablesorter.min.js",
                dataType: "script",
                success: function () {
                    //console.log("loaded tablesorter");

                    // add type column
                    addTypeToYourTasks();

                    // check table sort
                    addTableSort();
                }
            });
        }

        // update handler
        $(document).ajaxComplete(function (event, xhr, settings) {
            //console.log('ajaxComplete: ' + new Date().toLocaleTimeString());

            // remove tooltips
            $.fn.tipsy = function () {
                return this;
            };

            // add type column
            addTypeToYourTasks();

            // Make description textboxes expandable
            expandableDescriptionTextbox();

            // reset vars
            params = getQueryParameters(window.location.search);

            // update task icons
            updateTaskIcons();

            // add dashboard stats
            addDashboardStats();

            // add welcome messages
            dailyWelcomeMessages();

            // add activity headers
            // addActivityHeaders();

            // run scripts
            updateMavenLink();

            // highlights the current user in task lists
            highlightCurrentUser();
        });
    }

    // vars
    var loadedTaskTracker = false;
    var taskTimeActionsBound = false;
    var milestone;
    var milestoneIndex;
    var params = getQueryParameters(window.location.search);
    var expandAll;

    return { init: init };
})(window.Mavenlink, jQuery, window, document);

window.abtMavenTasks = (function () {

    function showParents() {
        if (taskView.task
            && taskView.task.waitingOn == 0
            && taskView.$parentsElement
            && taskView.$parentsElement.length == 1) {

            var $list = $('<ul></ul>')
            for (var i = 0; i < taskView.task.parents.length; i++) {
                //https://app.mavenlink.com/workspaces/9275607/#tracker/102878747
                $list.append('<li><div class="story-icon abt-icon-' + taskView.task.parents[i].story_type + '" style="margin: 0 8px"></div><a href="https://app.mavenlink.com/workspaces/' + taskView.task.parents[i].workspace_id + '/#tracker/' + taskView.task.parents[i].id + '">' + $.trim(taskView.task.parents[i].title) + '</a></li>');
            }

            var $container = taskView.$parentsElement.find('.ancestor-description');
            if ($list.children().length == 0) {
                $list.append('<li>None</li>');
            }

            $container.empty().append($list);
        }
    }

    function onTaskLoaded(task) {
        console.log('Task Detail: Setting task');
        taskView.task = {};
        taskView.task.parents = [];
        taskView.task.waitingOn = task.ancestor_ids.length;
        for (var i = 0; i < task.ancestor_ids.length; i++) {
            taskView.task.parents.push({ id: task.ancestor_ids[i] });

            //--Get details of each ancestor
            $.getJSON('/api/v1/stories/' + task.ancestor_ids[i], function (data) {
                //console.log(data);

                var parentKey = data.results[0];
                var parent = data[parentKey.key][parentKey.id];
                for (var j = 0; j < taskView.task.parents.length; j++) {
                    if (taskView.task.parents[j].id == parent.id) {
                        taskView.task.parents[j] = parent;
                    }
                }

                taskView.task.waitingOn--;
                showParents();
            });
        }
    }

    function loadCurrentTask(taskId) {
        if (!taskId) {
            return;
        }

        console.log('Task Detail: Grabbing task');
        $.getJSON('/api/v1/stories/' + taskId, function (data) {
            var key = data.results[0];
            var task = data[key.key][key.id];
            onTaskLoaded(task);
        });
    }

    function initTaskView() {
        //--Add observer to watch for the detail window
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {

                if (mutation.removedNodes && taskView.task) {
                    for (var i = 0; i < mutation.removedNodes.length; i++) {
                        var $item = $(mutation.removedNodes[i]);
                        if ($item.is('#story-link')
                            || $item.find('#story-link').length > 0) {
                            //--Detail window is closed, so unset the task
                            console.log('Task Detail: Killing task');
                            taskView.task = undefined;
                            taskView.$parentsElement = undefined;
                            return;
                        }
                    }
                }

                if (!mutation.addedNodes) {
                    return;
                }

                for (var i = 0; i < mutation.addedNodes.length; i++) {
                    var $item = $(mutation.addedNodes[i]);

                    if (!$item.is('.story-details')
                        && $item.find('.story-details').length == 0) {
                        //--Detail window is not present in this added item
                        continue;
                    }

                    var $parentContainer = $('.story-details .right');
                    if ($parentContainer.length != 1 || $parentContainer.data('initializedParents')) {
                        //--Window exists and has already been initialized
                        return;
                    }

                    console.log('Task Detail: Adding Parents Node');
                    $parentContainer.data('initializedParents', true);
                    var $parents = $('<div class="section description"><div class="todos-container" style="margin-top:0"><h1>Parents</h1><div class="ancestor-description">Loading...</div></div></div>')
                    $('.story-details .right').prepend($parents);

                    taskView.$parentsElement = $parents;
                    if (!taskView.task) {
                        //--Task loading was not intercepted, so manually load the task
                        var taskId = $('.story-id').val();
                        loadCurrentTask(taskId);
                    }

                    showParents();
                    return;
                }
            })
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });


        $(document).on('ajaxComplete.task', function (event, xhr, settings) {
            if (!taskView.task && settings.url.indexOf('/api/v1/stories/') == 0) {
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
            }
        });
    }

    function init() {
        initTaskView();
    };

    var taskView = {
        task: undefined,
        $parentsElement: undefined
    };

    return {
        init: init
    };
})();

// ready events
$(document).ready(function () {
    abtMaven.init();
    abtMavenTasks.init();
});
