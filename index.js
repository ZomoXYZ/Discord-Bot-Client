const ipc = require('electron').ipcRenderer,
      Discord = require('discord.js'),
      client = new Discord.Client();

let Channel = null;

addEventListener('load', () => {
    
    let windowActive = document.hidden;
    addEventListener("focus", () => windowActive = true);
    addEventListener("blur", () => windowActive = false);
    
    ipc.on('token', (event, arg) => {
        client.on('ready', start);
        client.login(arg);
    });
    ipc.send('ready');

    const parseMessage = (msg) => {
        let content = msg.content;

        content = content.replace(mentionRegex, (match, type, id) => {
            switch(type) {
                case '@':
                case '@!':
                    if (msg instanceof Discord.GuildChannel) {
                        const member = msg.guild.members.get(id);

                        if (member) {
                            return '@' + member.displayName;
                        }
                    } else {
                        const user = client.users.get(id);

                        if(user) {
                            return '@' + user.username;
                        }
                    }
                    break;
                case '@&':
                    if (msg instanceof Discord.GuildChannel) {
                        const role = msg.guild.roles.get(id);

                        if (role) {
                            return '@' + role.name;
                        }
                    }
                    return '@deleted-role';
                case '#':
                    const channel = client.channels.get(id);

                    if (channel) {
                        return '#' + channel.name;
                    }
                    return '#deleted-channel';
            }
        });

        return content;
    }
    
    const displayMessage = msg => {
        let outterDiv = document.createElement('div'),
            innerImg = document.createElement('img'),
            innerSpan = document.createElement('span'),
            namedateSpan = document.createElement('span'),
            nameSpan = document.createElement('span'),
            dateSpan = document.createElement('span'),
            messageSpan = document.createElement('span');


        outterDiv.setAttribute('id', 'messageid-'+msg.id);
        outterDiv.setAttribute('class', 'dm-message');

        innerImg.setAttribute('src', msg.author.displayAvatarURL);
        innerImg.setAttribute('class', 'dm-icon');

        innerSpan.setAttribute('class', 'dm-text');

        namedateSpan.setAttribute('class', 'dm-namedate');

        nameSpan.textContent = msg.author.username;
        nameSpan.setAttribute('class', 'dm-name');
        nameSpan.setAttribute('id', 'userid-'+msg.author.id);

        dateSpan.textContent = msg.createdTimestamp;
        dateSpan.setAttribute('class', 'dm-date');

        messageSpan.textContent = parseMessage(msg);
        messageSpan.setAttribute('class', 'dm-content');

        namedateSpan.appendChild(nameSpan);
        namedateSpan.appendChild(dateSpan);

        innerSpan.appendChild(namedateSpan);
        innerSpan.appendChild(messageSpan);

        outterDiv.appendChild(innerImg);
        outterDiv.appendChild(innerSpan);

        document.getElementById('openid-'+msg.channel.id).append(outterDiv);
    };
    
    const displayDMChannel = channel => {
        let outterDiv = document.createElement('div'),
            innerImg = document.createElement('img'),
            innerSpan = document.createElement('span'),
            titleSpan = document.createElement('span'),
            recipientsSpan = document.createElement('span');
        
        let info = {}
        
        if (channel.type === 'group')
            info = {
                icon: channel.iconURL,
                name: channel.name,
                length: channel.recipients.toArray().length
            };
        else
            info = {
                icon: channel.recipient.displayAvatarURL,
                name: channel.recipient.username,
                length: 1
            };

        outterDiv.setAttribute('id', 'channelid-'+channel.id);
        outterDiv.setAttribute('class', 'dm-item '+(channel.type === 'group' ? 'dm-group' : 'dm-user'));

        if (info.icon)
            innerImg.setAttribute('src', info.icon);
        innerImg.setAttribute('class', 'dm-icon');

        innerSpan.setAttribute('class', 'dm-text');

        titleSpan.textContent = info.name;
        titleSpan.setAttribute('class', 'dm-title');

        recipientsSpan.textContent = info.length;
        recipientsSpan.setAttribute('class', 'dm-recipientcount');

        innerSpan.appendChild(titleSpan);
        innerSpan.appendChild(recipientsSpan);

        outterDiv.appendChild(innerImg);
        outterDiv.appendChild(innerSpan);

        document.querySelector('#dm-list .dm-existing').prepend(outterDiv);
    };
    
    const readDM = id => {
        
        return new Promise(function(success, fail) {
            
            let channel = client.channels.get(id);
            
            document.querySelectorAll('[selected]').forEach(s => s.removeAttribute('selected'));
            document.querySelector('#dm-list .dm-existing #channelid-'+channel.id).setAttribute('selected', '');
            
            if (channel)
                channel.fetchMessages({limit: 100}).then(messages => {
                    
                    console.log('fetched')
                    
                    for (let i = 0; messages.length > i; i++)
                        displayMessage(messages[i], id);
                    
                    console.log('displayed')

                    success({messages, channel});
                    
                }).catch(fail);
            else
                fail('Channel Not Found');
            
        });
    };
    
    const createDM = id => {
        
        return new Promise(async function(success, fail) {
            
            let user = await client.fetchUser(id);
            
            if (user)
                user.createDM().then(success).catch(fail);
            else
                fail('User Not Found');
            
        });
        
    };
    
    const start = () => {
        console.log('ready');
        
        let DMList = client.channels.filter(c => ['dm', 'group'].indexOf(c.type)+1);
        
        for (let i = 0; DMList.length > i; i++)
            displayDMChannel(DMList[i]);
        
        document.querySelector('#dm-list .dm-existing').addEventListener('click', e => {//read dm
            let id = null;
            for (let i = 0; e.path.length > i; i++) {
                if (e.path[i] === document.body)
                    i = e.path.length;
                else if (e.path[i].getAttribute('class') && e.path[i].getAttribute('class').split(' ').indexOf('dm-item')+1)
                    id = e.path[i].getAttribute('id').split(' ')[0].replace('channelid-', '');
            }

            console.log(id);
            if (id) {
                readDM(id).then(info => {
                    let {channel, messages} = info;
                    
                    Channel = channel;
                    
                    if (e.target.hasAttribute('class')) {
                        let classes = e.target.getAttribute('class').split(' ');
                        if (classes.indexOf('dm-newmessage')+1) {
                            classes.splice(classes.indexOf('dm-newmessage', 1));
                            e.target.setAttribute('class', classes.join(' '));
                        }
                    };
                    
                    document.querySelector('#dm-open .dm-openinner').setAttribute('id', 'openid-'+id);
                    document.querySelector('#dm-open .dm-openinner').innerHTML = '';
                    
                    
                }).catch(console.error);
            }
        });

        document.querySelector('#dm-list .dm-add span').addEventListener('click', e => {//add user
            if (document.querySelector('#dm-list .dm-add input').value) {
                createDM(document.querySelector('#dm-list .dm-add input').value).then(displayDMChannel);
                document.querySelector('#dm-list .dm-add input').value = '';
            }
        });
        
        client.on('message', message => {
            
            if (['dm', 'group'].indexOf(message.channel.type)+1 && message.author.id !== client.user.id) {
                
                let id = message.channel.id;
                
                let activeDM = document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && id === document.querySelector('#dm-open .dm-openinner').getAttribute('id').replace('openid-', '');
                
                if (activeDM)
                    displayMessage(message, id);
                else if (!document.getElementById('channelid-'+id))
                    displayDMChannel(message.channel);
                
                if (!activeDM || !windowActive) {
                    
                    if (!activeDM) {
                        console.log('channelid-'+message.author.id)
                        let DMInList = document.getElementById('channelid-'+message.channel.id),
                            classes = DMInList.getAttribute('class');
                        classes = classes.split(' ');
                        if (classes.indexOf('dm-newmessage')+1) {
                            classes.push('dm-newmessage');
                            DMInList.setAttribute('class', classes.join(' '));
                        }
                    }
                    
                    let notif = new Notification(message.author.username+'#'+message.author.discriminator, {
                        body: message.content,
                        icon: message.author.displayAvatarURL
                    });
                    
                    notif.onclick = () => {
                        console.log(activeDM, message.channel.id)
                        if (!activeDM) {
                            Channel = message.channel;
                            readDM(message.channel.id).then(info => {
                                let {messages} = info;
                            
                                let DMInList = document.querySelector('#channelid-'+message.channel.id);
                                if (DMInList.hasAttribute('class')) {
                                    let classes = DMInList.getAttribute('class').split(' ');
                                    if (classes.indexOf('dm-newmessage')+1) {
                                        classes.splice(classes.indexOf('dm-newmessage', 1));
                                        DMInList.setAttribute('class', classes.join(' '));
                                    }
                                }

                            }).catch(console.error);
                        }

                    };
                    
                }
                
            }
            
        });

        document.querySelector('#dm-open .dm-textbotcontain input.textbox').addEventListener('keydown', e => {
            if (document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && e.key === 'Enter') {
                
                if (Channel) {
                    
                    Channel.send(e.target.value).then(message => {
                        displayMessage(message);
                    });
                    
                    e.target.value = '';
                    
                }
                
            }
        });
        
    };

});
