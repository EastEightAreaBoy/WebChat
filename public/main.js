
  
$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  
  //our
  var $userTitle = $('.chatArea div');
  var chatType = "all";//聊天的对象
  
  var socket = io();
  
  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "当前在线用户数 ：1";
    } else {
      message += "当前在线用户数 ：" + data.numUsers;
    }
    log(message);
	//更新列表信息
	updateUsersList(data);
  }
  
  
  //更新在线用户列表信息
  function updateUsersList (data){
	var ulist='';
	$('.usesList').text("");
	for(user in data.online) {
		console.log('在线用户：'+user);
		$('.usesList').append(" <li><a href='javascript:void(0);' skid='"+user+"'>"+user+"<a/></li>");
	}
	$('.usesList').append(" <li><a href='javascript:void(0);' skid='all'>群发<a/></li>");
	
	//为li添加监听事件
	 var preUser=null;
	$(".usesList li a").click(function(){
		if(preUser!=null){
			$(preUser).css("color","blue");
		}
		preUser=$(this);
	    $(preUser).css("color","#a8f07a");
		
		//修改聊天的对象
		chatType = $(this).attr("skid").trim();
		console.log('-- 当前聊天的对象 chatType --'+chatType);
	});
  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
	  //---------显示登录的用户的账户名-----------
	  $userTitle.text('当前登录的用户是：'+username);
	  
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  //以广播的形式发送消息
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      
	  if(chatType != 'all'){
		console.log('-- 私聊 -- （'+username+'）to（'+chatType+'） --' + message);
		socket.emit('private chat', {
			toname:chatType,
			data:message
		});
	  }else{
		console.log('-- 广播 -- （'+username+'）' + message);
		//告诉所有在线的用户去触发new message的事件，传递发送的信息。
		socket.emit('new message', message);
	  }
	  // tell server to execute 'new message' and send along one parameter
      //socket.emit('new message', message);
    }
  }
  
  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .html(showEmoji(data.message));

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "欢迎来到 WebChat";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
//更新列表信息
//	updateUsersList(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });
  
  //私聊
  socket.on('private chat', function(priPackage) {
	 //console.dir(priPackage);
	 console.log('-- 私聊信息添加 --<private chat>--'+priPackage.message);
	 var data = {
		username: priPackage.username+' (私聊)',
		message: priPackage.message
	 };
	 addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });
  
  initemoji();
  
  //表情事件监听
  $('#emoji').click(function (){
	  var temp = $('#emojiWrapper').css('display');
	  //console.log(temp);
	  if(temp != 'none'){
		  $('#emojiWrapper').css('display','none');
	  }else {
		  $('#emojiWrapper').css('display','block');
	  }
  });
  
  //初始化表情
  function initemoji() {
    var emojiContainer = document.getElementById('emojiWrapper'),
  	  docFragment = document.createDocumentFragment();
    for (var i = 1; i <= 69; i++) {
  	  var emojiItem = document.createElement('img');
  	  emojiItem.src = 'Images/emoji/' + i + '.gif';
  	  emojiItem.title = i;
  	  docFragment.appendChild(emojiItem);
  	  //console.log(emojiItem.src);
    };
    emojiContainer.appendChild(docFragment);
  };
  
  //当鼠标点击到其他地方的时候隐藏表情集合
  document.body.addEventListener('click', function(e) {
  	var emoji = document.getElementById('emoji');
  	console.log('隐藏表情集合有效点击元素：');
  	console.dir(emoji);
  	console.log('鼠标点击的是：');
  	console.dir(e.target);
  	if (e.target != emoji) {
  		document.getElementById('emojiWrapper').style.display = 'none';
  	};
  });
  
  document.getElementById('emojiWrapper').addEventListener('click', function(e) {
    var target = e.target;
    if (target.nodeName.toLowerCase() == 'img') {
        var messageInput = $('.inputMessage');
        messageInput.focus();
	 var values = messageInput.val();
	 if(typeof values == 'undefined'){
	messageInput.val('[emoji:' + target.title + ']');			  
	 }else{
	messageInput.val(values + '[emoji:' + target.title + ']');
	 }
    };
  }, false);
  
  function showEmoji(msg) {
    var match, result = msg,
        reg = /\[emoji:\d+\]/g,
        emojiIndex,
        totalEmojiNum = document.getElementById('emojiWrapper').children.length;
    while (match = reg.exec(msg)) {
        emojiIndex = match[0].slice(7, -1);
        if (emojiIndex > totalEmojiNum) {
            result = result.replace(match[0], '[X]');
        } else {
            result = result.replace(match[0], '<img class="emoji" src="./Images/emoji/' + emojiIndex + '.gif" />');//todo:fix this in chrome it will cause a new request for the image
        };
    };
    return result;
  }
});


