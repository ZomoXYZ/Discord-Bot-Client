# Discord Bot Client

[Discord]'s client is great, but doesn't allow you to control a [Bot User] account.

## Archival

Between this likely being a breach of Discord's ToS and the fact that I haven't had any interest in pursuing this project, this project is now archived. Discord's api has changed so much since I started this, back when I started the audit log wasn't even a thing, and a whole rewrite would be necessary to accomodate those changes. On top of that, Discord appears to be pushing their interactions api a lot more than typical bot users, and I wouldn't be surprised if a future api update would cause this project to be impossible.

## About

### What this will let you do

With this application, you will be able to fully control your [Bot User] account, like sending people a DM.

### Disclaimer

This application is very Bare-Bones, and is not close to being complete, It is currently more of a "Proof of Concept".  I will keep working on this with more improvements and features to try to let this application run as close to the native Discord client as I can get.

### Recent Changes

* Converted everything from [Discordie] to [Discord.JS]

### Long-Term Plans

My end goal with this project is to create a client very similar to the native Discord client as I can.  ~~There are a few minor things I can not currently add to the app, such as the [Audit Log].  This app runs with [Discordie] as a base, and that framework does not yet support the [Audit Log].~~  I would also like to allow this app to have plugins so it can run bot commands as a Self-Bot would, but, because it is built into the program, it will run much quicker.

### Current Feature List

* Get a direct message list<sup>1,2</sup>
* Send and receive direct messages
* Notifications on a new message
* Add a user by ID or tag

<sup>1</sup>Discord itself does not store a direct message list for Bot Users, and so it will not show up

<sup>2</sup>In Kio's push, the bot automatically loads the DMs of the owners of servers.
### Immediate To-Do List

* Ability to/to show Edit/Delete messages
* Ability to show/send Images
* Ability to show/send Attachments
* Ability to infinitely scroll up to see past messages

### Known Issues

* You have to click on a certain part of the Direct Message in the list to mark it as read.
* There are no real error messages to let you know what is going on
* The visual design is bad
~~* Past messages will not load, I'm not sure what is causing this and whether it's a limitation with [Discord.JS] or a mistake I'm making~~ Fixed!

### What I Will Never Add

* Video Calling
  * Video calling requires the ability to call in a Direct Message, and bots can't call in a direct message

## Installation

You will need [`Node.JS`] for the program to run

1. Download this Git and extract it into a folder
2. Create a text file called `token.txt` (if u forget it will generate one and error needing you to rerun the script) and type your Bot User's token in the file
3. run `start.bat` to compile and run the program

## Usage

**To open a new DM**
Get the recipient's Discord ID or Username (a discriminator would help to make sure you select the correct person, but is not required) and enter it in the text box at the top left, then click "add"

**To Send a message**
Click on the recipient's name in the list to the left, type your message in the text box at the bottom, then click your "enter"/"return" key

[Discord]: https://discordapp.com
[Bot User]: https://discordapp.com/developers/docs/topics/oauth2#bot-vs-user-accounts
[Audit Log]: https://blog.discordapp.com/5-3-17-change-log-a9239d5321dd
[Discordie]: https://qeled.github.io/discordie/
[Discord.JS]: https://discord.js.org/#/
[Node.JS]: https://nodejs.org/en/
