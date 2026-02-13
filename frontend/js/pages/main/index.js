    document.addEventListener('DOMContentLoaded', function() {
        const menuBtn = document.querySelector('#mobile-menu-btn');
        const nav = document.querySelector('.navigation-links');
        
        if (menuBtn && nav) {
            menuBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                nav.classList.toggle('active');
                menuBtn.classList.toggle('active');
            });

            // Menü dışına tıklandığında kapat
            document.addEventListener('click', function(e) {
                if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
                    nav.classList.remove('active');
                    menuBtn.classList.remove('active');
                }
            });
        }
    });

