/*

    guacamoleboy-wow.js
    Handles animations & notifications
    Last edited by Guacamoleboy 10/09-2025

*/

document.addEventListener("DOMContentLoaded", function() {
    
    const elements = document.querySelectorAll(".guac-animate");

    function isInViewport(el) {
        const rect = el.getBoundingClientRect();
        return rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
               rect.bottom >= 0;
    }

    function checkAnimations() {
        elements.forEach(el => {
            if (isInViewport(el) && !el.classList.contains("guac-visible")) {
                el.classList.add("guac-visible");
                const animation = el.dataset.guacAnimation;
                if (animation) el.classList.add(`guac-${animation}`);
            }
        });
    }

    window.addEventListener("scroll", checkAnimations);
    window.addEventListener("resize", checkAnimations);

    checkAnimations();
});

function showNotification(message, type = 'primary') {
    const container = document.getElementById('guac-notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `guac-notification guac-notification-${type}`;
    toast.innerText = message;

    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';

    container.appendChild(toast);


    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) container.removeChild(toast);
        }, 500); 
    }, 5000);
}