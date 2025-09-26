/* ______________________________________ */ 

              // Variables       
/* ______________________________________ */

let pinMode = false;
let eraseMode = false;
let activeButton = null;

const markers = [];
const HIT_RADIUS = 50;
const MIN_DISTANCE = 30;
const pinButton = document.querySelector('#pinButton');
const eraserButton = document.querySelector('#eraserButton');
const STANDARD_MAX_ZOOM = 12; // For V & BL
const SPORT_MAX_ZOOM = 18; // For S & P

/* ______________________________________ */ 

                // Worldmap
/* ______________________________________ */ 

const map = L.map('map', {
    center: [56.2639, 9.5018], // Denmark Location
    zoom: 4, // Initial Zoom
    minZoom: 3, // Min Zoome
    maxZoom: STANDARD_MAX_ZOOM, // Max Zoom
    maxBounds: [[-90, -180], [90, 180]], // South / North Poles 
    maxBoundsViscosity: 1.0 // Can't exit map
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: 'Travlr.dk | Build: 0.1.8 | Release at 1.0.0',
    subdomains: 'abcd',
    maxZoom: 15
}).addTo(map);

/* ______________________________________ */ 

              // Visuals       
/* ______________________________________ */

const redIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], 
    iconAnchor: [12, 41], 
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blIcon = L.icon({
    iconUrl: 'assets/images/icons/bucketlist-2-s.png',
    iconSize: [32, 32],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

/* ______________________________________ */ 

            // Event Listeners      
/* ______________________________________ */

pinButton.addEventListener('click', () => setActive(pinButton, 'pin'));
eraserButton.addEventListener('click', () => setActive(eraserButton, 'erase'));

/* ______________________________________ */ 

            // Button handle       
/* ______________________________________ */

function setActive(button, mode) {
    if (activeButton && activeButton !== button) {
        activeButton.classList.remove('active');
    }

    if (activeButton === button) {
        button.classList.remove('active');
        activeButton = null;
        pinMode = false;
        eraseMode = false;
    } else {
        button.classList.add('active');
        activeButton = button;
        pinMode = mode === 'pin';
        eraseMode = mode === 'erase';
    }
}

/* ______________________________________ */ 

     // Zoom Handle depending on mode
/* ______________________________________ */

/*
function updateMapZoomForMode(mode) {
    if (mode === 'S' || mode === 'P') {
        map.options.maxZoom = SPORT_MAX_ZOOM;
        map.setZoom(4); 
    } else if (mode === 'BL' || mode === 'V') {
        map.options.maxZoom = STANDARD_MAX_ZOOM;
        map.setZoom(4);
    }
}
*/

function updateMapZoomForMode(mode) {
    if (mode === 'S' || mode === 'P') {
        map.options.maxZoom = SPORT_MAX_ZOOM;
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) layer.options.maxZoom = SPORT_MAX_ZOOM;
        });
        map.setZoom(4);
    } else if (mode === 'BL' || mode === 'V') {
        map.options.maxZoom = STANDARD_MAX_ZOOM;
        map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) layer.options.maxZoom = STANDARD_MAX_ZOOM;
        });
        map.setZoom(4);
    }
}

/* ______________________________________ */ 

         // Load Markers from server
/* ______________________________________ */ 

async function loadMarkers() {
    if (!loggedInUser) return; 

    try {
        const res = await fetch('php/get_pins.php', { 
            credentials: 'same-origin'
        }); 
        const pins = await res.json();

        pins.forEach(pin => {
            const marker = L.marker([pin.lat, pin.lng], { icon: redIcon }).addTo(map);
            markers.push({ marker, id: pin.id }); 
        });
    } catch (err) {
        console.error('Fejl ved load af pins:', err);
    }
}

/* ______________________________________ */ 

                // Click    
/* ______________________________________ */ 

map.on('click', async function(e) {
    if (!loggedInUser) {
        showNotification("Du skal være logget ind for at tilføje pins!", "danger");
        return;
    }

    const clickLatLng = e.latlng;

    if (pinMode) {
        let iconToUse = currentMode === 'BL' ? blIcon : redIcon;

        const marker = L.marker(clickLatLng, { icon: iconToUse }).addTo(map);
        markers.push({ marker, id: null });

        // Save pin to database
        try {
            const res = await fetch('php/save_pin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: clickLatLng.lat,
                    lng: clickLatLng.lng,
                    label: 'NULL',
                    mode: currentMode   // Gem mode som V eller BL
                }),
                credentials: 'same-origin'
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch(err) {
                console.error("Fejl ved parsing af JSON:", err);
                return;
            }

            if (data.id) {
                markers[markers.length - 1].id = data.id;
            } else {
                console.error("Pin blev ikke gemt:", data);
            }
        } catch (err) {
            console.error("Fejl ved gem pin:", err);
        }

    } else if (eraseMode) {
        for (let i = markers.length - 1; i >= 0; i--) {
            const m = markers[i];
            const distance = map.latLngToContainerPoint(m.marker.getLatLng())
                               .distanceTo(map.latLngToContainerPoint(clickLatLng));

            if (distance <= HIT_RADIUS) {
                map.removeLayer(m.marker);

                if (m.id) {
                fetch('php/delete_pin.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: m.id }),
                    credentials: 'same-origin'
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        console.log('Pin slettet fra DB');
                    } else {
                        console.error('Fejl ved slet pin:', data);
                    }
                })
                .catch(err => console.error('Fejl ved slet pin:', err));
            }

                markers.splice(i, 1);

            }
        }
    }
});

// Load pins on start
loadMarkers();