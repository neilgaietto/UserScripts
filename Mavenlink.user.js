// ==UserScript==
// @name         Mavenlink
// @namespace    http://your.homepage/
// @version      0.1
// @updateURL    https://github.com/neilgaietto/UserScripts/raw/master/Mavenlink.user.js
// @description  enter something useful
// @author       You
// @match        https://atlanticbt.mavenlink.com/*
// @grant        none
// ==/UserScript==

$(document).ajaxComplete(function() { 
    // Tasks > Your Tasks
    if(window.location.href  === "https://atlanticbt.mavenlink.com/stories#upcoming?assignedToYou=true"){
        // remove pto tasks
        var ptoTasks = $('tr[data-story-id=96718717], tr[data-story-id=96718727]');
        ptoTasks.remove();
            
        // remove milestones
        $('tr.milestone').remove();
            
        // hightlight tasks
        $('.task.substory').css('background-color', 'lightcyan');
        
        // add Type
        if($('.task-tracker table thead tr:contains("Type")').length === 0){
            $('.task-tracker table thead tr').append("<th class=\"assignees\" data-column=\"6\" tabindex=\"0\" scope=\"col\" role=\"columnheader\" aria-disabled=\"false\" unselectable=\"on\" aria-sort=\"none\" style=\"-webkit-user-select: none;\"><div class=\"tablesorter-header-inner\">Type</div></th>")
            
            $('.task-tracker table tbody').find('tr').each(function(){
                var classNames = $(this).attr('class').split(" ");
                var taskType = classNames[0];
            
                $(this).append("<td class=\"due-date\">" + taskType + "</td>");
            })
        }

        // add table sort, http://mottie.github.io/tablesorter/docs/index.html
        $.getScript( "https://mottie.github.io/tablesorter/dist/js/jquery.tablesorter.min.js", function( data, textStatus, jqxhr ) {
            $('.task-tracker table').tablesorter({
                sortList: [[0,0],[6,0]]
            });
        });
    }
});