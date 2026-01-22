let socket; 
        
function joinChat() {
  const profileData = JSON.parse(sessionStorage.getItem('profileData'));
  const token = sessionStorage.getItem('jwt');
  
  if (profileData && token) {

    socket = io('http://localhost:5000', {
      auth: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      
      socket.emit('join', {
        room: 'general' 
      });
    
      setupTypingDetection();
      // Listen for online status confirmation
      socket.on('user:online_confirmed', (data) => {
        console.log('✅ User online confirmed:', data);
      });
    });

    // ============ MESSAGE HANDLERS ============
    socket.on("chat:receive_private", (message) => {
      console.log("📩 New private message:", message);
      // You can update UI here, e.g. add message to chat window
      appendMessage(message.sender, message, false);
    });

    socket.on("chat:receive_group", (message) => {
      console.log("📩 New group message:", message);
      // You can update UI here, e.g. add message to chat window
      appendMessage(message.chat, message, false, true);
    });

    // ============ ONLINE STATUS HANDLERS ============
    socket.on("chat:user_online_status", (data) => {
      console.log("📡 Online status received:", data);
      const { userId, isOnline, connections, timestamp } = data;
      
      console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'} (${connections} connections)`);
      
      // Update UI to reflect user's online status
      updateUserOnlineStatus(userId, isOnline);
    });

    socket.on("chat:user_status_changed", (data) => {
      console.log("🔄 Friend status changed:", data);
      const { userId, isOnline } = data;
      
      // This is for when friends come online/offline
      updateUserOnlineStatus(userId, isOnline);
      
      // You can also show notifications
      if (isOnline) {
        showNotification(`${getUserName(userId)} is now online`);
      } else {
        showNotification(`${getUserName(userId)} is now offline`);
      }
    });
    // ============ TYPING INDICATORS HANDLERS ============
    socket.on("chat:typing_indicator", (data) => {
        console.log("⌨️ Typing indicator:", data);
        const { chatId, user, chatType, isTyping } = data;

        if (isTyping) {
            showTypingIndicator(user, chatId, chatType);
        } else {
            console.log("Hiding typing indicator for user:", user, "in chat:", chatId, "of type:", chatType);
            hideTypingIndicator(user, chatId, chatType);
        }
    });
    socket.on("chat:typing_users_list", (data) => {
        console.log("📝 Current typing users:", data);
        updateTypingUsersList(data.chatId, data.typingUsers);
    });

    // ============ ERROR HANDLERS ============
    socket.on('chat:error', (error) => {
      console.error('Chat error:', error.message);
      showNotification(`Error: ${error.message}`, 'error');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      if (error.message.includes('Authentication')) {
        console.log('Please log in again');
        // Token expired veya invalid ise login sayfasına yönlendir
        sessionStorage.removeItem('profileData');
        sessionStorage.removeItem('jwt');
        window.location.href = '/login';
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

  } else {
    console.log("Token is missing. Please log in first.");
    window.location.href = '/login';
  }
}

async function isFriendOnline(friendId) {
  console.log('🔍 Checking online status for friendId:', friendId);
  
  return new Promise((resolve, reject) => {
    // Add timeout for the response
    const timeout = setTimeout(() => {
      reject('Timeout: No response from server');
    }, 5000);

    // Emit the event - note the parameter name should be 'userId' not 'friendId'
    socket.emit('chat:is_online', { userId: friendId });

    // Listen for the response (since we're not using callbacks, we listen for the event)
    const handleResponse = (data) => {
      if (data.userId === friendId) {
        clearTimeout(timeout);
        socket.off('chat:user_online_status', handleResponse);
        console.log(`✅ Online status for ${friendId}:`, data.isOnline);
        resolve(data.isOnline);
      }
    };

    socket.on('chat:user_online_status', handleResponse);
  });
}

async function checkFriendsOnlineStatus(friends) {
  console.log('🔍 Checking online status for friends:', friends.map(f => f._id));
  
  const results = [];
  
  for (const friend of friends) {
    try {
      const isOnline = await isFriendOnline(friend._id);
      results.push({
        ...friend,
        isOnline: isOnline,
        lastChecked: new Date().toISOString()
      });
      console.log(`✅ Online status for ${friend.name} (${friend._id}):`, isOnline);
    } catch (error) {
      console.error(`❌ Failed to check online status for ${friend.name}:`, error);
      results.push({
        ...friend,
        isOnline: null, // null indicates error
        lastChecked: new Date().toISOString(),
        error: error.message
      });
    }
  }
  
  return results;
}

function updateUserOnlineStatus(userId, isOnline) {
  const currentRecipient = sessionStorage.getItem('recipient') ? sessionStorage.getItem('recipient') : null;
  const userStatusElem = document.getElementById(`chat-user-status`);
  const userElem = document.getElementById(`user-${userId}`);

  let userImageElem = null;
  if (userElem) {
    userImageElem = userElem.querySelector('.friend-profile-image');
  }

  if (userStatusElem && userId === currentRecipient) {
    userStatusElem.style.display = 'flex';
    userStatusElem.textContent = isOnline ? 'Online' : 'Offline';
    userStatusElem.style.color = isOnline ? '#43e97b' : '#bfc9d1';
  }

  if (userImageElem) {
    userImageElem.style.borderColor = isOnline ? '#43e97b' : '#00bcd4';
  }
}

function checkUsersOnlineStatus(userIds) {
  userIds.forEach(userId => {
    socket.emit('chat:is_online', { userId: userId });
  });
}

async function displayFriendStatus(friendId) {
  try {
    const isOnline = await isFriendOnline(friendId);
    console.log(`Friend ${friendId} is ${isOnline ? 'online' : 'offline'}`);
    updateUserOnlineStatus(friendId, isOnline);
    return isOnline;
  } catch (error) {
    console.error('Error checking friend status:', error);
    updateUserOnlineStatus(friendId, false); // Assume offline on error
    return false;
  }
}

function showNotification(message, type = 'info') {
  // Implement your notification system
  console.log(`🔔 ${type.toUpperCase()}: ${message}`);
}

function getUserName(userId) {
  // Implement getting user name from your data
  return `User ${userId}`;
}
function sendMessage() {
  const clickedElementType = sessionStorage.getItem('clickedElementType');
  const messageInput = document.getElementById('message-input');
  const recipient = sessionStorage.getItem('recipient');
  const message = messageInput.value.trim();
  if (clickedElementType === 'friend') { 
  if (recipient && message) {
    socket.emit('chat:send_private', { 
      recipient: recipient, 
      content: message,
      messageType: 'text' // or MESSAGE_TYPES.TEXT if you have that constant defined
    }, (response) => {
      if (response && response.error) {
        console.error('Failed to send message:', response.message);
        // Handle error (show user notification, etc.)
      } 
    });
      console.log('Message sent successfully');
      // Optionally append the message to the UI immediately for instant feedback
      appendMessage(recipient, { 
        from: 'Me', 
        content: message, 
        messageType: 'text',
        timestamp: new Date()
      }, true);
    messageInput.value = '';
  }
} else if (clickedElementType === 'group') {
  socket.emit('chat:send_group', { 
    groupId: recipient, // Assuming you store current group ID
    content: message,
    messageType: 'text' // or MESSAGE_TYPES.TEXT if you have that constant defined
  }, (response) => {
      if (response && response.error) {
          console.error('Failed to send message:', response.message);
          // Handle error (show user notification, etc.)
        } 
      });
      console.log('Group message sent successfully');
      // Optionally append the message to the UI immediately for instant feedback
      appendMessage(recipient, { 
        from: 'Me', 
        content: message, 
        messageType: 'text',
        timestamp: new Date()
      }, true);
    
      messageInput.value = '';
} else {
    console.error('No chat selected');
    // Show error to user
}
}
                
function appendMessage(chatUser, messageData, isMyMessage, isGroup = false) {
  const chatBox = document.getElementById(`chatbox-${chatUser}`);
  
  if (!chatBox) {
    console.error(`Chatbox : chatbox-${chatUser}`);
    return;
  }
  if (!isMyMessage && document.getElementById(`message-${messageData._id}`)) {
    console.log('Message already exists in the chat box');
    return; 
  }
  let friend = { name: 'Unknown' };

  if (!isMyMessage && !isGroup) {
    const chatData = JSON.parse(sessionStorage.getItem('chatData'));
    friend = chatData.friends.find(f => f._id === chatUser);
  } else if (!isMyMessage && isGroup) {
    const chatData = JSON.parse(sessionStorage.getItem('chatData'));
    friend = chatData.friends.find(f => f._id === messageData.sender);
  }
  const updatedMessageData = { ...messageData, isRead: true };

  const messageElement = document.createElement('div');
  messageElement.id = `message-${updatedMessageData._id}`;
  messageElement.classList.add(isMyMessage ? 'my-message' : 'other-message');

  const strongElement = document.createElement('strong');
  strongElement.className = isMyMessage ? 'my-message-name' : 'other-message-name';
  if (isGroup && !isMyMessage) {
    strongElement.textContent = `${friend.email}`;
  } else if (!isGroup && !isMyMessage) {
    strongElement.textContent = `${friend.name}`;
  } else {
    strongElement.textContent = 'Me';
  }

  const messageText = document.createElement('p');
  messageText.appendChild(strongElement);
  messageText.appendChild(document.createTextNode(` ${updatedMessageData.content}`));

  messageElement.appendChild(messageText);
  chatBox.appendChild(messageElement);
  
  chatBox.scrollTop = chatBox.scrollHeight; 
  const recipient = sessionStorage.getItem('recipient');
  if (!isMyMessage && recipient && recipient === chatUser) {
    socket.emit('chat:mark_read', { messageId: updatedMessageData.id }, (response) => {
      if (response && response.error) {
        console.error('Failed to mark message as read:', response.message);
      } else {
        console.log('Message marked as read');
      }
    });
    
  } else if (!isMyMessage) {
    const userChat = document.getElementById(`user-${chatUser}`);
    const groupChat = document.getElementById(`group-${chatUser}`);
    if (userChat) {
      let unreadCountElem = userChat.querySelector('.unread-count');
      if (!unreadCountElem) {
        unreadCountElem = document.createElement('div');
        unreadCountElem.className = 'unread-count';
        unreadCountElem.textContent = 0;
        userChat.appendChild(unreadCountElem);
      }

      let count = parseInt(unreadCountElem.textContent) || 0;
      count += 1;
      unreadCountElem.textContent = count;
    } else if (groupChat) {
      let unreadCountElem = groupChat.querySelector('.unread-count');
      if (!unreadCountElem) {
        unreadCountElem = document.createElement('div');
        unreadCountElem.className = 'unread-count';
        unreadCountElem.textContent = 0;
        groupChat.appendChild(unreadCountElem);
      }

      let count = parseInt(unreadCountElem.textContent) || 0;
      count += 1;
      unreadCountElem.textContent = count;
    }
  }
}

function joinGroupsToSockets(groups) {
  if (!Array.isArray(groups)) return;
  groups.forEach(group => {
    if (group && group._id) {
      socket.emit('join_group', group._id); 
      console.log(`Joined group_${group._id}`);
    }
  });
}
