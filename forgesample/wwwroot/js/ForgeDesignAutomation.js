/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

$(document).ready(function () {
    $('#clearAccount').click(clearAccount);
    $('#defineActivityShow').click(defineActivityModal);
    $('#createAppBundleActivity').click(createAppBundleActivity);
    $('#startWorkitem').click(startWorkitem);

    startConnection();
});

MyVars = {
    base64png: ""
}

function clearAccount() {
    if (!confirm('Clear existing activities & appbundles before start. ' +
        'This is useful if you believe there are wrong settings on your account.' +
        '\n\nYou cannot undo this operation. Proceed?')) return;

    jQuery.ajax({
        url: 'api/forge/designautomation/account',
        method: 'DELETE',
        success: function () {
            prepareLists();
            writeLog('Account cleared, all appbundles & activities deleted');
        }
    });
}

function defineActivityModal() {
    $("#defineActivityModal").modal();
}

function createAppBundleActivity() {
    startConnection(function () {
        writeLog("Uploading sample files");
        uploadSourceFiles()
        writeLog("Defining appbundle and activity for " + $('#engines').val());
        $("#defineActivityModal").modal('toggle');
        createAppBundle(function () {
            createActivity()
        });
    });
}

function createAppBundle(cb) {
    jQuery.ajax({
        url: 'api/forge/designautomation/appbundles',
        method: 'POST',
        contentType: 'application/json',
        data: "{}",
        success: function (res) {
            writeLog('AppBundle: ' + res.appBundle + ', v' + res.version);
            if (cb) cb();
        }
    });
}

function createActivity(cb) {
    jQuery.ajax({
        url: 'api/forge/designautomation/activities',
        method: 'POST',
        contentType: 'application/json',
        data: "{}",
        success: function (res) {
            writeLog('Activity: ' + res.activity);
            if (cb) cb();
        }
    });
}

function uploadSourceFiles(cb) {
    jQuery.ajax({
        url: 'api/forge/designautomation/files',
        method: 'POST',
        contentType: 'application/json',
        data: "{}",
        success: function (res) {
            writeLog('File upload: done');
        }
    });
}

function showProgressIcon(show) {
   $("#progressIcon").css('display', (show) ? 'block' : 'none')
}

function startWorkitem() {
    showProgressIcon(true)

    let width = Math.floor($("#forgeViewer").width())
    let height = Math.floor($("#forgeViewer").height())
    MyVars.base64png = "";
    var data = {
        browerConnectionId: connectionId,
        params: {
            height: `\"${$("#height").val()}\"`,
            shelfWidth: `\"${$("#shelfWidth").val()}\"`,
            numberOfColumns: `${$("#numberOfColumns").val()}`
        },
        screenshot: {
            width: width,
            height: height,
            position: [10, 10, 10],
            target: [0, 0, 0],
            up: [0, 0, 1]
        }
    };
    writeLog(data);
    startConnection(function () {
        writeLog('Starting workitem...');
        $.ajax({
            url: 'api/forge/designautomation/workitems',
            contentType: 'application/json',
            data: JSON.stringify(data),
            type: 'POST',
            success: function (res) {
                writeLog(`Workitems started: ${res.pngWorkItemId}, ${res.jsonWorkItemId}, ${res.zipWorkItemId}`);
            }
        });
    });
}

function writeLog(text) {
  $('#outputlog').append('<div style="border-top: 1px dashed #C0C0C0">' + text + '</div>');
  var elem = document.getElementById('outputlog');
  elem.scrollTop = elem.scrollHeight;
}

var connection;
var connectionId;

function startConnection(onReady) {
    console.log("startConnection, connection = ", connection)
    if (connection && connection.connectionState) { if (onReady) onReady(); return; }
    connection = new signalR.HubConnectionBuilder().withUrl("/api/signalr/designautomation").build();
    connection.start()
        .then(function () {
            connection.invoke('getConnectionId')
                .then(function (id) {
                    console.log("getConnectionId, id = " + id);
                    connectionId = id; // we'll need this...
                    $("#startWorkitem").removeClass("disabled")
                    if (onReady) onReady();
                });
        });

    connection.on("downloadResult", function (url) {
        writeLog('<a href="' + url +'">Download result file here</a>');
    });

    connection.on("onComplete", function (message) {
        writeLog(message);
    });

    connection.on("onPicture", function (message) {
        /*
        MyVars.base64png += message.substr(6, message.length - 6);
        if (message.startsWith("pngend")) {
            $("#previewImage").attr("src", "data:image/png;base64, " + MyVars.base64png);
        } 
        */
        $("#previewImage").attr("src", message)

        writeLog(message);
    });

    connection.on("onComponents", async function (message) {
        writeLog(message);
        let hideLoading = $("#hideLoading").is(":checked")

        console.log('Hide Viewer')
        if (hideLoading) {
            $('#previewImage').toggleClass('coverViewer')
        }
        
        await launchViewer(JSON.parse(message), "urn:adsk.objects:os.object:rgm0mo9jvssd2ybedk9mrtxqtwsa61y0-designautomation/")
        console.log('Reveal Viewer')

        if (hideLoading) {
            $('#previewImage').toggleClass('coverViewer')
        }

        showProgressIcon(false)
    });
}