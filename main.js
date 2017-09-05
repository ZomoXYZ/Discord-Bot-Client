const {app, BrowserWindow, ipcMain, Tray, nativeImage} = require('electron'),
      discordie = require('discordie'),
      fs = require('fs');

const path = require('path'),
      url = require('url'),
      net = require('net');

let mainWindow;
    
function messageClass(msg) {
    return {
        id: msg.id,
        type: msg.type,
        content: msg.content,
        attachments: msg.attachments,
        embeds: msg.embeds,
        timestamp: msg.timestamp,
        edited_timestamp: msg.edited_timestamp,
        channel: channelClass(msg.channel),
        author: userClass(msg.author)
    }
}
    
function channelClass(chan) {
    
    var recipients = [];
    
    for (var i = 0; chan.recipients.length > i; i++)
        recipients.push(userClass(chan.recipients[i]));
    
    return {
        id: chan.id,
        name: chan.name,
        recipients: recipients,
        recipientsCount: chan.recipients.length,
        status: chan.ischan ? chan.recipient.status : null,
        icon: chan.isGroupchan ? chan.icon : (chan.recipient ? chan.recipient.avatar : null),
        iconURL: chan.isGroupchan ? chan.iconURL : (chan.recipient ? chan.recipient.avatarURL : null),
        staticIconURL: chan.isGroupchan ? chan.staticIconURL : (chan.recipient ? chan.recipient.staticAvatarURL : null),
        isGroup: chan.isGroupDM
    }
}
    
function userClass(user) {
    return {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        avatarURL: user.avatarURL,
        staticAvatarURL: user.staticAvatarURL
    }
}

//https://stackoverflow.com/a/29872303/2856416
var portInUse = (port, callback) => {
    var server = net.createServer(function(socket) {
    socket.write('Echo server\r\n');
    socket.pipe(socket);
    });

    server.listen(port, '127.0.0.1');
    server.on('error', function (e) {
        callback(true);
    });
    server.on('listening', function (e) {
    server.close();
        callback(false);
    });
};

var portCheckLoop = (port, callback) => portInUse(port, b => b ? portCheckLoop(++port, callback) : callback(port));

fs.readFile(__dirname+'/token.txt', 'utf8', (tokenReadError, token) => {

    if (tokenReadError && tokenReadError.code !== 'ENOENT') throw tokenReadError;
    else if (tokenReadError) {

        fs.writeFile(__dirname+'/token.txt', '', tokenCreateFileError => {
            if (tokenCreateFileError) throw tokenCreateFileError;

            console.log(`ERROR: Enter your token in "token.txt"\n  File was not found and has been created`);
            process.exit();

        });

    } else if (!token) {

        console.log(`ERROR: Please enter your token in "token.txt"\n  No data in file`);
        process.exit();
        
    } else {
        
        portCheckLoop(7000, port => {

            require('http').createServer(null).listen(port, '127.0.0.1', () => mainApp(token));

        });
        
    }

});

function mainApp(token) {

    var client = new discordie({autoReconnect: true});
    
    client.connect({token: token});

    var gatewayReady = false,
        windowSaysStartup = false;

    var startupFunc = () => {

        mainWindow.webContents.send('basicInfo', {
            me: userClass(client.User)
        });

        var DMList = [];

        client.DirectMessageChannels.forEach(dm => {
            DMList.push(channelClass(dm));
        });

        mainWindow.webContents.send('DMList', DMList);

        windowSaysStartup = false;

    };

    client.Dispatcher.on('GATEWAY_READY', e => {
        console.log('Connected as: '+client.User.username+'\n');

        gatewayReady = true;

        if (windowSaysStartup)
            startupFunc();

    });

    /*client.Dispatcher.on('CHANNEL_RECIPIENT_ADD', e => console.log(e));
    client.Dispatcher.on('CHANNEL_RECIPIENT_REMOVE', e => console.log(e));*/

    ipcMain.on('startup', function(event, arg) {

        windowSaysStartup = true;
        if (gatewayReady)
            startupFunc();

    });

    ipcMain.on('sendMessage', function(event, arg) {

        var dm = client.DirectMessageChannels.filter(c => c.id === arg.channelID);

        if (dm && dm[0])
            dm[0].sendMessage(arg.content).then(e => {
                mainWindow.webContents.send('messageCreate', messageClass(e.message));
            }, e => console.log(e));

    });

    ipcMain.on('openDM', function(event, arg) {
        
        var user = client.Users.filter(u => u.id === arg);

        if (user && user[0])
            user[0].openDM().then(dm => {
                mainWindow.webContents.send('addDM', channelClass(dm));
            }, e => console.log(e));

    });

    ipcMain.on('readDM', function(event, arg) {

        var dm = client.DirectMessageChannels.filter(c => c.id === arg);

        if (dm && dm[0]) {

            //client.Messages.purgeChannelCache(dm[0]);

            var messages = [];

            dm[0].fetchMessages(100, null, null).then(() => {
                var min = dm[0].messages.length-100;
                min = min < 0 ? 0 : min;
                for (var i = min; dm[0].messages.length > i; i++)
                    messages.push(messageClass(dm[0].messages[i]));

                mainWindow.webContents.send('initialDM', {
                    id: arg,
                    messages: messages
                });
            }, e => console.log(e));

        } else
            mainWindow.webContents.send('initialDM', {
                id: arg,
                messages: null
            });

    });

    client.Dispatcher.on('MESSAGE_CREATE', e => {
        if (e.message.isPrivate) {
            mainWindow.webContents.send('messageCreate', {
                id: e.message.channel.id,
                message: messageClass(e.message)
            });
        }
    });

    //https://electron.atom.io/docs/tutorial/quick-start/
    function createWindow() {
        mainWindow = new BrowserWindow({
            width: 1030, height: 800,
            minWidth: 760, minHeight: 200
        });

        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));

        //mainWindow.webContents.openDevTools();

        mainWindow.on('closed', function () {
            mainWindow = null;
        });
    }

    if (app.isReady())
        createWindow();
    app.on('ready', createWindow);

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
            client.disconnect()
        }
    });

    app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null)
            createWindow();
    });


}
