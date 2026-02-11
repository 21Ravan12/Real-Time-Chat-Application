function toggleLeftContainer() {
    const button = document.querySelector('.toggle-btn');
    const leftContainer = document.querySelector(".left-container");
    const chatContainer = document.getElementById("chat-container");
    
    // Sadece CSS sınıflarını değiştir
    button.classList.toggle('rotated');
    leftContainer.classList.toggle("open-tggl");
    chatContainer.classList.toggle("close-tggl");
    
    // Button'un open sınıfını değiştir
    button.classList.toggle('open');
    
    // Pozisyon CSS transition ile otomatik halledilsin
    // CSS'de: .toggle-btn.open { left: calc(75vw - 4px); }
}

function updateProfileUI(data) {
    sessionStorage.setItem('username', data.name);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('_id', data._id);
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';
    const profileImageElement = document.getElementById('profileImage');
    if (profileImageElement) {
        profileImageElement.onerror = function() {
            this.src = defaultAvatar;
            this.onerror = null;
        };
        
        profileImageElement.src = `${data.avatar}` || defaultAvatar;
    }
}

function updateAccountProfileUI(data) {
    if (!data) return;
    const profileImageAccountElement = document.getElementById('profileImageAccount');
    const nameAccountElement = document.getElementById('nameAccount');
    const emailAccountElement = document.getElementById('emailAccount');
    const bioAccountElement = document.getElementById('bioAccount');
    // Base64 placeholder for profile image
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';

    // Profile image with error handling
    const profileImageElement = document.getElementById('profileImageAccount');
    if (profileImageElement) {
        profileImageElement.onerror = function() {
            this.src = defaultAvatar;
            this.onerror = null;
        };
        profileImageElement.src = `${data.avatar}` || defaultAvatar;
    }

    nameAccountElement.textContent = data.username || 'No Name';
    emailAccountElement.textContent = data.email || 'No Email';
    bioAccountElement.textContent = data.bio || 'No Bio';

}

