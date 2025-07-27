class JourneyPlanner {
    constructor() {
        this.outlets = [];
        this.users = [];
        this.avgTimePerOutlet = 60; // minutes
        this.avgTravelSpeed = 25; // km/hr
        this.workingHours = { start: 9.5, end: 19.5 }; // 9:30 AM to 7:30 PM
        this.outletHours = { start: 10, end: 19 }; // 10 AM to 7 PM
        console.log('JourneyPlanner v9 initialized - FIXED VERSION with aggressive time constraints - Outlet hours:', this.outletHours);
        this.daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.roadDistanceFactor = 1.3; // Linear distance × 1.3 ≈ road distance
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('excelFile');
        const fileInputDisplay = document.getElementById('fileInputDisplay');
        const form = document.getElementById('plannerForm');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileInputDisplay.textContent = `✅ ${file.name}`;
                fileInputDisplay.classList.add('has-file');
                document.getElementById('fileInfo').textContent = 
                    `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            } else {
                fileInputDisplay.textContent = '📎 Click here to select your Excel file or drag & drop';
                fileInputDisplay.classList.remove('has-file');
                document.getElementById('fileInfo').textContent = '';
            }
        });

        fileInputDisplay.addEventListener('click', () => {
            fileInput.click();
        });

        fileInputDisplay.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = '#00f2fe';
            fileInputDisplay.style.background = '#f0f7ff';
        });

        fileInputDisplay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = '#4facfe';
            fileInputDisplay.style.background = '#f8f9ff';
        });

        fileInputDisplay.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputDisplay.style.borderColor = '#4facfe';
            fileInputDisplay.style.background = '#f8f9ff';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processFile();
        });
    }

    async processFile() {
        const fileInput = document.getElementById('excelFile');
        const avgTimeInput = document.getElementById('avgTime');
        const avgSpeedInput = document.getElementById('avgSpeed');
        
        if (!fileInput.files[0]) {
            this.showMessage('Please select an Excel file', 'error');
            return;
        }

        this.avgTimePerOutlet = parseInt(avgTimeInput.value);
        this.avgTravelSpeed = parseInt(avgSpeedInput.value);
        this.showLoading(true);

        try {
            const file = fileInput.files[0];
            const data = await this.readExcelFile(file);
            
            if (this.validateData(data)) {
                const result = this.generateJourneyPlan();
                this.downloadResults(result);
                
                // Store data for route visualization
                this.storeDataForVisualization(result);
                
                if (result.hasShortfall) {
                    this.showMessage(
                        'We tried our best but could not plan as per your requirement due to travel time constraints. The best possible planning and the shortfall can be found in the downloaded attachment. <br><br><a href="route-viewer.html" style="color: #4facfe; font-weight: bold;">View Routes on Map →</a>',
                        'warning'
                    );
                } else {
                    this.showMessage(
                        '🎉 Realistic journey plan generated successfully! Your time-optimized routes have been downloaded. <br><br><a href="route-viewer.html" style="color: #4facfe; font-weight: bold;">View Routes on Map →</a>',
                        'success'
                    );
                }
            }
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const outletsSheet = workbook.Sheets['Outlets'];
                    const usersSheet = workbook.Sheets['Users'];
                    
                    if (!outletsSheet || !usersSheet) {
                        throw new Error('Required sheets "Outlets" and "Users" not found');
                    }

                    const outlets = XLSX.utils.sheet_to_json(outletsSheet);
                    const users = XLSX.utils.sheet_to_json(usersSheet);
                    
                    resolve({ outlets, users });
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    getColumnValue(row, possibleNames) {
        for (let name of possibleNames) {
            if (row.hasOwnProperty(name) && row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name];
            }
        }
        return null;
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
        return this.calculateDistance(lat1, lng1, lat2, lng2) * this.roadDistanceFactor;
    }

    calculateTravelTime(lat1, lng1, lat2, lng2) {
        // Calculate travel time in minutes
        const roadDistance = this.calculateRoadDistance(lat1, lng1, lat2, lng2);
        return (roadDistance / this.avgTravelSpeed) * 60; // Convert hours to minutes
    }

    canFitInDay(outlets, user) {
        // Use the same strict validation as validateRouteTime
        return this.validateRouteTime(outlets, user);
    }

    optimizeRouteWithTimeConstraints(outlets, user) {
        if (outlets.length <= 1) return outlets;

        // Start with nearest neighbor from start location
        let route = [];
        let remaining = [...outlets];
        let currentLat = user.startLat;
        let currentLng = user.startLng;
        let currentTime = this.workingHours.start * 60; // Track current time during route building

        while (remaining.length > 0) {
            let bestIndex = -1;
            let bestScore = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const outlet = remaining[i];
                const travelTime = this.calculateTravelTime(currentLat, currentLng, outlet.lat, outlet.lng);
                
                // Calculate when we would arrive at this outlet
                let arrivalTime = currentTime + travelTime;
                
                // If we arrive before outlet opening, wait until opening
                if (arrivalTime < this.outletHours.start * 60) {
                    arrivalTime = this.outletHours.start * 60;
                }
                
                // Check if we can complete the visit before outlet closing
                if (arrivalTime + this.avgTimePerOutlet > this.outletHours.end * 60) {
                    console.log(`Skipping outlet ${outlet.code}: Would finish at ${(arrivalTime + this.avgTimePerOutlet)/60} hours (after 7 PM)`);
                    continue; // Skip this outlet, can't complete visit before closing
                }
                
                // Check if we can still return home after this visit
                const departureTime = arrivalTime + this.avgTimePerOutlet;
                const returnTime = this.calculateTravelTime(outlet.lat, outlet.lng, user.endLat, user.endLng);
                if (departureTime + returnTime > this.workingHours.end * 60) {
                    continue; // Skip this outlet, can't return home in time
                }
                
                // Score based on travel time (primary) and distance (secondary)
                const distance = this.calculateDistance(currentLat, currentLng, outlet.lat, outlet.lng);
                const score = travelTime * 2 + distance;
                
                if (score < bestScore) {
                    bestScore = score;
                    bestIndex = i;
                }
            }

            // No more outlets can be visited within constraints
            if (bestIndex === -1) {
                break;
            }

            const selectedOutlet = remaining.splice(bestIndex, 1)[0];
            route.push(selectedOutlet);
            
            // Update current position and time
            const travelTime = this.calculateTravelTime(currentLat, currentLng, selectedOutlet.lat, selectedOutlet.lng);
            currentTime += travelTime;
            
            // Wait if arrived before opening
            if (currentTime < this.outletHours.start * 60) {
                currentTime = this.outletHours.start * 60;
            }
            
            currentTime += this.avgTimePerOutlet; // Add time spent at outlet
            currentLat = selectedOutlet.lat;
            currentLng = selectedOutlet.lng;
        }

        // Verify the route fits in the day using STRICT validation
        const endTime = this.calculateRouteEndTime(route, user);
        const endHours = endTime / 60;
        console.log(`Route optimization: Initial route would end at ${Math.floor(endHours)}:${Math.round((endHours % 1) * 60).toString().padStart(2, '0')}`);
        
        while (route.length > 0 && !this.validateRouteTime(route, user)) {
            const removed = route.pop();
            console.log(`Removing outlet ${removed.code} during optimization to meet 7:30 PM constraint`);
        }

        return route;
    }

    calculateRouteEndTime(outlets, user) {
        if (outlets.length === 0) return this.workingHours.start * 60;
        
        let currentTime = this.workingHours.start * 60;
        let currentLat = user.startLat;
        let currentLng = user.startLng;
        let totalTravelTime = 0;
        
        console.log(`\n--- Route Time Calculation for ${user.name} ---`);
        const startHours = Math.floor(this.workingHours.start);
        const startMinutes = Math.round((this.workingHours.start % 1) * 60);
        console.log(`Start time: ${startHours}:${startMinutes.toString().padStart(2, '0')} (${currentTime} minutes)`);
        
        // Time to first outlet
        const firstTravelTime = this.calculateTravelTime(currentLat, currentLng, outlets[0].lat, outlets[0].lng);
        currentTime += firstTravelTime;
        totalTravelTime += firstTravelTime;
        console.log(`Travel to first outlet: ${firstTravelTime.toFixed(1)} min, Current time: ${(currentTime/60).toFixed(2)} hours`);
        
        // Wait if arrive before 10 AM
        if (currentTime < this.outletHours.start * 60) {
            const openHours = Math.floor(this.outletHours.start);
            const openMinutes = Math.round((this.outletHours.start % 1) * 60);
            console.log(`Waiting until outlet opens at ${openHours}:${openMinutes.toString().padStart(2, '0')}`);
            currentTime = this.outletHours.start * 60;
        }
        
        // Visit each outlet
        for (let i = 0; i < outlets.length; i++) {
            currentTime += this.avgTimePerOutlet;
            console.log(`Visit outlet ${i+1} (${outlets[i].code}): +${this.avgTimePerOutlet} min, Current time: ${(currentTime/60).toFixed(2)} hours`);
            currentLat = outlets[i].lat;
            currentLng = outlets[i].lng;
            
            if (i < outlets.length - 1) {
                const travelTime = this.calculateTravelTime(currentLat, currentLng, outlets[i + 1].lat, outlets[i + 1].lng);
                currentTime += travelTime;
                totalTravelTime += travelTime;
                console.log(`Travel to next outlet: ${travelTime.toFixed(1)} min, Current time: ${(currentTime/60).toFixed(2)} hours`);
            }
        }
        
        // Return to base
        const returnTime = this.calculateTravelTime(currentLat, currentLng, user.endLat, user.endLng);
        currentTime += returnTime;
        totalTravelTime += returnTime;
        console.log(`Return to base: ${returnTime.toFixed(1)} min, Final time: ${(currentTime/60).toFixed(2)} hours`);
        console.log(`Total travel time: ${totalTravelTime.toFixed(1)} min, Total outlet time: ${outlets.length * this.avgTimePerOutlet} min`);
        console.log(`--- End of calculation ---\n`);
        
        return currentTime;
    }

    validateRouteTime(outlets, user) {
        const endTime = this.calculateRouteEndTime(outlets, user);
        const finishTime = endTime / 60; // Convert to hours
        
        const hours = Math.floor(finishTime);
        const minutes = Math.round((finishTime % 1) * 60);
        const limitHours = Math.floor(this.workingHours.end);
        const limitMinutes = Math.round((this.workingHours.end % 1) * 60);
        
        console.log(`Route validation: Would finish at ${hours}:${minutes.toString().padStart(2, '0')} (${finishTime.toFixed(2)} hours)`);
        console.log(`Working hours limit: ${limitHours}:${limitMinutes.toString().padStart(2, '0')} (${this.workingHours.end} hours)`);
        console.log(`Within limits: ${endTime <= this.workingHours.end * 60} (${endTime} minutes <= ${this.workingHours.end * 60} minutes)`);
        
        return endTime <= this.workingHours.end * 60;
    }

    enforceTimeConstraints(outlets, user) {
        // Keep removing outlets from the end until the route fits
        let validRoute = [...outlets];
        
        while (validRoute.length > 0 && !this.validateRouteTime(validRoute, user)) {
            console.log(`Removing outlet ${validRoute[validRoute.length - 1].code} to fit time constraint`);
            validRoute.pop();
        }
        
        return validRoute;
    }

    validateData(data) {
        const { outlets, users } = data;

        if (!outlets || outlets.length === 0) {
            throw new Error('No outlets found in the Outlets sheet');
        }

        const outletCodeNames = [
            'Outlet Code', 'outlet code', 'OutletCode', 'Outlet_Code', 'outlet_code',
            'Outley Code', 'outley code', 'OutleyCode', 'Outley_Code', 'outley_code'
        ];
        const latitudeNames = [
            'Lattitude', 'Latitude', 'lattitude', 'latitude', 'Lat', 'lat'
        ];
        const longitudeNames = [
            'Longitude', 'longitude', 'Lng', 'lng', 'Long', 'long'
        ];
        const frequencyNames = [
            'Visit frequency', 'visit frequency', 'VisitFrequency', 'Visit_frequency', 
            'Frequency', 'frequency', 'Visit Frequency', 'visit Frequency'
        ];

        outlets.forEach((outlet, index) => {
            const outletCode = this.getColumnValue(outlet, outletCodeNames);
            const latitude = this.getColumnValue(outlet, latitudeNames);
            const longitude = this.getColumnValue(outlet, longitudeNames);
            const frequency = this.getColumnValue(outlet, frequencyNames);

            if (!outletCode || !latitude || !longitude || !frequency) {
                throw new Error(`Missing required data in row ${index + 2} of Outlets sheet`);
            }

            if (isNaN(latitude) || isNaN(longitude) || isNaN(frequency)) {
                throw new Error(`Invalid numeric values in row ${index + 2} of Outlets sheet`);
            }

            if (parseFloat(frequency) <= 0) {
                throw new Error(`Visit frequency must be positive in row ${index + 2} of Outlets sheet`);
            }
        });

        if (!users || users.length === 0) {
            throw new Error('No users found in the Users sheet');
        }

        const userNameNames = [
            'User Name', 'user name', 'UserName', 'User_Name', 'Name', 'name'
        ];
        const startLocationNames = [
            'Start Location', 'start location', 'StartLocation', 'Start_Location',
            'Start location', 'start Location'
        ];
        const endLocationNames = [
            'End Location', 'end location', 'EndLocation', 'End_Location',
            'End location', 'end Location'
        ];
        const weekOffDayNames = [
            'Week Off Day', 'week off day', 'WeekOffDay', 'Week_Off_Day', 'OffDay', 'off day'
        ];

        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        users.forEach((user, index) => {
            const userName = this.getColumnValue(user, userNameNames);
            const startLocation = this.getColumnValue(user, startLocationNames);
            const endLocation = this.getColumnValue(user, endLocationNames);
            const weekOffDay = this.getColumnValue(user, weekOffDayNames);

            if (!userName || !startLocation || !endLocation || !weekOffDay) {
                throw new Error(`Missing required data in row ${index + 2} of Users sheet`);
            }

            if (!validDays.includes(weekOffDay.toString().trim())) {
                throw new Error(`Invalid Week Off Day "${weekOffDay}" in row ${index + 2} of Users sheet`);
            }

            const startParts = startLocation.toString().trim().split(/\s+/);
            const endParts = endLocation.toString().trim().split(/\s+/);
            
            if (startParts.length !== 2 || endParts.length !== 2 || 
                isNaN(startParts[0]) || isNaN(startParts[1]) || 
                isNaN(endParts[0]) || isNaN(endParts[1])) {
                throw new Error(`Invalid location format in row ${index + 2} of Users sheet`);
            }
        });

        this.outlets = outlets.map(outlet => ({
            code: this.getColumnValue(outlet, outletCodeNames),
            lat: parseFloat(this.getColumnValue(outlet, latitudeNames)),
            lng: parseFloat(this.getColumnValue(outlet, longitudeNames)),
            frequency: parseInt(this.getColumnValue(outlet, frequencyNames)),
            remainingVisits: parseInt(this.getColumnValue(outlet, frequencyNames))
        }));

        this.users = users.map(user => {
            const startParts = this.getColumnValue(user, startLocationNames).toString().trim().split(/\s+/);
            const endParts = this.getColumnValue(user, endLocationNames).toString().trim().split(/\s+/);
            return {
                name: this.getColumnValue(user, userNameNames),
                startLat: parseFloat(startParts[0]),
                startLng: parseFloat(startParts[1]),
                endLat: parseFloat(endParts[0]),
                endLng: parseFloat(endParts[1]),
                weekOffDay: this.getColumnValue(user, weekOffDayNames).toString().trim()
            };
        });

        return true;
    }

    generateJourneyPlan() {
        const plan = [];
        const shortfalls = [];
        const weeks = ['1st', '2nd', '3rd', '4th'];
        
        // Initialize user schedules
        const userSchedules = {};
        this.users.forEach(user => {
            userSchedules[user.name] = {};
            weeks.forEach(week => {
                this.daysOfWeek.forEach(day => {
                    if (day !== user.weekOffDay) {
                        userSchedules[user.name][`${week} ${day}`] = [];
                    }
                });
            });
        });

        // Reset remaining visits
        this.outlets.forEach(outlet => {
            outlet.remainingVisits = outlet.frequency;
        });

        // Distribute outlets across users and days with time constraints
        console.log(`Starting outlet distribution for ${this.outlets.length} outlets and ${this.users.length} users`);
        this.outlets.forEach((outlet, index) => {
            console.log(`\nProcessing outlet ${index + 1}/${this.outlets.length}: ${outlet.code} at (${outlet.lat}, ${outlet.lng})`);
            const visitsScheduled = this.scheduleOutletVisitsWithTimeConstraints(outlet, userSchedules);
            
            if (visitsScheduled < outlet.frequency) {
                console.log(`⚠️ Outlet ${outlet.code} shortfall: scheduled ${visitsScheduled}/${outlet.frequency} visits`);
                shortfalls.push({
                    outletCode: outlet.code,
                    shortfall: outlet.frequency - visitsScheduled
                });
            } else {
                console.log(`✓ Outlet ${outlet.code} fully scheduled: ${visitsScheduled} visits`);
            }
        });

        // Generate final plan with time-optimized visit orders
        console.log('\nGenerating final optimized routes...');
        Object.keys(userSchedules).forEach(userName => {
            const user = this.users.find(u => u.name === userName);
            Object.keys(userSchedules[userName]).forEach(day => {
                const dayOutlets = userSchedules[userName][day];
                if (dayOutlets.length > 0) {
                    console.log(`\nOptimizing ${userName}'s ${day}: ${dayOutlets.length} outlets`);
                    // Optimize route considering time constraints
                    let optimizedRoute = this.optimizeRouteWithTimeConstraints(dayOutlets, user);
                    console.log(`After optimization: ${optimizedRoute.length} outlets`);
                    
                    // CRITICAL: Validate the optimized route actually fits in the day
                    console.log(`Validating route for ${userName}'s ${day}...`);
                    const endTime = this.calculateRouteEndTime(optimizedRoute, user);
                    const endHours = endTime / 60;
                    console.log(`Route would end at: ${Math.floor(endHours)}:${Math.round((endHours % 1) * 60).toString().padStart(2, '0')}`);
                    
                    if (!this.validateRouteTime(optimizedRoute, user)) {
                        console.log(`⚠️ Optimized route exceeds 7:30 PM! Removing outlets...`);
                        console.log(`Current outlets: ${optimizedRoute.map(o => o.code).join(', ')}`);
                        optimizedRoute = this.enforceTimeConstraints(optimizedRoute, user);
                        console.log(`After enforcing constraints: ${optimizedRoute.length} outlets`);
                        console.log(`Remaining outlets: ${optimizedRoute.map(o => o.code).join(', ')}`);
                        
                        // Track removed outlets as shortfalls
                        const removedOutlets = dayOutlets.filter(outlet => 
                            !optimizedRoute.some(o => o.code === outlet.code)
                        );
                        removedOutlets.forEach(outlet => {
                            const existing = shortfalls.find(s => s.outletCode === outlet.code);
                            if (existing) {
                                existing.shortfall += 1;
                            } else {
                                shortfalls.push({
                                    outletCode: outlet.code,
                                    shortfall: 1
                                });
                            }
                        });
                    }
                    
                    optimizedRoute.forEach((outlet, index) => {
                        plan.push({
                            userCode: userName,
                            day: day,
                            order: index + 1,
                            outletCode: outlet.code
                        });
                    });
                }
            });
        });

        // FINAL SAFETY CHECK: Validate all routes one more time
        console.log('\n=== FINAL ROUTE VALIDATION ===');
        console.log('Working hours:', this.workingHours);
        console.log('Plan has', plan.length, 'entries');
        
        const validatedPlan = [];
        let violationCount = 0;
        
        Object.keys(userSchedules).forEach(userName => {
            const user = this.users.find(u => u.name === userName);
            console.log(`\nValidating routes for ${userName}...`);
            
            Object.keys(userSchedules[userName]).forEach(day => {
                const dayPlan = plan.filter(p => p.userCode === userName && p.day === day);
                if (dayPlan.length > 0) {
                    const outlets = dayPlan
                        .sort((a, b) => a.order - b.order)
                        .map(p => this.outlets.find(o => o.code === p.outletCode));
                    
                    console.log(`Checking ${day}: ${outlets.length} outlets`);
                    console.log('Outlet codes:', outlets.map(o => o.code).join(', '));
                    
                    const endTime = this.calculateRouteEndTime(outlets, user);
                    const endHours = endTime / 60;
                    const endTimeStr = `${Math.floor(endHours)}:${Math.round((endHours % 1) * 60).toString().padStart(2, '0')}`;
                    console.log(`Route ends at: ${endTimeStr} (${endHours.toFixed(2)} hours)`);
                    console.log(`Working hours end at: ${this.workingHours.end} (${this.workingHours.end * 60} minutes)`);
                    console.log(`Route end time in minutes: ${endTime}, Limit: ${this.workingHours.end * 60}`);
                    
                    if (endTime > this.workingHours.end * 60) {
                        violationCount++;
                        console.error(`❌ CRITICAL ERROR: Route exceeds 7:30 PM by ${((endTime - this.workingHours.end * 60) / 60).toFixed(1)} hours!`);
                        console.log('Enforcing time constraints...');
                        
                        // Force remove outlets until it fits
                        const enforcedRoute = this.enforceTimeConstraints(outlets, user);
                        console.log(`Reduced from ${outlets.length} to ${enforcedRoute.length} outlets`);
                        console.log('Remaining outlets:', enforcedRoute.map(o => o.code).join(', '));
                        
                        // Recalculate to verify
                        const newEndTime = this.calculateRouteEndTime(enforcedRoute, user);
                        const newEndHours = newEndTime / 60;
                        console.log(`New end time: ${Math.floor(newEndHours)}:${Math.round((newEndHours % 1) * 60).toString().padStart(2, '0')}`);
                        
                        enforcedRoute.forEach((outlet, index) => {
                            validatedPlan.push({
                                userCode: userName,
                                day: day,
                                order: index + 1,
                                outletCode: outlet.code
                            });
                        });
                        
                        // Add removed outlets to shortfalls
                        const removedOutlets = outlets.filter(o => !enforcedRoute.some(e => e.code === o.code));
                        removedOutlets.forEach(outlet => {
                            console.log(`Adding ${outlet.code} to shortfalls`);
                            const existing = shortfalls.find(s => s.outletCode === outlet.code);
                            if (existing) {
                                existing.shortfall += 1;
                            } else {
                                shortfalls.push({
                                    outletCode: outlet.code,
                                    shortfall: 1
                                });
                            }
                        });
                    } else {
                        console.log('✓ Route is within working hours');
                        validatedPlan.push(...dayPlan);
                    }
                }
            });
        });
        
        console.log(`\n=== VALIDATION COMPLETE ===`);
        console.log(`Found ${violationCount} routes exceeding 7:30 PM`);
        console.log(`Final plan has ${validatedPlan.length} entries`);
        console.log(`Shortfalls: ${shortfalls.length} outlets`);

        return {
            plan: validatedPlan,
            shortfalls: shortfalls,
            hasShortfall: shortfalls.length > 0
        };
    }

    scheduleOutletVisitsWithTimeConstraints(outlet, userSchedules) {
        let visitsScheduled = 0;

        for (let visit = 0; visit < outlet.frequency; visit++) {
            let bestOption = null;
            let bestScore = Infinity;

            Object.keys(userSchedules).forEach(userName => {
                const user = this.users.find(u => u.name === userName);
                Object.keys(userSchedules[userName]).forEach(day => {
                    const dayOutlets = [...userSchedules[userName][day], outlet];
                    
                    // Calculate distance to this outlet
                    const distance = this.calculateDistance(
                        user.startLat, user.startLng,
                        outlet.lat, outlet.lng
                    );
                    
                    // Calculate maximum feasible one-way distance
                    // (Total working hours - outlet time - buffer) / 2 * speed
                    const totalWorkingMinutes = (this.workingHours.end - this.workingHours.start) * 60;
                    const maxOneWayMinutes = (totalWorkingMinutes - this.avgTimePerOutlet - 60) / 2; // 60 min buffer
                    const maxOneWayDistance = (maxOneWayMinutes / 60) * this.avgTravelSpeed;
                    
                    // Skip outlets that are impossibly far
                    if (distance > maxOneWayDistance) {
                        console.log(`Skipping outlet ${outlet.code} for ${userName} - too far: ${distance.toFixed(1)} km (max: ${maxOneWayDistance.toFixed(1)} km)`);
                        return;
                    }
                    
                    // Optimize the route BEFORE checking if it fits
                    const optimizedDayOutlets = this.optimizeRouteWithTimeConstraints(dayOutlets, user);
                    
                    // Check if the optimized route still includes this outlet and fits time constraints
                    const outletInOptimized = optimizedDayOutlets.some(o => o.code === outlet.code);
                    
                    // Add a 90-minute buffer to prevent overfilling days (MORE AGGRESSIVE)
                    const routeEndTime = this.calculateRouteEndTime(optimizedDayOutlets, user);
                    const bufferMinutes = 90; // 1.5 hour buffer
                    const maxAllowedTime = this.workingHours.end * 60 - bufferMinutes; // 6:00 PM instead of 7:30 PM
                    
                    // Double-check with strict validation
                    const passesStrictValidation = this.validateRouteTime(optimizedDayOutlets, user);
                    
                    if (outletInOptimized && routeEndTime <= maxAllowedTime && passesStrictValidation) {
                        // Calculate score with heavy penalty for distance
                        const travelTime = this.calculateTravelTime(
                            user.startLat, user.startLng,
                            outlet.lat, outlet.lng
                        );
                        const currentLoad = userSchedules[userName][day].length;
                        
                        // Exponential penalty for very distant outlets
                        const distancePenalty = distance > 30 ? Math.pow(distance / 30, 2) * 100 : 0;
                        const score = travelTime + (currentLoad * 30) + distancePenalty;
                        
                        if (score < bestScore) {
                            bestScore = score;
                            bestOption = { userName, day };
                            console.log(`Potential assignment: ${outlet.code} to ${userName}'s ${day} (distance: ${distance.toFixed(1)} km, score: ${score.toFixed(1)})`);
                        }
                    } else if (!outletInOptimized) {
                        console.log(`Outlet ${outlet.code} was removed during optimization for ${userName}'s ${day}`);
                    }
                });
            });

            if (bestOption) {
                userSchedules[bestOption.userName][bestOption.day].push(outlet);
                visitsScheduled++;
                console.log(`✓ Assigned outlet ${outlet.code} to ${bestOption.userName}'s ${bestOption.day}`)
            } else {
                console.log(`✗ Could not assign outlet ${outlet.code} visit ${visit + 1} - no suitable day found`);
            }
        }

        return visitsScheduled;
    }

    downloadResults(result) {
        const wb = XLSX.utils.book_new();

        // Main plan sheet
        const planSheet = XLSX.utils.json_to_sheet(
            result.plan.map(item => ({
                'User Code': item.userCode,
                'Day': item.day,
                'Order': item.order,
                'Outlet Code': item.outletCode
            }))
        );
        XLSX.utils.book_append_sheet(wb, planSheet, 'Journey Plan');

        // Shortfall sheet if needed
        if (result.hasShortfall) {
            const shortfallSheet = XLSX.utils.json_to_sheet(
                result.shortfalls.map(item => ({
                    'Outlet Code': item.outletCode,
                    'Visit Shortfall': item.shortfall
                }))
            );
            XLSX.utils.book_append_sheet(wb, shortfallSheet, 'Visit Shortfall');
        }

        // Download file
        const fileName = `Journey_Plan_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    storeDataForVisualization(result) {
        console.log('\n=== STORING DATA FOR VISUALIZATION ===');
        console.log('Plan entries:', result.plan.length);
        console.log('Shortfalls:', result.shortfalls.length);
        
        // Log a sample of what's being stored
        const sampleUser = result.plan[0]?.userCode;
        if (sampleUser) {
            const userRoutes = result.plan.filter(p => p.userCode === sampleUser);
            const routesByDay = {};
            userRoutes.forEach(r => {
                if (!routesByDay[r.day]) routesByDay[r.day] = [];
                routesByDay[r.day].push(r.outletCode);
            });
            console.log(`Sample - ${sampleUser}'s routes:`, routesByDay);
        }
        
        // Store journey plan data in localStorage for route viewer
        const dataToStore = {
            plan: result.plan,
            outlets: this.outlets,
            users: this.users,
            generatedAt: new Date().toISOString()
        };
        localStorage.setItem('journeyPlanData', JSON.stringify(dataToStore));
        console.log('Data stored in localStorage');
    }

    showMessage(text, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.innerHTML = text; // Changed from textContent to innerHTML to support links
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Don't auto-hide if there's a link in the message
        if (!text.includes('<a')) {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 8000);
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
        document.getElementById('generateBtn').disabled = show;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new JourneyPlanner();
});