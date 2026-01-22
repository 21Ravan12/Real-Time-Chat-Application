function updateAccountProfileUI(data) {
    if (!data) return;
    const profileImageAccountElement = document.getElementById('profileImageAccount');
    const nameAccountElement = document.getElementById('nameAccount');
    const emailAccountElement = document.getElementById('emailAccount');
    const bioAccountElement = document.getElementById('bioAccount');

    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjOTk5Ii8+PHBhdGggZD0iTTMwIDcwIFEgMzAgNTAgNTAgNjAgUSA3MCA1MCA3MCA3MCBRIDUwIDgwIDMwIDcwIiBmaWxsPSIjOTk5Ii8+PC9zdmc+';

    const profileImageElement = document.getElementById('profileImageAccount');
    if (profileImageElement) {
        profileImageElement.onerror = function() {
            this.src = defaultAvatar;
            this.onerror = null;
        };
        profileImageElement.src = `http://localhost:5000${data.avatar}` || defaultAvatar;
    }

    nameAccountElement.textContent = data.username || 'No Name';
    emailAccountElement.textContent = data.email || 'No Email';
    bioAccountElement.textContent = data.bio || 'No Bio';

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
                profileImageElement.src = `http://localhost:5000${data.avatar}` || defaultAvatar;
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
    const response = await fetch('http://localhost:5000/api/v1/users/', {
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