async function fetchChatData(Allow) {
    try {
        if (false) {
            const savedFriendsData = sessionStorage.getItem('chatData');
            if (savedFriendsData) {
                console.log("Friends data loaded from sessionStorage.");
                const data = JSON.parse(savedFriendsData);
                updateLeftContainer(data);
                return; 
            } else {
                fetchChatData(false);
                return;
            }
        }

        const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

        const responseFriends = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/friends`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            }
        });

        const responseFriendsRequests = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/friends/requests`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            }
        });

        const responseGroups = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/groups`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            }
        });


        if (!responseFriends.ok && !responseGroups.ok && !responseFriendsRequests.ok) {
            throw new Error('Network response was not ok');
        }

        const friendsData = await responseFriends.json();
        const groupsData = await responseGroups.json();
        const friendsRequestsData = await responseFriendsRequests.json();

        const data = {
            friends: friendsData.data || [],
            groups: groupsData.data || [],
            friendsRequests: friendsRequestsData.data || []
        };
        sessionStorage.setItem('chatData', JSON.stringify(data));
        await joinGroupsToSockets(data.groups);

        console.log('Fetched friends data:', data);
        updateLeftContainer(data);

    } catch (error) {
        console.error('Error fetching friends data:', error);
        document.getElementById('errorMessage').textContent = 'Failed to load friends data. Please try again later.';
    }
}

async function updateLeftContainer(data) {
    console.log('Updating friends list with data:', data);
    const user_list = document.querySelector('.lower-component');
    if (user_list) {
        user_list.innerHTML = '';
    }

    if (data.friendsRequests && data.friendsRequests.length > 0) {
        console.log('Adding friend requests to the list.');
    
        const user_list = document.querySelector('.lower-component');
    
        if (user_list) {
            
            let count = data.friendsRequests.length;
            for (let index = 0; index < count; index++) {
                console.log('Processing friend request:', index);
                const friendRequest = data.friendsRequests[index];
                const user = friendRequest.sender._id === sessionStorage.getItem('_id') ? friendRequest.receiver : friendRequest.sender; 
                
                const requestDiv = document.createElement('div');
                requestDiv.setAttribute('_id', user._id); 
                requestDiv.className = 'user friend-request';
                requestDiv.id = `friend-request-${user._id}`;
                
                const profileImageDiv = document.createElement('div');
                profileImageDiv.className = 'friend-profile-image';
                
                const defaultProfilePlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';
                profileImageDiv.style.backgroundImage = `url(${defaultProfilePlaceholder})`;
                
                if (user.avatar) { 
                    const img = new Image();
                    const imageUrl = user.avatar.startsWith('http') ? user.avatar : `${user.avatar}`;
                    img.onload = function() {
                        profileImageDiv.style.backgroundImage = `url(${imageUrl})`;
                    };
                    img.onerror = function() {
                        console.log('Profile picture could not be uploaded:', user.avatar);
                    };
                    img.src = imageUrl;
                }
                
                const nameDiv = document.createElement('div');
                nameDiv.textContent = user.username || user.email; 
                nameDiv.setAttribute('_id', user._id);
                nameDiv.className = 'friend-name friend-request';
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'friend-request-actions';
                
                const acceptBtn = document.createElement('button');
                acceptBtn.textContent = '✓';
                acceptBtn.className = 'request-accept';
                acceptBtn.onclick = function(e) {
                    e.stopPropagation();
                    acceptFriendRequest(friendRequest._id); 
                };
                
                const rejectBtn = document.createElement('button');
                rejectBtn.textContent = '✗';
                rejectBtn.className = 'request-reject';
                rejectBtn.onclick = function(e) {
                    e.stopPropagation();
                    rejectFriendRequest(friendRequest._id); 
                };
                
                actionsDiv.appendChild(acceptBtn);
                actionsDiv.appendChild(rejectBtn);
                
                requestDiv.appendChild(profileImageDiv);
                requestDiv.appendChild(nameDiv);
                requestDiv.appendChild(actionsDiv);
                
                user_list.appendChild(requestDiv);
            }
            
        }
    } else {
        console.log('No friend requests to display.');
    }

    if (data.friends && data.friends.length > 0) {
        const user_list = document.querySelector('.lower-component');
        checkFriendsOnlineStatus(data.friends);

        let count = data.friends.length;
        for (let index = 0; index < count; index++) {
            const friend = data.friends[index];

            const activityDiv = document.createElement('div');
            activityDiv.setAttribute('_id', friend._id);
            activityDiv.className = 'user friend-selected';
            activityDiv.id = `user-${friend._id}`;

            // Create Profile Image Div
            const profileImageDiv = document.createElement('div');
            profileImageDiv.className = 'friend-profile-image';

            // Base64 encoded placeholder (gri daire şeklinde)
            const defaultProfilePlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';

            profileImageDiv.style.backgroundImage = `url(${defaultProfilePlaceholder})`;

            if (friend.profileImage) {
                const img = new Image();
                // If the server returns a path starting with '/', prefix the backend origin
                const imageUrl = friend.profileImage.startsWith('http') ? friend.profileImage : `${friend.profileImage}`;
                img.onload = function() {
                    // Use backgroundImage for divs instead of src
                    profileImageDiv.style.backgroundImage = `url(${imageUrl})`;
                };
                img.onerror = function() {
                    console.log('Profil resmi yüklenemedi:', friend.profileImage);
                };
                img.src = imageUrl;
            }

            profileImageDiv.onclick = function () {
                event.stopPropagation(); // prevent handleUserClick
                openFriendDetail(friend);
            }

            // Create and set the friend's name
            const nameDiv = document.createElement('div');
            nameDiv.textContent = friend.name; // Friend's name

            nameDiv.setAttribute('_id', friend._id);
            nameDiv.className = 'friend-name friend-selected';

            const unReadCount = document.createElement('div');
            unReadCount.textContent = friend.unreadCount; 

            unReadCount.setAttribute('_id', friend._id);
            unReadCount.className = 'unread-count';

            // Create the main container
            const typingDots = document.createElement('span');
            typingDots.className = 'typing-dots';
            typingDots.style.display = 'none'; // Initially hidden
            typingDots.style.marginLeft = `auto`;

            // Create 3 dot spans
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                dot.textContent = '•';
                typingDots.appendChild(dot);
            }

            // Append the profile image and name to the user div
            activityDiv.appendChild(profileImageDiv);
            activityDiv.appendChild(nameDiv);
            if (friend.unreadCount!==0) {
                activityDiv.appendChild(unReadCount);
            }
            activityDiv.appendChild(typingDots);

            activityDiv.addEventListener('click', handleUserClick);
            unReadCount.addEventListener('click', handleUserClick);
            nameDiv.addEventListener('click', handleUserClick);

            // Append the user div to the user list
            user_list.appendChild(activityDiv);

            let chatBox = document.getElementById(`chatbox-${friend._id}`);
            if (!chatBox) {
              chatBox = document.createElement('div');
              chatBox.classList.add('chat-box');
              chatBox.style.display = 'none'; 
              chatBox.id = `chatbox-${friend._id}`;

              const container = document.getElementById('chat-container');
              if (!container) {
                console.error('Chat container bulunamadı.');
                return;
              }

              container.prepend(chatBox);
            }

        }
    } else {
        console.error('No friends data found.');
    }

    if (data.groups && data.groups.length > 0) {
        const user_list = document.querySelector('.lower-component');

        let count = data.groups.length;
        for (let index = 0; index < count; index++) {
        const group = data.groups[index];
        const activityDiv = document.createElement('div');
        activityDiv.setAttribute('_id', group._id);
        activityDiv.className = 'user group-selected';
        activityDiv.id = `group-${group._id}`;

        // Create Profile Image Div
        const profileImageDiv = document.createElement('div');
        profileImageDiv.className = 'friend-profile-image';

        // Base64 encoded group placeholder
        const defaultGroupPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzUiIHI9IjEwIiBmaWxsPSIjZGRkIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzMCIgcj0iOCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjcwIiBjeT0iMzUiIHI9IjEyIiBmaWxsPSIjZGRkIi8+PHBhdGggZD0iTTI1IDY1IEMgMjUgNTUgMzUgNTAgNTAgNTUgQyA2NSA1MCA3NSA1NSA3NSA2NSBDIDUwIDgwIDI1IDgwIDI1IDY1IiBmaWxsPSIjZGRkIi8+PC9zdmc+';
        
        profileImageDiv.style.backgroundImage = `url(${defaultGroupPlaceholder})`;

        if (group.groupImage) {
            const img = new Image();
            img.onload = function() {
                profileImageDiv.style.backgroundImage = `url(${group.groupImage})`;
            };
            img.onerror = function() {
                console.log('Grup:', group.groupImage);
            };
            img.src = group.groupImage;
        }

        profileImageDiv.onclick = function () {
            event.stopPropagation(); // prevent handleGroupClick
            openGroupDetail(group);
        }

            // Create and set the group's name
            const nameDiv = document.createElement('div');
            nameDiv.textContent = group.name; // Group's name

            nameDiv.setAttribute('_id', group._id);
            nameDiv.className = 'friend-name group-selected';

            const unReadCount = document.createElement('div');
            unReadCount.textContent = group.unreadCount; 

            unReadCount.setAttribute('_id', group._id);
            unReadCount.className = 'unread-count';

            // Create the main container
            const typingDots = document.createElement('span');
            typingDots.className = 'typing-dots';
            typingDots.style.display = 'none'; // Initially hidden
            typingDots.style.marginLeft = `auto`;

            // Create 3 dot spans
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                dot.textContent = '•';
                typingDots.appendChild(dot);
            }

            // Append the profile image and name to the user div
            activityDiv.appendChild(profileImageDiv);
            activityDiv.appendChild(nameDiv);
            if (group.unreadCount!==0) {
                activityDiv.appendChild(unReadCount);
            }
            activityDiv.appendChild(typingDots);

            activityDiv.addEventListener('click', handleGroupClick);
            nameDiv.addEventListener('click', handleGroupClick);

            // Append the user div to the user list
            user_list.appendChild(activityDiv);

            let chatBox = document.getElementById(`chatbox-${group._id}`);
            if (!chatBox) {
              chatBox = document.createElement('div');
              chatBox.classList.add('chat-box');
              chatBox.style.display = 'none'; 
              chatBox.id = `chatbox-${group._id}`;

              const container = document.getElementById('chat-container');
              if (!container) {
                console.error('Chat container bulunamadı.');
                return;
              }

              container.prepend(chatBox);
            }
        }
    } else {
        console.error('No groups data found.');
    }
}
 
function addFriend(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        email: formData.get('friend'),
    };

    const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

    fetch("https://real-time-chat-application-production-faea.up.railway.app/api/v1/friends/sendFriendRequest", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Add friend response:", data);
        if (data.success) {
            fetchChatData(false);
        } else {
            const errorEl = document.getElementById('topComponentErrorMessage');
            errorEl.textContent = data.message || "Failed to send friend request";

            setTimeout(() => {
               errorEl.textContent = "";
            }, 3000); 
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    });
}

function acceptFriendRequest(requestId) {
    const token = sessionStorage.getItem('jwt');
    fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/friends/${encodeURIComponent(requestId)}/accept`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Accept friend request response:", data);
        if (data.success) {
            fetchChatData(false);
        } else {
            const errorEl = document.getElementById('topComponentErrorMessage');
            errorEl.textContent = data.message || "Failed to accept friend request";

            setTimeout(() => {
               errorEl.textContent = "";
            }, 3000); 
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    });
}

