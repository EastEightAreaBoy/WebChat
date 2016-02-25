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

//�����û�����
var numUsers = 0;
//�û����ļ��ϣ���ʵ�Ǹ�����
var users={};
//�û�socket�ļ��ϣ���ʵ�Ǹ�����
var userSocket={};

io.on('connection', function (socket) {
  var addedUser = false;
  console.log('-- user is online--');
  // when the client emits 'new message', this listens and executes
  //�㲥��Ϣ�¼�new message
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
	console.log('-- <new message> --'+socket.username+' : '+data);
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //���õ�¼�������ú���addedUserΪtrue
  socket.on('add user', function (username) {
	console.log('-- <add user> --before if '+username);
    if (addedUser) return;
	console.log('-- <add user> --after if '+username);

    // we store the username in the socket session for this client
	//�洢��¼���û���username��socket��.
    ++numUsers;
	addedUser = true;
	socket.username = username;
	//��¼���û���ӵ��б���
	users[username] = username;
	userSocket[username] = socket;
	console.log('-- username: ['+ username +'] userNumbers: '+ numUsers);
	console.log('-- server send login for client include {numUsers: numUsers , online: users}');
    //�����û�����login�¼���1.�����û�������2�����������û������Ƽ��ϡ�.
	socket.emit('login', {
      numUsers: numUsers,
	  online:users
    });
    // echo globally (all clients) that a person has connected
	//---�����������ߵ���.
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers,
	  online:users
    });
  });
  //���û����������ʱ�򴥷�typing�¼�
  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });
  //���û�ֹͣ�����ʱ�򴥷�stop typing�¼�
  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  //˽��
  socket.on('speak someone', function(onename) {
	console.log('-- <speak someone>--'+onename+'--message: '+data);
	userSocket[onename].emit('speak someone', {
      username: socket.username,
      message: data
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
	  var name = socket.username;
	  console.log('-- user logout --');
	  console.log('-- userSocket[name] --'+name+'  '+userSocket[name]);
	  //console.log('-- userSocket[].length()��'+userSocket.size);
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
