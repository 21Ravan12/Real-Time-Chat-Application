document.addEventListener("DOMContentLoaded", function () {
    const pages = ["main-page", "login-page", "sign-up-page", "forget-password-page", "forget-code-insert-page", "code-insert-page", "refresh-password-page", "Landing-page","account-container"];
    
    const pageHistory = [];
    let isNavigating = false;

    function navigateTo(page, updateHash = true, addToHistory = true) {
        if (isNavigating) return;
        isNavigating = true;
        
        sessionStorage.setItem('location', page);

        if (page === 'Landing-page') {
            fetchChatData(true);
            updateProfileUI(JSON.parse(sessionStorage.getItem('profileData')));
            document.getElementById("addFriendForm").addEventListener("submit", addFriend);
            document.getElementById("addGroupForm").addEventListener("submit", createGroup);
            document.getElementById("addMemberForm").addEventListener("submit", addUserToGroup);
            joinChat();
        } else if (page === 'account-container') {   
            fetchProfileDataAccount();
            document.getElementById('editProfileButton').addEventListener('click', () => {
                document.getElementById('editModal').style.display = 'flex';
            });
            document.getElementById('closeModalButton').addEventListener('click', () => {
                document.getElementById('editModal').style.display = 'none';
            });
            document.getElementById('saveChangesButton').addEventListener('click', changeProfileData);
            document.getElementById('updateImage').addEventListener('change', handleFileUpload);
        }

        pages.forEach(p => {
            const element = document.querySelector(`.${p}`);
            if (element) {
                element.style.display = (p === page) ? "flex" : "none";
            }
        });

        if (updateHash && location.hash !== `#${page}`) {
            location.hash = page;
        }

        if (addToHistory && (pageHistory.length === 0 || pageHistory[pageHistory.length - 1] !== page)) {
            pageHistory.push(page);
        }

        isNavigating = false;
    }

    window.addEventListener('popstate', function(event) {
        if (pageHistory.length > 1) {
            pageHistory.pop(); 
            const previousPage = pageHistory[pageHistory.length - 1];
            navigateTo(previousPage, false, false);
        } else if (pageHistory.length === 1) {
            navigateTo(pageHistory[0], false, false);
        }
    });

    window.addEventListener('hashchange', () => {
        const hashPage = location.hash.replace('#', '');
        if (hashPage && pages.includes(hashPage)) {
            navigateTo(hashPage, false);
        }
    });

    const initialPage = location.hash ? location.hash.replace('#', '') : (sessionStorage.getItem('location') || 'main-page');
    if (pages.includes(initialPage)) {
        navigateTo(initialPage, false);
    } else {
        navigateTo('main-page', false);
    }

    window.navigateTo = navigateTo;
    window.pageHistory = pageHistory; 
});