function rejectFriendRequest(requestId) {
    const token = sessionStorage.getItem('jwt');
    fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/friends/${encodeURIComponent(requestId)}/reject`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Reject friend request response:", data);
        if (data.success) {
            fetchChatData(false);
        } else {
            const errorEl = document.getElementById('topComponentErrorMessage');
            errorEl.textContent = data.message || "Failed to reject friend request";

            setTimeout(() => {
               errorEl.textContent = "";
            }, 3000); 
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    });
}

function createGroup(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        name: formData.get('groupName'),
        description: formData.get('groupDescription')
    };

    const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

    fetch("https://real-time-chat-application-production-faea.up.railway.app/api/v1/groups", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Create group response:", data);
        if (data.message === "Group created successfully!") {
            fetchChatData(false);
        } else {
            const errorEl = document.getElementById('topComponentErrorMessage');
            errorEl.textContent = data.message || "Failed to create group";

            setTimeout(() => {
               errorEl.textContent = "";
            }, 3000); 
        }
    })
    .catch(error => {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    });
}

async function addUserToGroup(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const groupId = sessionStorage.getItem('recipient');
    const memberEmail = formData.get('newMemberEmail');
    const memberRole = formData.get('newMemberRole');

    console.log('Adding member to group:', groupId, memberEmail, memberRole);

    if (!groupId || !memberEmail) {
        alert("Please select a group and enter member name.");
        return;
    }

    const token = sessionStorage.getItem('jwt');

    try {
        const response = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/groups/${encodeURIComponent(groupId)}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                email: memberEmail,
                role: memberRole
            })
        });

        const data = await response.json();
        console.log("Add user to group response:", data);

        if (data.message === "Member added successfully!") {
            fetchChatData(false);
            alert("Member added successfully!");
        } else {
            alert(data.message || "Failed to add member to group");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred: " + error.message);
    }
}

async function handleUserClick(event) {
    document.querySelectorAll('.chat-box').forEach((chatbox) => {
      chatbox.style.display = 'none';
    });

    console.log('Clicked element:', event.target);
    sessionStorage.setItem('clickedElementType', 'friend');

    if (!event.target.classList.contains('friend-selected')) return;

    const to = event.target.getAttribute('_id'); 
    const from = sessionStorage.getItem('_id'); 

    sessionStorage.setItem('recipient', to);

    readMyMessages( to, 'private' );

    if (!from) {
      console.error('Gönderen kullanıcı bulunamadı.');
      return;
    }
    
    const chatData = JSON.parse(sessionStorage.getItem('chatData'));
    const friend = chatData.friends.find(f => f._id === to);
    if (friend) {
        sessionStorage.setItem('currentRecipientName', friend.name);
    }

    const container = document.getElementById('chat-container');
    if (!container) {
      console.error('Chat container bulunamadı.');
      return;
    }

    let chatBox = document.getElementById(`chatbox-${to}`);
    if (!chatBox) {
      chatBox = document.createElement('div');
      chatBox.classList.add('chat-box');
      chatBox.id = `chatbox-${to}`;
      container.prepend(chatBox);
    }

    let chatHeader = document.getElementById(`chat-header`);
    if (chatHeader) {
       const userNameElement = chatHeader.querySelector('#chat-user-name');
        const userAvatarElement = chatHeader.querySelector('#chat-user-avatar');
        const userStatusElement = chatHeader.querySelector('#chat-user-status');
    
        if (userNameElement) {
            userNameElement.textContent = friend ? friend.name : 'Unknown';
        }

        if (userAvatarElement) {
            const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';
            userAvatarElement.onerror = function() {
                this.src = defaultAvatar;
                this.onerror = null;
            };
            userAvatarElement.onclick = function() {
                event.stopPropagation(); // prevent handleUserClick
                openFriendDetail(friend);
            }
            userAvatarElement.src = friend.profileImage ? `${friend.profileImage}` : defaultAvatar;
        }

        if (userStatusElement) {
            userStatusElement.textContent = friend && friend.isOnline ? 'Online' : 'Offline';
        }
        // Update other elements as needed...
    
        console.log('Chat header updated with name:', friend ? friend.name : 'Unknown');
    }

    chatBox.style.display = 'flex';
    chatBox.innerHTML = ''; 

    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Loading messages...';
    chatBox.appendChild(loadingMessage);

    const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

    try {
        const response = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/chats/${encodeURIComponent(to)}`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        }
    });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Server response:', result);

      chatBox.innerHTML = ''; 

      if (result.data.messages.length === 0) {
        const noMessagesDiv = document.createElement('div');
        noMessagesDiv.textContent = 'No messages yet.';
        chatBox.appendChild(noMessagesDiv);
      } else {
        let messagesData = result.data.messages;
        messagesData.forEach((message) => {
          const activityDiv = document.createElement('div');
          activityDiv.classList.add(message.sender === from ? 'my-message' : 'other-message');

          const strongElement = document.createElement('strong');
          strongElement.className = message.sender === from ? 'my-message-name' : 'other-message-name';
          strongElement.textContent = message.sender === from ? 'Me' : `${sessionStorage.getItem('currentRecipientName')}:`;

          const messageText = document.createElement('p');
          messageText.appendChild(strongElement);
          messageText.appendChild(document.createTextNode(` ${message.content}`));

          activityDiv.appendChild(messageText);
          chatBox.appendChild(activityDiv);
        });

        chatBox.scrollTop = chatBox.scrollHeight; 
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage('An error occurred while fetching messages.');
    }
  }

