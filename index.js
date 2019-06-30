const ipc = require('electron').ipcRenderer,
      Discord = require('discord.js'),
      client = new Discord.Client(),
      mentionRegex = /<(@|@!|@&|#)(\d{17,19})>/gi;

let Channel = null;

/*const get = { // ready for other commands that I have laying around but aren't needed until guild support
    user: user => {
        user = user.trim();
        if (/^<@!{0,1}\d{16,18}>$/.test(user)) user = user.replace(/^<@!{0,1}|>$/g, '');

        //if "user" is an id, check for id
        //  otherwise if there's a discriminator then check for both the name and discriminator
        //  otherwise check for just the name
        //      m = each user
        var mFunc = /^\d{16,18}$/.test(user) ? m => m.id === user : (user.match(/#\d{4}$/) ? m => {
            var reg = new RegExp('^'+user.toLowerCase().replace(/#\d{4}$/, '').replace(/[^a-z0-9]/g, '')+user.match(/#\d{4}$/)[0], 'i');
            return reg.test(m.username.toLowerCase().replace(/[^a-z0-9]/g, '')+'#'+m.discriminator) || reg.test((m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, '')+'#'+m.discriminator);
        } : m => {
            var reg = new RegExp('^'+user.toLowerCase().replace(/[^a-z0-9]/g, ''), 'i');
            return reg.test(m.username.toLowerCase().replace(/[^a-z0-9]/g, '')) || reg.test((m.nickname || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
        }),
            m = client.users.filter(mFunc).array();
        return m && m.length ? m[0] : null;
    }
};*/

addEventListener('load', () => {

    let windowActive = document.hidden;
    addEventListener("focus", () => windowActive = true);
    addEventListener("blur", () => windowActive = false);

    ipc.on('token', (event, arg) => {
        client.on('ready', start);
        //TODO: Fix this! Either FS is fucking up the string from ./token.txt, or I'm stupid.
        //WORKAROUND: Place token directly here.
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
    };

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
        if (!document.querySelector('#channelid-'+channel.id)) {
            let outterDiv = document.createElement('div'),
                innerImg = document.createElement('img'),
                innerSpan = document.createElement('span'),
                titleSpan = document.createElement('span'),
                recipientsSpan = document.createElement('span');

            let info = {};

            if (channel.type === 'group')
                info = {
                    icon: channel.iconURL,
                    name: channel.name,
                    length: channel.recipients.toArray().length
                };
            else
                info = {
                    icon: channel.recipient.avatarURL,
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
        }

        readDM(channel.id).then(info => {
            let {messages} = info;

            let DMInList = document.querySelector('#channelid-'+channel.id);
            if (DMInList.hasAttribute('class')) {
                let classes = DMInList.getAttribute('class').split(' ');
                if (classes.includes('dm-newmessage')) {
                    classes.splice(classes.indexOf('dm-newmessage'), 1);
                    DMInList.setAttribute('class', classes.join(' '));
                }
            }

            document.querySelector('#dm-open .dm-openinner').setAttribute('id', 'openid-'+channel.id);
            document.querySelector('#dm-open .dm-openinner').innerHTML = '';
            messages.forEach(msg => {
                let outterDiv = document.createElement('div'),
                    innerImg = document.createElement('img'),
                    innerSpan = document.createElement('span'),
                    namedateSpan = document.createElement('span'),
                    nameSpan = document.createElement('span'),
                    dateSpan = document.createElement('span'),
                    messageSpan = document.createElement('span');


                outterDiv.setAttribute('id', 'messageid-' + msg.id);
                outterDiv.setAttribute('class', 'dm-message');

                innerImg.setAttribute('src', msg.author.displayAvatarURL);
                innerImg.setAttribute('class', 'dm-icon');

                innerSpan.setAttribute('class', 'dm-text');

                namedateSpan.setAttribute('class', 'dm-namedate');

                nameSpan.textContent = msg.author.username;
                nameSpan.setAttribute('class', 'dm-name');
                nameSpan.setAttribute('id', 'userid-' + msg.author.id);

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

                document.getElementById('openid-' + msg.channel.id).append(outterDiv);
            });
            console.log('displayed')

        }).catch(console.error);
    };

    const readDM = id => {

        return new Promise(function(success, fail) {

            let channel = client.channels.get(id);
            document.querySelector(".username").innerHTML = channel.recipient.username;
            document.querySelectorAll('[selected]').forEach(s => s.removeAttribute('selected'));
            document.querySelector('#dm-list .dm-existing #channelid-'+channel.id).setAttribute('selected', '');

            if (channel)
                channel.fetchMessages({limit: 100}).then(messages => {

                    messages = messages.array();

                    console.log('fetched for channel ' + channel.id);
                    document.querySelector('#dm-list .dm-existing').addEventListener('click', e => {
                        if (e.target.hasAttribute('class')) {
                            let classes = e.target.getAttribute('class').split(' ');
                            if (classes.includes('dm-newmessage')) {
                                classes.splice(classes.indexOf('dm-newmessage'), 1);
                                e.target.setAttribute('class', classes.join(' '));
                            }
                        }
                    });

                    document.querySelector('#dm-open .dm-openinner').setAttribute('id', 'openid-' + id);
                    document.querySelector('#dm-open .dm-openinner').innerHTML = '';

                    messages.reverse().forEach(msg => {
                        displayMessage(msg);
                    });

                    console.log('displayed');
                    success({messages, channel});

                }).catch(fail);
            else
                fail('Channel Not Found');

        });
    };

    const createDM = id => {

        return new Promise(async function(success, fail) {
            let user = client.users.get(String(id));
            if (user)
                user.createDM().then(success).catch(fail);
            else
                fail('User Not Found');

        });

    };


    const start = () => {
        console.log('ready');

        client.guilds.forEach(guild => {
            let user = client.users.get(guild.ownerID);
            if (typeof user !== 'undefined') {
                user.createDM().then((channel) => {
                    displayDMChannel(channel);
                    readDM(channel.id)
                })
            }
        });

        let DMList = client.channels.filter(c => ['dm', 'group'].includes(c.type));

        DMList.forEach((list) => {
            displayDMChannel(list)
        });
        document.querySelector('#dm-list .dm-existing').addEventListener('click', e => {//read dm
            let id = null;
            e.path.every((path) => {
                  if (path === document.body)
                      return false;
                  else if (path.getAttribute('class') && path.getAttribute('class').split(' ').includes('dm-item'))
                        id = path.getAttribute('id').split(' ')[0].replace('channelid-', '');
            });

            if (id) readDM(id).catch(console.error);
        });

        const addUserFromInput = () => {//add user
            if (document.querySelector('#dm-list .dm-add input').value) {
                let id = document.querySelector('#dm-list .dm-add input').value;
                if (typeof id === 'string') id = client.users.find('tag', id).id;
                createDM(id).then(displayDMChannel);
                document.querySelector('#dm-list .dm-add input').value = '';
            }
        };
        document.querySelector('#dm-list .dm-add span').addEventListener('click', addUserFromInput);
        document.querySelector('#dm-list .dm-add input').addEventListener('keypress', e => {
            if (e.code === 'Enter')
                addUserFromInput();
        });

        client.on('message', message => {

            if (['dm', 'group'].includes(message.channel.type) && message.author.id !== client.user.id) {

                let id = message.channel.id;

                let activeDM = document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && id === document.querySelector('#dm-open .dm-openinner').getAttribute('id').replace('openid-', '');

                if (activeDM)
                    displayMessage(message, id);
                else if (!document.getElementById('channelid-'+id))
                    displayDMChannel(message.channel);

                if (!activeDM || !windowActive) {

                    if (!activeDM) {
                        console.log('channelid-' + message.author.id);
                        let DMInList = document.getElementById('channelid-'+message.channel.id),
                            classes = DMInList.getAttribute('class');
                        classes = classes.split(' ');
                        if (classes.includes('dm-newmessage')) {
                            classes.push('dm-newmessage');
                            DMInList.setAttribute('class', classes.join(' '));
                        }
                    }

                    let notif = new Notification(message.author.username+'#'+message.author.discriminator, {
                        body: message.content,
                        icon: message.author.displayAvatarURL
                    });

                    notif.onclick = () => {
                        console.log(activeDM, message.channel.id);
                        if (!activeDM) {
                            Channel = message.channel;
                            readDM(message.channel.id).catch(console.error);
                        }

                    };

                }

            }

        });

        document.querySelector('#dm-open .dm-textboxcontain input.textbox').addEventListener('keydown', e => {
            if (document.querySelector('#dm-open .dm-openinner').hasAttribute('id') && e.key === 'Enter') {
                Channel = client.channels.get(document.querySelector(".dm-openinner").id.replace("openid-", ""));
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
