class RouteViewer {
    constructor() {
        this.map = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.geocoder = null;
        this.markers = [];
        this.journeyData = null;
        this.outlets = null;
        this.users = null;
        this.selectedUser = null;
        this.selectedDay = null;
        this.avgTravelSpeed = 25; // Default average speed in km/hr
        this.avgTimePerOutlet = 60; // Default time per outlet in minutes
        
        this.initializeApp();
    }

    initializeApp() {
        // Load stored data
        this.loadStoredData();
        
        // Initialize Google Maps
        this.loadGoogleMapsAPI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Populate dropdowns
        this.populateUserDropdown();
    }

    loadStoredData() {
        // Load journey plan data from localStorage
        const storedData = localStorage.getItem('journeyPlanData');
        if (storedData) {
            const data = JSON.parse(storedData);
            this.journeyData = data.plan;
            this.outlets = data.outlets;
            this.users = data.users;
        } else {
            this.showError('No journey plan data found. Please generate a plan first.');
        }
    }

    loadGoogleMapsAPI() {
        const apiKey = window.GOOGLE_MAPS_API_KEY;
        if (apiKey === 'YOUR_API_KEY' || !apiKey) {
            this.promptForAPIKey();
            return;
        }

        const script = document.getElementById('google-maps-script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places`;
        
        window.initMap = () => {
            this.initializeMap();
        };
    }

    promptForAPIKey() {
        // Create modal for API key input
        const modal = document.createElement('div');
        modal.className = 'api-key-modal show';
        modal.innerHTML = `
            <div class="api-key-content">
                <h3>Google Maps API Key Required</h3>
                <p>Please enter your Google Maps API key to view routes on the map.</p>
                <p style="font-size: 0.9em; color: #666;">Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console</a></p>
                <input type="text" id="apiKeyInput" placeholder="Enter your API key here...">
                <button onclick="routeViewer.saveAPIKey()">Save & Continue</button>
                <button onclick="routeViewer.skipAPIKey()">Skip for Now</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    saveAPIKey() {
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        if (apiKey) {
            localStorage.setItem('gmaps_api_key', apiKey);
            window.GOOGLE_MAPS_API_KEY = apiKey;
            document.querySelector('.api-key-modal').remove();
            this.loadGoogleMapsAPI();
        }
    }

    skipAPIKey() {
        document.querySelector('.api-key-modal').remove();
        this.showError('Map functionality will be limited without API key.');
    }

    initializeMap() {
        console.log('Initializing Google Map...');
        
        // Initialize map centered on India
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 28.6139, lng: 77.2090 }, // New Delhi
            zoom: 11,
            mapTypeControl: true,
            fullscreenControl: true,
            streetViewControl: false
        });

        console.log('Map initialized:', this.map);

        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: '#4facfe',
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        });
    }

    setupEventListeners() {
        const userSelect = document.getElementById('userSelect');
        const daySelect = document.getElementById('daySelect');
        const showRouteBtn = document.getElementById('showRouteBtn');

        userSelect.addEventListener('change', () => {
            this.selectedUser = userSelect.value;
            this.populateDayDropdown();
            daySelect.disabled = !this.selectedUser;
            this.checkShowRouteButton();
        });

        daySelect.addEventListener('change', () => {
            this.selectedDay = daySelect.value;
            this.checkShowRouteButton();
        });

        showRouteBtn.addEventListener('click', () => {
            this.showRoute();
        });
    }

    populateUserDropdown() {
        const userSelect = document.getElementById('userSelect');
        
        if (!this.users || this.users.length === 0) {
            userSelect.innerHTML = '<option value="">No users available</option>';
            return;
        }

        // Get unique users from journey data
        const uniqueUsers = [...new Set(this.journeyData.map(item => item.userCode))];
        
        userSelect.innerHTML = '<option value="">Choose a user...</option>';
        uniqueUsers.forEach(userName => {
            const option = document.createElement('option');
            option.value = userName;
            option.textContent = userName;
            userSelect.appendChild(option);
        });
    }

    populateDayDropdown() {
        const daySelect = document.getElementById('daySelect');
        
        if (!this.selectedUser) {
            daySelect.innerHTML = '<option value="">Choose a day...</option>';
            return;
        }

        // Get days for selected user
        const userDays = [...new Set(
            this.journeyData
                .filter(item => item.userCode === this.selectedUser)
                .map(item => item.day)
        )].sort();

        daySelect.innerHTML = '<option value="">Choose a day...</option>';
        userDays.forEach(day => {
            const option = document.createElement('option');
            option.value = day;
            option.textContent = day;
            daySelect.appendChild(option);
        });
    }

    checkShowRouteButton() {
        const showRouteBtn = document.getElementById('showRouteBtn');
        showRouteBtn.disabled = !this.selectedUser || !this.selectedDay;
    }

    showRoute() {
        if (!this.selectedUser || !this.selectedDay) return;

        console.log('ShowRoute called with:', this.selectedUser, this.selectedDay);

        // Get route data for selected user and day
        const routeData = this.journeyData
            .filter(item => item.userCode === this.selectedUser && item.day === this.selectedDay)
            .sort((a, b) => a.order - b.order);

        console.log('Route data found:', routeData);

        if (routeData.length === 0) {
            this.showError('No route data found for selected user and day.');
            return;
        }

        // Get user info
        const user = this.users.find(u => u.name === this.selectedUser);
        if (!user) {
            this.showError('User information not found.');
            return;
        }

        console.log('User found:', user);

        // Get outlet details
        const routeOutlets = routeData.map(item => {
            const outlet = this.outlets.find(o => o.code === item.outletCode);
            return {
                ...outlet,
                order: item.order
            };
        });

        console.log('Route outlets:', routeOutlets);

        // Display route on map
        this.displayRouteOnMap(routeOutlets, user);
        
        // Show route details
        this.displayRouteDetails(routeOutlets);
        
        // Show map and hide placeholder
        document.getElementById('map').style.display = 'block';
        document.getElementById('mapPlaceholder').style.display = 'none';
    }

    displayRouteOnMap(outlets, user) {
        // Clear previous markers and routes
        this.clearMap();

        if (!this.map) {
            this.showError('Map not initialized. Please check your API key.');
            return;
        }

        // Create waypoints from outlets
        const waypoints = outlets.map(outlet => ({
            location: new google.maps.LatLng(outlet.lat, outlet.lng),
            stopover: true
        }));

        // Create route request
        const request = {
            origin: new google.maps.LatLng(user.startLat, user.startLng),
            destination: new google.maps.LatLng(user.endLat, user.endLng),
            waypoints: waypoints,
            optimizeWaypoints: false, // Keep our optimized order
            travelMode: google.maps.TravelMode.DRIVING
        };

        // Get directions
        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.directionsRenderer.setDirections(result);
                
                // Add custom markers for outlets
                this.addOutletMarkers(outlets);
                
                // Add start/end markers
                this.addStartEndMarkers(user);
                
                // Calculate and display summary
                this.displayRouteSummary(result);
            } else {
                // Log the error for debugging
                console.log('Directions API not available, using enhanced visualization');
                
                // Use enhanced visualization without showing error to user
                this.showMarkersOnly(outlets, user);
            }
        });
    }

    addOutletMarkers(outlets) {
        outlets.forEach((outlet, index) => {
            const marker = new google.maps.Marker({
                position: { lat: outlet.lat, lng: outlet.lng },
                map: this.map,
                title: String(outlet.code || `Outlet ${index + 1}`), // Ensure title is a string
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontWeight: 'bold'
                },
                icon: {
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 10px;">
                        <h4 style="margin: 0 0 5px 0;">Stop ${index + 1}: ${outlet.code}</h4>
                        <p style="margin: 0;">Visit Order: ${outlet.order}</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
        });
    }

    addStartEndMarkers(user) {
        // Start marker
        const startMarker = new google.maps.Marker({
            position: { lat: user.startLat, lng: user.startLng },
            map: this.map,
            title: 'Start Location',
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
        });

        // End marker
        const endMarker = new google.maps.Marker({
            position: { lat: user.endLat, lng: user.endLng },
            map: this.map,
            title: 'End Location',
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }
        });

        this.markers.push(startMarker, endMarker);
    }

    showMarkersOnly(outlets, user) {
        // Clear map
        this.clearMap();

        // Create enhanced route visualization
        const path = [
            { lat: user.startLat, lng: user.startLng },
            ...outlets.map(o => ({ lat: o.lat, lng: o.lng })),
            { lat: user.endLat, lng: user.endLng }
        ];

        // Draw animated dashed polyline for the route
        const lineSymbol = {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            strokeWeight: 2,
            scale: 4
        };

        const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#4facfe',
            strokeOpacity: 0.3, // Changed from 0 to 0.3 for visibility
            strokeWeight: 3,
            icons: [{
                icon: lineSymbol,
                offset: '0',
                repeat: '20px'
            }],
            map: this.map
        });

        // Animate the dashed line (slower animation)
        let count = 0;
        window.setInterval(() => {
            count = (count + 1) % 200;
            const icons = polyline.get('icons');
            icons[0].offset = (count / 2) + '%';
            polyline.set('icons', icons);
        }, 50); // Increased from 20ms to 50ms for slower animation

        // Add curved connection lines between consecutive stops
        for (let i = 0; i < path.length - 1; i++) {
            this.drawCurvedPath(path[i], path[i + 1], i);
        }

        // Add all markers with enhanced styling
        this.addEnhancedOutletMarkers(outlets, user);
        this.addEnhancedStartEndMarkers(user);

        // Calculate and display estimated summary
        this.displayEstimatedSummary(outlets, user);

        // Fit bounds with padding
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        this.map.fitBounds(bounds, { padding: 50 });
    }

    drawCurvedPath(start, end, index) {
        // Create a curved path between two points
        const midLat = (start.lat + end.lat) / 2;
        const midLng = (start.lng + end.lng) / 2;
        
        // Calculate curve offset
        const latDiff = end.lat - start.lat;
        const lngDiff = end.lng - start.lng;
        const offset = 0.1; // Curve intensity
        
        // Create control point for quadratic bezier curve
        const controlLat = midLat - lngDiff * offset;
        const controlLng = midLng + latDiff * offset;
        
        // Generate curve points
        const curvePoints = [];
        for (let i = 0; i <= 50; i++) {
            const t = i / 50;
            const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * end.lat;
            const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * end.lng;
            curvePoints.push({ lat, lng });
        }
        
        // Draw the curved path
        const curve = new google.maps.Polyline({
            path: curvePoints,
            geodesic: false,
            strokeColor: index === 0 ? '#28a745' : '#4facfe', // Green for start, blue for others
            strokeOpacity: 0.8, // Increased opacity for better visibility
            strokeWeight: 5, // Increased width for better visibility
            map: this.map
        });
        
        // Add arrow at the end
        const arrowSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: index === 0 ? '#28a745' : '#4facfe',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: index === 0 ? '#28a745' : '#4facfe',
            fillOpacity: 0.8
        };
        
        curve.setOptions({
            icons: [{
                icon: arrowSymbol,
                offset: '100%'
            }]
        });
        
        this.markers.push(curve);
    }

    addEnhancedOutletMarkers(outlets, user) {
        // Initialize geocoder if not already done
        if (!this.geocoder) {
            this.geocoder = new google.maps.Geocoder();
        }

        outlets.forEach((outlet, index) => {
            // Create custom marker with animation
            const marker = new google.maps.Marker({
                position: { lat: outlet.lat, lng: outlet.lng },
                map: this.map,
                title: String(outlet.code || `Outlet ${index + 1}`),
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 25,
                    fillColor: '#4facfe',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    labelOrigin: new google.maps.Point(0, 0)
                },
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            });

            // Calculate distance from previous point
            let prevPoint = index === 0 ? user : outlets[index - 1];
            const distance = this.calculateDistance(
                prevPoint.startLat || prevPoint.lat,
                prevPoint.startLng || prevPoint.lng,
                outlet.lat,
                outlet.lng
            );

            // Create info window with placeholder for address
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="padding: 15px; min-width: 250px;">
                        <h3 style="margin: 0 0 10px 0; color: #4facfe;">Stop ${index + 1}</h3>
                        <p style="margin: 5px 0;"><strong>Outlet:</strong> ${outlet.code}</p>
                        <p style="margin: 5px 0;"><strong>Address:</strong> <span id="address-${index}" style="color: #666;">Loading...</span></p>
                        <p style="margin: 5px 0;"><strong>Visit Order:</strong> ${outlet.order}</p>
                        <p style="margin: 5px 0;"><strong>Distance from previous:</strong> ${distance.toFixed(1)} km</p>
                        <p style="margin: 5px 0;"><strong>Est. travel time:</strong> ${Math.round(distance / this.avgTravelSpeed * 60)} min</p>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
                
                // Perform reverse geocoding when info window opens
                this.geocoder.geocode({ location: { lat: outlet.lat, lng: outlet.lng } }, (results, status) => {
                    const addressElement = document.getElementById(`address-${index}`);
                    if (addressElement) {
                        if (status === 'OK' && results[0]) {
                            // Get a formatted address
                            let address = results[0].formatted_address;
                            // You can also get specific components like this:
                            // const components = results[0].address_components;
                            addressElement.textContent = address;
                            addressElement.style.color = '#333';
                        } else {
                            addressElement.textContent = 'Address not available';
                            addressElement.style.color = '#999';
                        }
                    }
                });
            });

            // Add hover effect
            marker.addListener('mouseover', () => {
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 30,
                    fillColor: '#00f2fe',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 4,
                    labelOrigin: new google.maps.Point(0, 0)
                });
            });

            marker.addListener('mouseout', () => {
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 25,
                    fillColor: '#4facfe',
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    labelOrigin: new google.maps.Point(0, 0)
                });
            });

            this.markers.push(marker);
        });
    }

    addEnhancedStartEndMarkers(user) {
        // Enhanced start marker
        const startMarker = new google.maps.Marker({
            position: { lat: user.startLat, lng: user.startLng },
            map: this.map,
            title: 'Start Location',
            animation: google.maps.Animation.DROP,
            icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                scale: 2,
                fillColor: '#28a745',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                anchor: new google.maps.Point(12, 24)
            }
        });

        // Enhanced end marker
        const endMarker = new google.maps.Marker({
            position: { lat: user.endLat, lng: user.endLng },
            map: this.map,
            title: 'End Location',
            animation: google.maps.Animation.DROP,
            icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                scale: 2,
                fillColor: '#dc3545',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                anchor: new google.maps.Point(12, 24)
            }
        });

        // Add info windows
        const startInfo = new google.maps.InfoWindow({
            content: '<div style="padding: 10px;"><h4 style="margin: 0; color: #28a745;">Start Location</h4></div>'
        });

        const endInfo = new google.maps.InfoWindow({
            content: '<div style="padding: 10px;"><h4 style="margin: 0; color: #dc3545;">End Location</h4></div>'
        });

        startMarker.addListener('click', () => {
            startInfo.open(this.map, startMarker);
        });

        endMarker.addListener('click', () => {
            endInfo.open(this.map, endMarker);
        });

        this.markers.push(startMarker, endMarker);
    }

    displayEstimatedSummary(outlets, user) {
        let totalDistance = 0;
        let currentPoint = { lat: user.startLat, lng: user.startLng };
        
        // Calculate total distance
        outlets.forEach(outlet => {
            totalDistance += this.calculateRoadDistance(currentPoint.lat, currentPoint.lng, outlet.lat, outlet.lng);
            currentPoint = outlet;
        });
        
        // Add distance to end location
        totalDistance += this.calculateRoadDistance(currentPoint.lat, currentPoint.lng, user.endLat, user.endLng);
        
        // Calculate times separately
        const travelTimeHours = totalDistance / this.avgTravelSpeed;
        const storeTimeHours = outlets.length * (this.avgTimePerOutlet / 60);
        const totalTimeHours = travelTimeHours + storeTimeHours;
        
        // Format times for display
        const formatTime = (hours) => {
            if (hours < 1) {
                return `${Math.round(hours * 60)} min`;
            } else {
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
            }
        };
        
        // Format clock time
        const formatClockTime = (decimalHours) => {
            // Handle times that go beyond 24 hours
            if (decimalHours >= 24) {
                return `Invalid (${decimalHours.toFixed(1)} hours)`;
            }
            const hours = Math.floor(decimalHours);
            const minutes = Math.round((decimalHours - hours) * 60);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };
        
        // Working hours constraints
        const employeeStartTime = 9.5; // Earliest start: 9:30 AM
        const employeeEndTime = 19.5; // Latest end: 7:30 PM
        const outletOpenTime = 10; // Outlets open at 10:00 AM
        
        // Calculate when employee needs to leave to reach first outlet
        const timeToFirstOutlet = outlets.length > 0 ? 
            this.calculateTravelTime(user.startLat, user.startLng, outlets[0].lat, outlets[0].lng) / 60 : 0;
        
        // Employee should arrive at first outlet when it opens (10 AM) or later
        const idealDepartureTime = outletOpenTime - timeToFirstOutlet;
        
        // But not earlier than 9:30 AM
        const actualDayStartTime = Math.max(idealDepartureTime, employeeStartTime);
        
        // Calculate actual end time based on start time + total duration
        const actualDayEndTime = actualDayStartTime + totalTimeHours;
        
        // Check if route violates constraints
        if (actualDayStartTime < employeeStartTime) {
            console.warn(`Route would require starting at ${formatClockTime(idealDepartureTime)} (before 9:30 AM)`);
        }
        if (actualDayEndTime > employeeEndTime) {
            console.warn(`Route would end at ${formatClockTime(actualDayEndTime)} (after 7:30 PM) - Total duration: ${totalTimeHours.toFixed(1)} hours`);
        }
        
        document.getElementById('dayStart').textContent = formatClockTime(actualDayStartTime);
        document.getElementById('dayEnd').textContent = formatClockTime(actualDayEndTime);
        document.getElementById('totalOutlets').textContent = outlets.length;
        document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
        document.getElementById('travelTime').textContent = formatTime(travelTimeHours);
        document.getElementById('storeTime').textContent = formatTime(storeTimeHours);
        document.getElementById('totalDuration').textContent = formatTime(totalTimeHours);
        document.getElementById('routeSummary').style.display = 'block';
    }

    displayRouteSummary(directionsResult) {
        let totalDistance = 0;
        let totalDuration = 0;

        directionsResult.routes[0].legs.forEach(leg => {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
        });

        const outletCount = this.markers.length - 2; // Exclude start/end
        const travelTimeHours = totalDuration / 3600;
        const storeTimeHours = outletCount * (this.avgTimePerOutlet / 60);
        const totalTimeHours = travelTimeHours + storeTimeHours;

        // Format times for display
        const formatTime = (hours) => {
            if (hours < 1) {
                return `${Math.round(hours * 60)} min`;
            } else {
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                return m > 0 ? `${h}h ${m}m` : `${h}h`;
            }
        };

        // Format clock time
        const formatClockTime = (decimalHours) => {
            // Handle times that go beyond 24 hours
            if (decimalHours >= 24) {
                return `Invalid (${decimalHours.toFixed(1)} hours)`;
            }
            const hours = Math.floor(decimalHours);
            const minutes = Math.round((decimalHours - hours) * 60);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };
        
        // Working hours constraints
        const employeeStartTime = 9.5; // Earliest start: 9:30 AM
        const employeeEndTime = 19.5; // Latest end: 7:30 PM
        
        // For Google Directions result, we already have accurate times
        // So we'll just use the standard start time and calculated end
        const actualDayStartTime = employeeStartTime; // Assume standard 9:30 AM start
        const actualDayEndTime = actualDayStartTime + totalTimeHours;
        
        // Check if route violates constraints
        if (actualDayEndTime > employeeEndTime) {
            console.warn(`Route would end at ${formatClockTime(actualDayEndTime)} (after 7:30 PM) - Total duration: ${totalTimeHours.toFixed(1)} hours`);
        }
        
        document.getElementById('dayStart').textContent = formatClockTime(actualDayStartTime);
        document.getElementById('dayEnd').textContent = formatClockTime(actualDayEndTime);
        document.getElementById('totalOutlets').textContent = outletCount;
        document.getElementById('totalDistance').textContent = (totalDistance / 1000).toFixed(1);
        document.getElementById('travelTime').textContent = formatTime(travelTimeHours);
        document.getElementById('storeTime').textContent = formatTime(storeTimeHours);
        document.getElementById('totalDuration').textContent = formatTime(totalTimeHours);
        document.getElementById('routeSummary').style.display = 'block';
    }

    displayRouteDetails(outlets) {
        const outletsList = document.getElementById('outletsList');
        outletsList.innerHTML = '';

        outlets.forEach((outlet, index) => {
            const outletItem = document.createElement('div');
            outletItem.className = 'outlet-item';
            outletItem.innerHTML = `
                <div class="outlet-number">${index + 1}</div>
                <div class="outlet-info">
                    <h4>${outlet.code}</h4>
                    <p>Location: ${outlet.lat.toFixed(4)}, ${outlet.lng.toFixed(4)}</p>
                </div>
                <div class="outlet-actions">
                    <button class="outlet-action-btn" onclick="routeViewer.focusOnOutlet(${outlet.lat}, ${outlet.lng})">
                        📍 View on Map
                    </button>
                </div>
            `;
            outletsList.appendChild(outletItem);
        });

        document.getElementById('routeDetails').style.display = 'block';
    }

    focusOnOutlet(lat, lng) {
        if (this.map) {
            this.map.setCenter({ lat, lng });
            this.map.setZoom(16);
        }
    }

    clearMap() {
        // Clear markers
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];

        // Clear directions
        if (this.directionsRenderer) {
            this.directionsRenderer.setDirections({ routes: [] });
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula for accurate distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    calculateRoadDistance(lat1, lng1, lat2, lng2) {
        // Apply road distance factor to linear distance
        const roadDistanceFactor = 1.3;
        return this.calculateDistance(lat1, lng1, lat2, lng2) * roadDistanceFactor;
    }

    calculateTravelTime(lat1, lng1, lat2, lng2) {
        // Calculate travel time in minutes
        const roadDistance = this.calculateRoadDistance(lat1, lng1, lat2, lng2);
        return (roadDistance / this.avgTravelSpeed) * 60; // Convert hours to minutes
    }

    showError(message) {
        alert(message); // You can replace with a better notification system
    }
}

// Initialize the route viewer
let routeViewer;
document.addEventListener('DOMContentLoaded', () => {
    routeViewer = new RouteViewer();
});