async function handleGroupClick(event) {
    document.querySelectorAll('.chat-box').forEach((chatbox) => {
      chatbox.style.display = 'none';
    });

    console.log('Clicked element:', event.target);
    sessionStorage.setItem('clickedElementType', 'group');

    const to = event.target.getAttribute('_id'); 
    const from = sessionStorage.getItem('_id'); 

    if (!from) {
      console.error('Gönderen kullanıcı bulunamadı.');
      return;
    }

    sessionStorage.setItem('recipient', to);

    readMyMessages( to, 'group' );

    const container = document.getElementById('chat-container');
    if (!container) {
      console.error('Chat container bulunamadı.');
      return;
    }

    let chatBox = document.getElementById(`chatbox-${to}`);
    if (!chatBox) {
      chatBox = document.createElement('div');
      chatBox.classList.add('chat-box');
      chatBox.id = `chatbox-${to}`;
      container.prepend(chatBox);
    }

    let chatHeader = document.getElementById(`chat-header`);
    if (chatHeader) {
         const userNameElement = chatHeader.querySelector('#chat-user-name');
          const userAvatarElement = chatHeader.querySelector('#chat-user-avatar');
          const userStatusElement = chatHeader.querySelector('#chat-user-status');
     
          const chatData = JSON.parse(sessionStorage.getItem('chatData'));
          const group = chatData.groups.find(g => g._id === to);
    
          if (userNameElement) {
                userNameElement.textContent = group ? group.name : 'Unknown Group';
          }
    
          if (userAvatarElement) {
                const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzUiIHI9IjEwIiBmaWxsPSIjZGRkIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzMCIgcj0iOCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjcwIiBjeT0iMzUiIHI9IjEyIiBmaWxsPSIjZGRkIi8+PHBhdGggZD0iTTI1IDY1IEMgMjUgNTUgMzUgNTAgNTAgNTUgQyA2NSA1MCA3NSA1NSA3NSA2NSBDIDUwIDgwIDI1IDgwIDI1IDY1IiBmaWxsPSIjZGRkIi8+PC9zdmc+';
                userAvatarElement.onerror = function() {
                 this.src = defaultAvatar;
                 this.onerror = null;
                };
                userAvatarElement.onclick = function() {
                    event.stopPropagation(); // prevent handleGroupClick
                    openGroupDetail(group);
                }
                userAvatarElement.src = group && group.groupImage ? group.groupImage : defaultAvatar;
          }
    
          if (userStatusElement) {
                userStatusElement.textContent = 'Group Chat';
          }
          // Update other elements as needed...
     
          console.log('Chat header updated with group name:', group ? group.name : 'Unknown Group');
    }

    chatBox.style.display = 'flex';
    chatBox.innerHTML = ''; 

    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Loading messages...';
    chatBox.appendChild(loadingMessage);

    const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

    try {
        const response = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/chats/group/${encodeURIComponent(to)}`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
        }
    });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Server response:', result);

      chatBox.innerHTML = ''; 

      if (result.data.messages.length === 0) {
        const noMessagesDiv = document.createElement('div');
        noMessagesDiv.textContent = 'No messages yet.';
        chatBox.appendChild(noMessagesDiv);
      } else {
        let messagesData = result.data.messages;
        messagesData.forEach((message) => {
          const activityDiv = document.createElement('div');
          activityDiv.classList.add(message.sender._id === from ? 'my-message' : 'other-message');

          const strongElement = document.createElement('strong');
          strongElement.className = message.sender._id === from ? 'my-message-name' : 'other-message-name';
          strongElement.textContent = message.sender._id === from ? 'Me' : `${message.sender.email}:`;

          const messageText = document.createElement('p');
          messageText.appendChild(strongElement);
          messageText.appendChild(document.createTextNode(` ${message.content}`));

          activityDiv.appendChild(messageText);
          chatBox.appendChild(activityDiv);
        });

        chatBox.scrollTop = chatBox.scrollHeight; 
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorMessage('An error occurred while fetching messages.');
    }
  }

async function readMyMessages(id, type) {
    try {
        const unreadElement = document.querySelector(
            `.unread-count`
        );
        if (unreadElement) {
            unreadElement.remove(); // Completely remove it from DOM
        }

        const token = sessionStorage.getItem('jwt'); // or sessionStorage.getItem('token')

        console.log('Marking messages as read for:', id, 'Type:', type);
        const response = await fetch(`https://real-time-chat-application-production-faea.up.railway.app/api/v1/chats/mark-read`, { 
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id: id, type: type })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        console.log('Messages marked as read:', result);
        return result; 

    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('An error occurred while marking messages as read.');
        return null; 
    }
}

