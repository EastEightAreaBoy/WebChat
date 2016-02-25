// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

//在线用户数量
var numUsers = 0;
//用户名的集合（其实是个对象）
var users={};
//用户socket的集合（其实是个对象）
var userSocket={};

io.on('connection', function (socket) {
  var addedUser = false;
  console.log('-- user is online--');
  // when the client emits 'new message', this listens and executes
  //广播信息事件new message
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
	console.log('-- <new message> --'+socket.username+' : '+data);
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //私聊
  socket.on('private chat', function(msgPackage) {
	console.log('-- <private chat>--from--'+socket.username+'-- to --'+msgPackage.toname+'--message: '+msgPackage.data);
	//console.dir(userSocket[msgPackage.toname]);
	userSocket[msgPackage.toname].emit('new message',{
      username: socket.username,
      message: '---------------测试信息------------------'
    });
	console.log('--private chat--');
	userSocket[msgPackage.toname].emit('private chat',{
		fromname: socket.username,
		toname: msgPackage.toname,
		message: msgPackage.data
	});
  });

  
  //设置登录名，设置后置addedUser为true
  socket.on('add user', function (username) {
	console.log('-- <add user> --before if '+username);
    if (addedUser) return;
	console.log('-- <add user> --after if '+username);

    // we store the username in the socket session for this client
	//存储登录的用户名username在socket中.
    ++numUsers;
	addedUser = true;
	socket.username = username;
	//登录的用户添加到列表中
	users[username] = username;
	userSocket[username] = socket;
	console.log('-- username: ['+ username +'] userNumbers: '+ numUsers);
	console.log('-- server send login for client include {numUsers: numUsers , online: users}');
    //给此用户发送login事件【1.在线用户数量，2，所有在线用户的名称集合】.
	socket.emit('login', {
      numUsers: numUsers,
	  online:users
    });
    // echo globally (all clients) that a person has connected
	//---发送所有在线的人.
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers,
	  online:users
    });
  });
  //当用户正在输入的时候触发typing事件
  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });
  //当用户停止输入的时候触发stop typing事件
  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });


  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
	  var name = socket.username;
	  console.log('-- user logout --');
	  console.log('-- userSocket[name] --'+name+'  '+userSocket[name]);
	  //console.log('-- userSocket[].length()：'+userSocket.size);
	  delete userSocket[name];
	  delete users[name];
      // echo globally that this client has left
	  console.log('-- send all <user left> --');
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
