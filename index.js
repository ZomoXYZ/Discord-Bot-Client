const ipc = require('electron').ipcRenderer;
addEventListener('load', () => {
    
    var windowActive = document.hidden,
        basicInfo;
    
    addEventListener("focus", () => windowActive = true);
    addEventListener("blur", () => windowActive = false);
    
    var displayMessage = (msg, chanID) => {
        var outterDiv = document.createElement('div'),
            innerImg = document.createElement('img'),
            innerSpan = document.createElement('span'),
            namedateSpan = document.createElement('span'),
            nameSpan = document.createElement('span'),
            dateSpan = document.createElement('span'),
            messageSpan = document.createElement('span');


        outterDiv.setAttribute('id', 'messageid-'+msg.id);
        outterDiv.setAttribute('class', 'dm-message');

        innerImg.setAttribute('src', msg.author.avatarURL);
        innerImg.setAttribute('class', 'dm-icon');

        innerSpan.setAttribute('class', 'dm-text');

        namedateSpan.setAttribute('class', 'dm-namedate');

        nameSpan.textContent = msg.author.username;
        nameSpan.setAttribute('class', 'dm-name');
        nameSpan.setAttribute('id', 'userid-'+msg.author.id);

        dateSpan.textContent = msg.timestamp;
        dateSpan.setAttribute('class', 'dm-date');

        messageSpan.textContent = msg.content;
        messageSpan.setAttribute('class', 'dm-content');

        namedateSpan.appendChild(nameSpan);
        namedateSpan.appendChild(dateSpan);

        innerSpan.appendChild(namedateSpan);
        innerSpan.appendChild(messageSpan);

        outterDiv.appendChild(innerImg);
        outterDiv.appendChild(innerSpan);

        document.getElementById('openid-'+chanID).append(outterDiv);
    };
    
    var displayDMChannel = chan => {
        var outterDiv = document.createElement('div'),
            innerImg = document.createElement('img'),
            innerSpan = document.createElement('span'),
            titleSpan = document.createElement('span'),
            recipientsSpan = document.createElement('span');

        outterDiv.setAttribute('id', 'channelid-'+chan.id);
        outterDiv.setAttribute('class', 'dm-item '+(chan.isGroup ? 'dm-group' : 'dm-user'));

        if (chan.iconURL) innerImg.setAttribute('src', chan.iconURL);
        innerImg.setAttribute('class', 'dm-icon');

        innerSpan.setAttribute('class', 'dm-text');

        titleSpan.textContent = chan.name;
        titleSpan.setAttribute('class', 'dm-title');

        recipientsSpan.textContent = chan.recipientsCount;
        recipientsSpan.setAttribute('class', 'dm-recipientcount');

        innerSpan.appendChild(titleSpan);
        innerSpan.appendChild(recipientsSpan);

        outterDiv.appendChild(innerImg);
        outterDiv.appendChild(innerSpan);

        document.querySelector('#dm-list .dm-existing').prepend(outterDiv);
    }

    ipc.send('startup');

    ipc.on('basicInfo', (event, arg) => {

        basicInfo = arg;

    });

    ipc.on('DMList', (event, arg) => {

        console.log(arg);

        document.querySelector('#dm-list .dm-existing').innerHTML = '';

        for (var i = 0; arg.length > i; i++){
            console.log('dm')
            displayDMChannel(arg[i]);
        }

    });
    
    document.querySelector('#dm-list .dm-existing').addEventListener('click', e => {//read dm
        console.log(e);
        var id = null;
        for (var i = 0; e.path.length > i; i++) {
            if (e.path[i] === document.body)
                i = e.path.length;
            else if (e.path[i].getAttribute('class') && e.path[i].getAttribute('class').split(' ').indexOf('dm-item')+1)
                id = e.path[i].getAttribute('id').split(' ')[0].replace('channelid-', '');
        }
        
        console.log(id)
        if (id) {
            ipc.send('readDM', id);
            if (e.target.hasAttribute('class')) {
                var classes = e.target.getAttribute('class').split(' ');
                if (classes.indexOf('dm-newmessage')+1) {
                    classes.splice(classes.indexOf('dm-newmessage', 1));
                    e.target.setAttribute('class', classes.join(' '));
                }
            }
        }
    });
    
    document.querySelector('#dm-list .dm-add span').addEventListener('click', e => {//add user
        console.log(e);
        if (document.querySelector('#dm-list .dm-add input').value) {
            ipc.send('openDM', document.querySelector('#dm-list .dm-add input').value);
            document.querySelector('#dm-list .dm-add input').value = '';
        }
    });
    
    ipc.on('initialDM', (event, arg) => {
        console.log(arg);

        if (arg.messages) {
            /*document.getElementById('dm-open').innerHTML = '';
            
            var openinnerdiv = document.createElement('div');
            
            openinnerdiv.setAttribute('id', 'openid-'+arg.id);
            openinnerdiv.setAttribute('class', 'dm-openinner');
            
            document.getElementById('dm-open').prepend(openinnerdiv)*/
            
            document.querySelector('#dm-open .dm-openinner').setAttribute('id', 'openid-'+arg.id);
            document.querySelector('#dm-open .dm-openinner').innerHTML = '';
            
            for (var i = 0; arg.messages.length > i; i++)
                displayMessage(arg.messages[i], arg.id);
            
        }
    });
    ipc.on('addDM', (event, arg) => {
        console.log(arg);

        displayDMChannel(arg);
    });
    ipc.on('messageCreate', (event, arg) => {
        console.log(arg);
        var activeDM = document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && arg.id === document.querySelector('#dm-open .dm-openinner').getAttribute('id').replace('openid-', '');
        if (activeDM)
            displayMessage(arg.message, arg.id);
        else if (!document.getElementById('channelid-'+arg.id)) {
            console.log('dm')
            displayDMChannel(arg.message.channel);
        }
        if (arg.message.author.id !== basicInfo.me.id && (!activeDM || !windowActive)) {
            var notif = new Notification(arg.message.author.username+'#'+arg.message.author.discriminator, {
                body: arg.message.content,
                icon: arg.message.author.avatarURL
            });
            if (!activeDM) {
                console.log('channelid-'+arg.message.author.id)
                var DMInList = document.getElementById('channelid-'+arg.message.channel.id),
                    classes = DMInList.getAttribute('class');
                classes = classes.split(' ');
                if (classes.indexOf('dm-newmessage')) {
                    classes.push('dm-newmessage');
                    DMInList.setAttribute('class', classes.join(' '));
                }
            }
            notif.onclick = () => {
                console.log(activeDM, arg.message.channel.id)
                if (!activeDM) {
                    ipc.send('readDM', arg.message.channel.id);
                    var DMInList = document.getElementById('channelid-'+arg.message.channel.id);
                    if (DMInList.hasAttribute('class')) {
                        var classes = DMInList.getAttribute('class').split(' ');
                        if (classes.indexOf('dm-newmessage')+1) {
                            classes.splice(classes.indexOf('dm-newmessage', 1));
                            DMInList.setAttribute('class', classes.join(' '));
                        }
                    }
                }
                    
            };
        }
    });
    
    document.querySelector('#dm-open .dm-textbotcontain input.textbox').addEventListener('keydown', e => {
        if (document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && e.key === 'Enter') {
            ipc.send('sendMessage', {
                channelID: document.querySelector('#dm-open .dm-openinner').getAttribute('id').replace('openid-', ''),
                content: e.target.value
            });
            e.target.value = '';
        }
    });

});