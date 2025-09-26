const startZoom = document.getElementById('startZoom');
const zoomValue = document.getElementById('zoomValue');

let currentMode = 'V'; // Default: Visited

const settingsOverlay = document.getElementById('settingsOverlay');
const closeOverlay = document.getElementById('closeOverlay');
const loginOverlay = document.getElementById('loginOverlay');
const createOverlay = document.getElementById('createOverlay');

const settingsButton = document.getElementById('settingsButton');
const loginButton = document.getElementById('loginButton');
const createAccountButton = document.getElementById('createAccountButton');
const backToLoginButton = document.getElementById('backToLoginButton');
const createButton = document.getElementById('createButton');
const logoutButton = document.getElementById('logoutButton');
const createRouteButton = document.getElementById('createRoute');
const cancelRouteButton = document.getElementById('cancelRoute');

const rightNavbar = document.querySelector('.guac-navbar-bottom-right');
const rightNavbarHidden = document.querySelector('.guac-navbar-bottom-right-hidden');

settingsButton.addEventListener('click', (e) => {
    e.preventDefault();
    settingsOverlay.classList.add('active');
});

closeOverlay.addEventListener('click', (e) => {
    e.preventDefault();
    settingsOverlay.classList.remove('active');
});

startZoom.addEventListener('input', () => {
    zoomValue.textContent = startZoom.value;
});

loginOverlay.style.display = 'flex';
createOverlay.style.display = 'none';

createAccountButton.addEventListener('click', () => {
    loginOverlay.style.display = 'none';
    createOverlay.style.display = 'flex';
});

backToLoginButton.addEventListener('click', () => {
    createOverlay.style.display = 'none';
    loginOverlay.style.display = 'flex';
});

cancelRouteButton.addEventListener('click', () => {
    createRouteOverlay.style.display = 'none';
});

createRouteButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const title = document.getElementById('routeTitle').value.trim();
    const description = document.getElementById('routeDesc').value.trim();

    if (!title) {
        showNotification("Please enter a title for your route", "danger");
        return;
    }

    try {
        const response = await fetch('php/create_sport.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });

        const result = await response.json();

        if (result.success) {
            showNotification("Route created successfully!", "success");
            createRouteOverlay.style.display = 'none';

            const newRouteId = result.route_id;

        } else {
            showNotification(result.message || "Failed to create route", "danger");
        }

    } catch (err) {
        console.error("Create Route request failed:", err);
        showNotification("Create Route request failed", "danger");
    }
});

createButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const newUsername = document.getElementById('newUsername').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const newEmail = document.getElementById('newEmail').value.trim();

    if (!newUsername || !newPassword || !confirmPassword || !newEmail) {
        showNotification("Alle felter skal udfyldes", "danger");
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification("Passwords matcher ikke", "danger");
        return;
    }

    const formData = new FormData();
    formData.append('newUsername', newUsername);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);
    formData.append('newEmail', newEmail);

    try {
        const response = await fetch('php/register.php', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log("Raw response from register.php:", text);

        let result;
        try {
            result = JSON.parse(text);
        } catch (err) {
            console.error("JSON parse error:", err);
            showNotification("Server returned invalid response", "danger");
            return;
        }

        if (result.success) {
            showNotification("Konto oprettet! Du kan nu logge ind.", "success");
            createOverlay.style.display = 'none';
            loginOverlay.style.display = 'flex';
        } else {
            showNotification(result.message || "Kunne ikke oprette konto", "danger");
        }
    } catch (err) {
        console.error("Request failed:", err);
        showNotification("Create Account request failed", "danger");
    }
});

loginButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log("Username:", username);
    console.log("Password:", password);

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const response = await fetch('php/login.php', {
            method: 'POST',
            body: formData
        });

        const text = await response.text();
        console.log("Raw response from PHP:", text);

        let result;
        try {
            result = JSON.parse(text);
        } catch (err) {
            console.error("JSON parse error:", err);
            showNotification("Server returned invalid response", "danger");
            return;
        }

        if (result.success) {
            loginOverlay.style.display = 'none';
            showNotification("Login success!", "success");

            loggedInUser = result.username || username; 

            clearMapPins();
            loadMarkers();

        } else {
            showNotification(result.message || "Wrong credentials", "danger");
        }
    } catch (err) {
        console.error("Request failed:", err);
        showNotification("Login request failed", "danger");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (typeof loggedInUser !== "undefined" && loggedInUser) {
        showNotification(`Welcome back, ${loggedInUser}!`, "success");
        loginOverlay.style.display = 'none';
        createOverlay.style.display = 'none';
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('php/logout.php', {
            method: 'POST',
        });

        const result = await response.json();

        if (result.success) {
            showNotification("You have been logged out", "success");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            showNotification("Logout failed", "danger");
        }
    } catch (err) {
        console.error("Logout request failed:", err);
        showNotification("Logout request failed", "danger");
    }
});

function clearMapPins() {
    markers.forEach(m => {
        map.removeLayer(m.marker);
    });
    markers.length = 0;
}

function addPinToMap(lat, lng, label, mode = 'V', id = null) {
    let icon = redIcon;
    if (mode === 'BL') icon = blIcon;

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    if (label) marker.bindPopup(label);
    markers.push({ marker, id });
}

function renderPinsOnMap(pins) {
    markers.forEach(m => map.removeLayer(m.marker));
    markers.length = 0;

    pins.forEach(pin => {
        addPinToMap(pin.lat, pin.lng, pin.label, pin.mode, pin.id);
    });
}

const icons = {
    V: 'fa-map-marker',       
    P: 'fa-edit',            
    BL: 'fa-tags',   
    S: 'fa-map-signs'          
};

function updatePinIcon(mode) {
    const icon = pinButton.querySelector('i');
    icon.className = 'fa ' + icons[mode]; 
}

startButton.addEventListener('click', (e) => {
    e.preventDefault();

    if (createRouteOverlay.style.display === 'none' || createRouteOverlay.style.display === '') {
        createRouteOverlay.style.display = 'flex';
    } else {
        createRouteOverlay.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const wishButton = document.getElementById("wishButton");
    const wishDropdown = document.getElementById("wishDropdown");
    const wishText = wishButton.querySelector(".wish-text");
    const wishOptions = wishDropdown.querySelectorAll(".wish-option");

    wishButton.addEventListener("click", (e) => {
        e.stopPropagation();
        wishDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!wishButton.contains(e.target)) {
            wishDropdown.classList.remove("active");
        }
    });

    wishOptions.forEach(option => {
        option.addEventListener("click", async (e) => {
            e.stopPropagation();

            wishText.textContent = option.textContent;

            wishOptions.forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");

            wishDropdown.classList.remove("active");

            const mode = option.dataset.mode;
            currentMode = mode; 

            // Update pin icon
            updatePinIcon(mode);
            updateMapZoomForMode(mode);

            if (mode === 'S') {
                rightNavbar.style.display = 'none';              
                rightNavbarHidden.style.display = 'flex';        
            } else {
                rightNavbar.style.display = 'flex';              
                rightNavbarHidden.style.display = 'none';      
            }

            try {
                const response = await fetch(`php/get_pins.php?mode=${mode}`);
                const pins = await response.json();

                renderPinsOnMap(pins);

            } catch (err) {
                console.error("Failed to fetch pins:", err);
            }
        });
    });

});

document.addEventListener('DOMContentLoaded', () => {
    createRouteOverlay.style.display = 'none';
});