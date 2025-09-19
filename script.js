document.addEventListener('DOMContentLoaded', () => {
    // Original code variables
    const gridContainer = document.getElementById('traffic-simulation-grid');
    const detailsView = document.getElementById('details-view');
    const backButton = document.getElementById('back-button');
    const tooltip = document.getElementById('hover-tooltip');
    const tooltipName = document.getElementById('tooltip-name');
    const tooltipVehicles = document.getElementById('tooltip-vehicles');
    const tooltipSpeed = document.getElementById('tooltip-speed');
    const manualControlButton = document.getElementById('manual-control-button');
    const manualControlSection = document.getElementById('manual-control-section');
    const detailsVehiclesEl = document.getElementById('details-vehicles');
    const detailsSpeedEl = document.getElementById('details-speed');
    const laneControlsContainer = document.getElementById('lane-controls-container');

    // New code variables
    let currentDetailsIntersection = null;
    // REMOVED: const themeToggle = document.querySelector('.theme-toggle');
    const navTabs = document.getElementById('nav-tabs');
    const pages = document.querySelectorAll('.page');
    const intersectionSelect = document.getElementById('intersection-select');
    const hotspotTagsContainer = document.getElementById('hotspot-tags');
    const statsOverview = document.getElementById('stats-overview');

    const bhubaneswarIntersections = [
        "Jaydev Vihar", "Vani Vihar", "Master Canteen", "Acharya Vihar", "Rasulgarh",
        "Kalinga Hospital", "Patia Square", "Dhauli Square", "Sishupalgarh", "Khandagiri",
        "Chandrasekharpur", "Infocity Square", "KIIT Square", "Nandankanan", "Damana",
        "Palasuni", "Bomikhal", "Laxmi Sagar", "Saheed Nagar", "Cuttack Road",
        "Gajapati Nagar", "Nayapalli", "Bhubaneswar Airport", "Capital Hospital", "Madhusudan Nagar",
        "Forest Park", "Baramunda", "Sikharchandi", "Mancheswar", "Patrapada"
    ];
    
    // This is our main data structure now, combining the old and new data models
    const intersections = [];
    
    // We need 100 intersections for a full 10x10 grid.
    for (let i = 0; i < 100; i++) {
        const name = bhubaneswarIntersections[i % bhubaneswarIntersections.length];
        const id = `${name} - ${i + 1}`;
        intersections.push({ 
            id, 
            status: 'low', 
            vehicleCount: 0, 
            averageSpeed: 0, 
            lanes: [
                { direction: "North", vehicleCount: 0, averageSpeed: 0, light: "green", manualActive: false },
                { direction: "East", vehicleCount: 0, averageSpeed: 0, light: "red", manualActive: false },
                { direction: "South", vehicleCount: 0, averageSpeed: 0, light: "green", manualActive: false },
                { direction: "West", vehicleCount: 0, averageSpeed: 0, light: "red", manualActive: false }
            ]
        });
    }
    
    // Populate intersection select for the Analytics page only for the original 30 unique names
    for (let i = 0; i < bhubaneswarIntersections.length; i++) {
        const name = bhubaneswarIntersections[i];
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        intersectionSelect.appendChild(option);
    }
    
    // Chart setup
    const ctx = document.getElementById('laneChart').getContext('2d');
    const laneChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ["North Lane", "East Lane", "South Lane", "West Lane"],
            datasets: [{
                label: 'Vehicle Count',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(26, 79, 139, 0.8)',
                    'rgba(58, 124, 165, 0.8)',
                    'rgba(255, 107, 53, 0.8)',
                    'rgba(255, 179, 102, 0.8)'
                ],
                borderColor: [
                    'rgba(26, 79, 139, 1)',
                    'rgba(58, 124, 165, 1)',
                    'rgba(255, 107, 53, 1)',
                    'rgba(255, 179, 102, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    function createTrafficGrid() {
        gridContainer.innerHTML = '';
        intersections.forEach(intersection => {
            const cell = document.createElement('div');
            cell.className = 'traffic-cell';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-sm font-bold truncate w-full px-1';
            nameSpan.textContent = intersection.id;
            
            const vehicleCountSpan = document.createElement('span');
            vehicleCountSpan.className = 'text-lg font-bold';
            vehicleCountSpan.textContent = intersection.vehicleCount;
            
            const speedSpan = document.createElement('span');
            speedSpan.className = 'text-xs text-gray-300';
            speedSpan.textContent = `${intersection.averageSpeed} km/h`;

            cell.appendChild(nameSpan);
            cell.appendChild(vehicleCountSpan);
            cell.appendChild(speedSpan);

            cell.dataset.id = intersection.id;
            gridContainer.appendChild(cell);

            cell.addEventListener('click', () => {
                showDetailsView(intersection);
            });
            
            cell.addEventListener('mouseenter', (e) => {
                tooltip.style.left = `${e.clientX + 15}px`;
                tooltip.style.top = `${e.clientY + 15}px`;
                
                tooltipName.textContent = intersection.id;
                tooltipVehicles.textContent = `Vehicles: ${intersection.vehicleCount}`;
                tooltipSpeed.textContent = `Speed: ${intersection.averageSpeed} km/h`;
                tooltip.classList.remove('hidden');
                tooltip.classList.add('visible');

                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = `${e.clientX - tooltipRect.width - 15}px`;
                }
                if (tooltipRect.bottom > window.innerHeight) {
                    tooltip.style.top = `${e.clientY - tooltipRect.height - 15}px`;
                }
            });

            cell.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
                tooltip.classList.add('hidden');
            });
        });
    }

    function updateSimulation() {
        const hotspots = [];
        intersections.forEach(intersection => {
            const cell = document.querySelector(`[data-id="${intersection.id}"]`);
            const vehicleCountSpan = cell.querySelector('span:nth-child(2)');
            const speedSpan = cell.querySelector('span:nth-child(3)');
            
            let totalVehicles = 0;
            let totalSpeed = 0;

            intersection.lanes.forEach(lane => {
                if (lane.manualActive) {
                    // Use manual light state
                    if (lane.light === 'green') {
                        lane.vehicleCount = Math.floor(Math.random() * 21) + 5;
                        lane.averageSpeed = Math.floor(Math.random() * 20) + 40;
                    } else if (lane.light === 'yellow') {
                        lane.vehicleCount = Math.floor(Math.random() * 31) + 20;
                        lane.averageSpeed = Math.floor(Math.random() * 20) + 20;
                    } else { // red
                        lane.vehicleCount = Math.floor(Math.random() * 51) + 50;
                        lane.averageSpeed = Math.floor(Math.random() * 10) + 5;
                    }
                } else {
                    // Use AI logic
                    if (lane.light === 'green') {
                        lane.vehicleCount = Math.floor(Math.random() * 21) + 5;
                        lane.averageSpeed = Math.floor(Math.random() * 20) + 40;
                    } else if (lane.light === 'yellow') {
                        lane.vehicleCount = Math.floor(Math.random() * 31) + 20;
                        lane.averageSpeed = Math.floor(Math.random() * 20) + 20;
                    } else {
                        lane.vehicleCount = Math.floor(Math.random() * 51) + 50;
                        lane.averageSpeed = Math.floor(Math.random() * 10) + 5;
                    }
                }
                totalVehicles += lane.vehicleCount;
                totalSpeed += lane.averageSpeed;
            });
            
            intersection.vehicleCount = Math.floor(totalVehicles / 4);
            intersection.averageSpeed = Math.floor(totalSpeed / 4);

            // Update cell color based on status
            cell.classList.remove('critical', 'medium', 'low');
            if (intersection.vehicleCount > 80) {
                cell.classList.add('critical');
                intersection.status = 'critical';
            } else if (intersection.vehicleCount > 40) {
                cell.classList.add('medium');
                intersection.status = 'medium';
            } else {
                cell.classList.add('low');
                intersection.status = 'low';
            }

            // Update the text in the cell
            vehicleCountSpan.textContent = intersection.vehicleCount;
            speedSpan.textContent = `${intersection.averageSpeed} km/h`;

            // Add to hotspots if critical or medium
            if (intersection.status === 'critical' || intersection.status === 'medium') {
                hotspots.push(intersection);
            }
        });
        
        // Update the details view if it's open
        if (currentDetailsIntersection) {
            const intersectionToUpdate = intersections.find(i => i.id === currentDetailsIntersection.id);
            if (intersectionToUpdate) {
                detailsVehiclesEl.textContent = intersectionToUpdate.vehicleCount;
                detailsSpeedEl.textContent = intersectionToUpdate.averageSpeed;
                updateDetailsUI(intersectionToUpdate);
            }
        }

        // Sort hotspots by vehicle count and update the UI
        hotspots.sort((a, b) => b.vehicleCount - a.vehicleCount);
        hotspotTagsContainer.innerHTML = '';
        hotspots.slice(0, 4).forEach(hotspot => {
            const tagClass = hotspot.status === 'critical' ? 'bg-red-900/50' : 'bg-yellow-900/50';
            const circleClass = hotspot.status === 'critical' ? 'bg-red-500' : 'bg-yellow-500';
            const tag = document.createElement('div');
            tag.className = `${tagClass} px-4 py-2 rounded-full flex items-center`;
            tag.innerHTML = `
                <div class="w-3 h-3 ${circleClass} rounded-full mr-2"></div>
                <span>${hotspot.id} (${Math.round((hotspot.vehicleCount / 100) * 100)}%)</span>
            `;
            hotspotTagsContainer.appendChild(tag);
        });

        // Update the chart for the currently selected intersection
        updateChart();
    }
    
    function updateDetailsUI(intersection) {
        // Update the main stats
        document.getElementById('details-vehicles').textContent = intersection.vehicleCount;
        document.getElementById('details-speed').textContent = intersection.averageSpeed;

        // Update the lane breakdown section
        const laneDetailsContainer = document.getElementById('lane-details-container');
        laneDetailsContainer.innerHTML = ''; // Clear old content
        intersection.lanes.forEach(lane => {
            const breakdownDiv = document.createElement('div');
            // Removed bg-gray-800 to rely on general .card styling or custom CSS in style.css
            breakdownDiv.className = 'p-6 rounded-xl shadow-lg border border-gray-700 w-full';
            
            const controlIcon = lane.manualActive ? '<i class="fas fa-hand-pointer text-yellow-400 text-lg ml-2"></i>' : '<i class="fas fa-brain text-blue-400 text-lg ml-2"></i>';

            breakdownDiv.innerHTML = `
                <p class="text-sm text-gray-400 font-bold mb-2 flex items-center">
                    ${lane.direction} Lane 
                    ${controlIcon}
                </p>
                <div class="flex flex-col space-y-2">
                    <p class="text-lg font-bold">${lane.vehicleCount} vehicles</p>
                    <p class="text-md text-gray-400">${lane.averageSpeed} km/h</p>
                </div>
                <div class="mt-4 flex items-center space-x-2">
                    <span class="font-bold text-sm">Current Light:</span>
                    <div class="traffic-light ${lane.light}"></div>
                </div>
            `;
            laneDetailsContainer.appendChild(breakdownDiv);
        });
        
        // Update manual control UI
        const laneControlsContainer = document.getElementById('lane-controls-container');
        laneControlsContainer.innerHTML = '';
        intersection.lanes.forEach(lane => {
            // Removed bg-gray-800 to rely on general .card styling or custom CSS in style.css
            const controlDiv = document.createElement('div');
            controlDiv.className = 'p-6 rounded-xl shadow-lg border border-gray-700 w-full flex flex-col items-center justify-center';
            controlDiv.dataset.direction = lane.direction;

            const activeIcon = lane.manualActive ? `<i class="fas fa-hand-pointer text-yellow-400 text-3xl"></i>` : `<i class="fas fa-brain text-blue-400 text-3xl"></i>`;
            const statusText = lane.manualActive ? "Manual Control" : "AI Control";
            
            controlDiv.innerHTML = `
                <div class="flex flex-col items-center space-y-2 mb-4">
                    ${activeIcon}
                    <p class="text-sm font-bold text-center">${lane.direction} Lane</p>
                    <p class="text-xs text-gray-400">${statusText}</p>
                </div>
                <div class="flex space-x-4">
                    <div class="traffic-light-button green ${lane.light === 'green' && lane.manualActive ? 'ring-4 ring-green-400' : ''}" data-light="green"></div>
                    <div class="traffic-light-button yellow ${lane.light === 'yellow' && lane.manualActive ? 'ring-4 ring-yellow-400' : ''}" data-light="yellow"></div>
                    <div class="traffic-light-button red ${lane.light === 'red' && lane.manualActive ? 'ring-4 ring-red-400' : ''}" data-light="red"></div>
                </div>
                <button class="mt-4 px-4 py-2 rounded-lg font-bold transition-colors w-full revert-ai-button ${lane.manualActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'}" ${!lane.manualActive ? 'disabled' : ''}>
                    Revert to AI
                </button>
            `;
            laneControlsContainer.appendChild(controlDiv);
        });
    }

    function updateChart() {
        const selectedId = intersectionSelect.value;
        const selectedIntersection = intersections.find(i => i.id.startsWith(selectedId));
        if (selectedIntersection) {
            const laneData = selectedIntersection.lanes.map(lane => lane.vehicleCount);
            laneChart.data.datasets[0].data = laneData;
            laneChart.update();
        }
    }

    function showDetailsView(intersection) {
        tooltip.classList.add('hidden');
        tooltip.classList.remove('visible');
        currentDetailsIntersection = intersection;

        document.getElementById('dashboard-page').classList.add('hidden');
        document.getElementById('nav-tabs').classList.add('hidden');
        detailsView.classList.remove('hidden');
        
        const detailsNameEl = document.getElementById('intersection-name');
        detailsNameEl.textContent = intersection.id;

        detailsVehiclesEl.textContent = intersection.vehicleCount;
        detailsSpeedEl.textContent = intersection.averageSpeed;
        
        // This button now uses the .btn-primary class defined in CSS
        manualControlButton.textContent = 'Show Manual Control';
        // REMOVED: manualControlButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        // REMOVED: manualControlButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        
        manualControlSection.classList.add('hidden');

        updateDetailsUI(intersection);
    }

    backButton.addEventListener('click', () => {
        document.getElementById('dashboard-page').classList.remove('hidden');
        detailsView.classList.add('hidden');
        document.getElementById('nav-tabs').classList.remove('hidden');
        currentDetailsIntersection = null;
    });

    // Event listener for the main manual control button
    manualControlButton.addEventListener('click', () => {
        const isHidden = manualControlSection.classList.contains('hidden');
        manualControlSection.classList.toggle('hidden');
        manualControlButton.textContent = isHidden ? 'Hide Manual Control' : 'Show Manual Control';
        
        // Removed explicit Tailwind color toggles, relying on base btn-primary style
        // manualControlButton.classList.toggle('bg-blue-600');
        // manualControlButton.classList.toggle('hover:bg-blue-700');
        // manualControlButton.classList.toggle('bg-red-600');
        // manualControlButton.classList.toggle('hover:bg-red-700');
    });

    // Event delegation for the traffic light buttons and revert buttons
    laneControlsContainer.addEventListener('click', (event) => {
        const targetButton = event.target.closest('.traffic-light-button');
        const revertButton = event.target.closest('.revert-ai-button');

        if (targetButton) {
            const direction = targetButton.closest('[data-direction]').dataset.direction;
            const lightColor = targetButton.dataset.light;
            const lane = currentDetailsIntersection.lanes.find(l => l.direction === direction);

            lane.light = lightColor;
            lane.manualActive = true;
            updateDetailsUI(currentDetailsIntersection);

        } else if (revertButton) {
            const direction = revertButton.closest('[data-direction]').dataset.direction;
            const lane = currentDetailsIntersection.lanes.find(l => l.direction === direction);
            
            // Reset to AI-driven state
            lane.manualActive = false;
            lane.light = 'red'; // AI will immediately re-evaluate and change this on the next cycle
            updateDetailsUI(currentDetailsIntersection);
        }
    });

    // Navigation logic
    navTabs.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.nav-tab');
        if (!clickedTab) return;

        const targetPageId = clickedTab.dataset.page;
        
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        clickedTab.classList.add('active');

        pages.forEach(page => {
            page.classList.add('hidden');
        });

        if (targetPageId === 'dashboard') {
            document.getElementById('dashboard-page').classList.remove('hidden');
            gridContainer.classList.remove('hidden');
        } else {
            document.getElementById(targetPageId + '-page').classList.remove('hidden');
        }

        // Make sure the details view is hidden when switching tabs
        detailsView.classList.add('hidden');
    });

    intersectionSelect.addEventListener('change', updateChart);
    
    // REMOVED: Theme toggle logic

    createTrafficGrid();
    const simulationInterval = setInterval(updateSimulation, 3000);
    updateSimulation();
    updateChart();
});