function showErrorMessage(message) {
  const chatBox = document.getElementById('chat-box');
  const errorMessage = document.createElement('div');
  errorMessage.classList.add('error-message');
  errorMessage.textContent = message;
  chatBox.appendChild(errorMessage);
}
   
function toggleAddUser() {
        const container = document.getElementById('add-friend-container');
        document.getElementById('add-group-container').style.display = 'none';
        container.style.display = container.style.display === 'none' || container.style.display === '' ? 'block' : 'none';
        if (container.style.display === 'none') {
            document.getElementById('lower-component').style.maxHeight = '516px';
            return;
        } else {
            document.getElementById('lower-component').style.maxHeight = '450px';
            return;
        }
}

function toggleAddGroup() {
        const container = document.getElementById('add-group-container');
        document.getElementById('add-friend-container').style.display = 'none';
        container.style.display = container.style.display === 'none' || container.style.display === '' ? 'block' : 'none';
        if (container.style.display === 'none') {
            document.getElementById('lower-component').style.maxHeight = '516px';
            return;
        } else {
            document.getElementById('lower-component').style.maxHeight = '424px';
            return;
        }
}

function fetchProfileDataAccount() {
    try {
        const savedProfileData = sessionStorage.getItem('profileData');
        if (savedProfileData) {
            const data = JSON.parse(savedProfileData);
            console.log("Profile data loaded from sessionStorage:", data);
            // Base64 placeholder for profile image
            const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';

            // Profile image with error handling
            const profileImageElement = document.getElementById('profileImageAccount');
            if (profileImageElement) {
                profileImageElement.onerror = function() {
                    this.src = defaultAvatar;
                    this.onerror = null;
                };
                profileImageElement.src = `${data.avatar}` || defaultAvatar;
            }

            // Set other profile data with fallbacks
            document.getElementById('nameAccount').innerHTML = data.username || 'İsimsiz Kullanıcı';
            document.getElementById('emailAccount').textContent = data.email || 'E-posta bulunamadı';
            document.getElementById('bioAccount').textContent = data.bio || 'Biografi bulunamadı';

            document.getElementById('updateName').value = data.username || 'İsimsiz Kullanıcı';
            document.getElementById('updateBio').value = data.bio || 'Biografi bulunamadı';
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        
        // Hata durumunda da placeholder göster
        const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2ZmZjBhMCIvPjxwYXRoIGQ9Ik0zMCA1MGg0ME0zNSA3MGgzME01MCAzMHY0MCIgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=';
        const profileImageElement = document.getElementById('profileImageAccount');
        if (profileImageElement) {
            profileImageElement.src = defaultAvatar;
        }
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onloadend = function () {
            document.getElementById('profileImagePreview').src = reader.result;
            document.getElementById('profileImageBase64').value = reader.result;
        };

        reader.readAsDataURL(file);
    }
}

async function changeProfileData() {
  const name = document.getElementById('updateName').value;
  const bio = document.getElementById('updateBio').value;
  const profileImageInput = document.getElementById('updateImage'); // type="file"
  const token = sessionStorage.getItem('jwt');

  // prepare multipart/form-data
  const formData = new FormData();
  formData.append('username', name);
  formData.append('bio', bio);
  if (profileImageInput.files[0]) {
    formData.append('avatar', profileImageInput.files[0]);
  }
  console.log('Saving profile data...', { name, bio, hasImage: !!profileImageInput.files[0] });

  try {
    const response = await fetch('https://real-time-chat-application-production-faea.up.railway.app/api/v1/users/', {
      method: 'PATCH',
      headers: {
        "Authorization": `Bearer ${token}`,
        // DO NOT set 'Content-Type' manually — fetch will handle it for FormData
      },
      body: formData
    });

    const result = await response.json();

    if (result.data) {
      if (result.data) {
          sessionStorage.setItem('profileData', JSON.stringify(result.data));
      }
      updateAccountProfileUI(result.data);
    }

  } catch (error) {
    console.error('Error saving profile data:', error);
    alert('Failed to update profile. Please try again later.');
  }
}

function openFriendDetail(friend) {
    // Hide both detail panes first
    document.getElementById('friend-detail').style.display = 'none';
    document.getElementById('group-detail').style.display = 'none';
    
    // Get the friend detail pane
    const friendDetail = document.getElementById('friend-detail');
    
    // Update friend details
    document.getElementById('friend-detail-avatar').src = 
        friend.profileImage ? `${friend.profileImage}` : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';
    document.getElementById('friend-detail-name').textContent = friend.name || 'Unknown Friend';
    
    // Set status (you might want to add status to your friend object)
    const status = friend.status || 'Online';
    document.getElementById('friend-detail-status').textContent = status;
    document.getElementById('friend-detail-status').className = `detail-info ${status.toLowerCase()}`;
    
    // Update contact information (you might want to add these fields to your friend object)
    const contactInfo = document.querySelector('.friend-detail .contact-info');
    if (contactInfo) {
        contactInfo.innerHTML = `
            <p><strong>Email:</strong> ${friend.email || 'Not available'}</p>
        `;
    }
    
    // Show the friend detail pane
    friendDetail.style.display = 'block';
}

function openGroupDetail(group) {
    // Hide both detail panes first
    document.getElementById('friend-detail').style.display = 'none';
    document.getElementById('group-detail').style.display = 'none';
    
    // Get the group detail pane
    const groupDetail = document.getElementById('group-detail');
    
    // Update group details
    document.getElementById('group-detail-avatar').textContent = 
        group.name ? group.name.split(' ').map(word => word.charAt(0)).join('').toUpperCase() : '?';
    document.getElementById('group-detail-name').textContent = group.name || 'Unknown Group';
    document.getElementById('group-detail-members').textContent = 
        `${group.memberCount || group.members ? group.members.length : 0} members`;
    
    // Update description (you might want to add description to your group object)
    const description = document.querySelector('.group-detail p');
    if (description) {
        description.textContent = group.description || 'No description available.';
    }
    
    // Update members list (you might want to add members to your group object)
    const memberList = document.querySelector('.group-detail .member-list');
    if (memberList && group.members) {
        memberList.innerHTML = group.members.map(member => `
            <li class="member-item">
                <div class="member-avatar">${member.user.username ? member.user.username.charAt(0).toUpperCase() : '?'}</div>
                <div class="member-info">
                    <div class="member-name">${member.user.username || 'Unknown Member'}</div>
                    <div class="member-role">${member.role || 'Member'}</div>
                </div>
            </li>
        `).join('');
    }
    
    // Show the group detail pane
    groupDetail.style.display = 'block';
}

function closeDetail() {
    document.getElementById('friend-detail').style.display = 'none';
    document.getElementById('group-detail').style.display = 'none';
}

function showTypingIndicator(user, chatId, chatType) {
    const currentRecipient = sessionStorage.getItem('recipient');

    const typingIndicator = document.getElementById('typing-indicator');
    const userStatusElem = document.getElementById(`chat-user-status`);

    if (chatId === currentRecipient && chatType === 'group' && user.userId !== sessionStorage.getItem('_id')) {
        typingIndicator.style.display = 'flex';
        userStatusElem.style.display = 'none';
    } else if (user.userId === currentRecipient && chatType === 'private') {
        typingIndicator.style.display = 'flex';
        userStatusElem.style.display = 'none';
    }

    const userElem = document.getElementById(chatType === 'group' ?  `group-${chatId}` : `user-${user.userId}`);
    let userTypingDotsElem = null;
    if (userElem) {
      userTypingDotsElem = userElem.querySelector('.typing-dots');
    }
    if (chatType === 'group' && user.userId !== sessionStorage.getItem('_id') && userTypingDotsElem){
        userTypingDotsElem.style.display = 'flex';
    } else if (chatType === 'private' && userTypingDotsElem){
        userTypingDotsElem.style.display = 'flex';
    }
}

function hideTypingIndicator(user, chatId, chatType) {
    const currentRecipient = sessionStorage.getItem('recipient');

    const typingIndicator = document.getElementById('typing-indicator');
    const userStatusElem = document.getElementById(`chat-user-status`);

    if (chatId === currentRecipient && chatType === 'group' && user.userId !== sessionStorage.getItem('_id')) {
        typingIndicator.style.display = 'none';
        userStatusElem.style.display = 'flex';
    } else if (user.userId === currentRecipient && chatType === 'private') {
        typingIndicator.style.display = 'none';
        userStatusElem.style.display = 'flex';
    }

    const userElem = document.getElementById(chatType === 'group' ?  `group-${chatId}` : `user-${user.userId}`);
    let userTypingDotsElem = null;
    if (userElem) {
      userTypingDotsElem = userElem.querySelector('.typing-dots');
    }
    if (chatType === 'group' && user.userId !== sessionStorage.getItem('_id') && userTypingDotsElem){
        userTypingDotsElem.style.display = 'none';
    } else if (chatType === 'private' && userTypingDotsElem){
        userTypingDotsElem.style.display = 'none';
    }
}

function updateTypingUsersList(chatId, typingUsers) {
    // If you want to show multiple users typing
    const chatBox = document.getElementById(`chatbox-${chatId}`);
    if (!chatBox) return;
    
    // Clear all existing typing indicators
    const existingIndicators = chatBox.querySelectorAll('.typing-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Add new ones
    typingUsers.forEach(user => {
        showTypingIndicator(chatId, user);
    });
}

function setupTypingDetection() {
    const messageInput = document.getElementById('message-input');
    let typingTimeout;
    
    messageInput.addEventListener('input', () => {
        const clickedElementType = sessionStorage.getItem('clickedElementType');
        const recipient = sessionStorage.getItem('recipient');
        
        if (!recipient) return;
        
        // Start typing
        if (clickedElementType === 'friend') {
            socket.emit('chat:typing_start', { 
                recipient: recipient 
            });
        } else if (clickedElementType === 'group') {
            socket.emit('chat:typing_start', { 
                chatId: recipient,
                chatType: 'group'
            });
        }
        
        // Clear previous timeout
        clearTimeout(typingTimeout);
        
        // Set timeout to stop typing after 1 second of inactivity
        typingTimeout = setTimeout(() => {
            if (clickedElementType === 'friend') {
                socket.emit('chat:typing_stop', { 
                    recipient: recipient 
                });
            } else if (clickedElementType === 'group') {
                socket.emit('chat:typing_stop', { 
                    chatId: recipient,
                    chatType: 'group'
                });
            }
        }, 1000);
    });
    
    // Also stop typing when message is sent
    const originalSendMessage = window.sendMessage;
    window.sendMessage = function() {
        const clickedElementType = sessionStorage.getItem('clickedElementType');
        const recipient = sessionStorage.getItem('recipient');
        
        // Stop typing
        if (clickedElementType === 'friend') {
            socket.emit('chat:typing_stop', { recipient: recipient });
        } else if (clickedElementType === 'group') {
            socket.emit('chat:typing_stop', { 
                chatId: recipient,
                chatType: 'group'
            });
        }
        
        // Clear timeout
        clearTimeout(typingTimeout);
        
        // Call original function
        return originalSendMessage.apply(this, arguments);
    };
}

const tabs = document.querySelectorAll(".navigation-menu li");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const users = document.querySelectorAll(".lower-component .user");

        users.forEach(user => {
            console.log("Checking user:", user);
            user.classList.add("hidden");

            if (tab.id === "general") {
                user.classList.remove("hidden");
            }

            if (tab.id === "nav-friends" && user.classList.contains("friend-selected")) {
                user.classList.remove("hidden");
            }

            if (tab.id === "nav-groups" && user.classList.contains("group-selected")) {
                user.classList.remove("hidden");
            }

            if (tab.id === "nav-friend-requests" && user.classList.contains("friend-request")) {
                user.classList.remove("hidden");
            }
        });
    });
});
