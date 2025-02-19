class FilmsManager {
    constructor() {
        this.films = [];
        this.filteredFilms = [];
        this.currentView = 'grid';
        this.chart = null;
        this.init();
    }

    async init() {
        try {
            const response = await fetch('films.json');
            this.films = await response.json();
            this.filteredFilms = [...this.films];
            this.setupEventListeners();
            this.updateStats();
            this.renderCurrentView();
        } catch (error) {
            console.error('Error loading films:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterFilms(e.target.value);
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortFilms(e.target.value);
        });

        document.getElementById('showGrid').addEventListener('click', () => this.switchView('grid'));
        document.getElementById('showChart').addEventListener('click', () => this.switchView('chart'));
        document.getElementById('showBubble').addEventListener('click', () => this.switchView('bubble'));
    }

    filterFilms(searchTerm) {
        searchTerm = searchTerm.toLowerCase();
        this.filteredFilms = this.films.filter(film => 
            film.title.toLowerCase().includes(searchTerm) ||
            film.director.toLowerCase().includes(searchTerm) ||
            film.release_year.includes(searchTerm)
        );
        this.renderCurrentView();
    }

    sortFilms(sortOption) {
        switch(sortOption) {
            case 'box_office_desc':
                this.filteredFilms.sort((a, b) => this.parseBoxOffice(b.box_office) - this.parseBoxOffice(a.box_office));
                break;
            case 'box_office_asc':
                this.filteredFilms.sort((a, b) => this.parseBoxOffice(a.box_office) - this.parseBoxOffice(b.box_office));
                break;
            case 'year_desc':
                this.filteredFilms.sort((a, b) => parseInt(b.release_year) - parseInt(a.release_year));
                break;
            case 'year_asc':
                this.filteredFilms.sort((a, b) => parseInt(a.release_year) - parseInt(a.release_year));
                break;
            case 'title_asc':
                this.filteredFilms.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title_desc':
                this.filteredFilms.sort((a, b) => b.title.localeCompare(a.title));
                break;
        }
        this.renderCurrentView();
    }

    parseBoxOffice(boxOffice) {
        return parseFloat(boxOffice.replace(/[^0-9.]/g, ''));
    }

    formatBoxOffice(boxOffice) {
        const value = this.parseBoxOffice(boxOffice);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    updateStats() {
        const totalFilms = this.films.length;
        const totalBoxOffice = this.films.reduce((sum, film) => sum + this.parseBoxOffice(film.box_office), 0);
        const avgBoxOffice = totalBoxOffice / totalFilms;
        const recentYear = Math.max(...this.films.map(film => parseInt(film.release_year)));

        document.getElementById('totalFilms').textContent = totalFilms;
        document.getElementById('totalBoxOffice').textContent = this.formatBoxOffice(totalBoxOffice.toString());
        document.getElementById('avgBoxOffice').textContent = this.formatBoxOffice(avgBoxOffice.toString());
        document.getElementById('recentYear').textContent = recentYear;
    }

    renderCurrentView() {
        switch(this.currentView) {
            case 'grid':
                this.renderFilms();
                break;
            case 'chart':
                this.renderChart();
                break;
            case 'bubble':
                this.renderBubbleChart();
                break;
        }
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.viz-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`show${view.charAt(0).toUpperCase() + view.slice(1)}`).classList.add('active');

        // Hide all containers
        document.getElementById('filmsGrid').style.display = 'none';
        document.getElementById('chartContainer').style.display = 'none';
        document.getElementById('bubbleContainer').style.display = 'none';

        // Show/hide sort controls based on view
        document.querySelector('.sort-controls').style.display = 
            (view === 'chart' || view === 'bubble') ? 'none' : 'block';

        // Adjust search box width for chart and bubble views
        const searchBox = document.querySelector('.search-box');
        if (view === 'chart' || view === 'bubble') {
            searchBox.style.maxWidth = '400px';
            searchBox.style.margin = '0 auto';
        } else {
            searchBox.style.maxWidth = '';
            searchBox.style.margin = '';
        }

        // Show selected container and render
        switch(view) {
            case 'grid':
                document.getElementById('filmsGrid').style.display = 'grid';
                this.renderFilms();
                break;
            case 'chart':
                document.getElementById('chartContainer').style.display = 'block';
                this.renderChart();
                break;
            case 'bubble':
                document.getElementById('bubbleContainer').style.display = 'block';
                this.renderBubbleChart();
                break;
        }
    }

    renderChart() {
        const ctx = document.getElementById('boxOfficeChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const sortedFilms = [...this.filteredFilms]
            .sort((a, b) => this.parseBoxOffice(b.box_office) - this.parseBoxOffice(a.box_office));

        // Set fixed width for the canvas based on number of films
        const minWidth = Math.max(1500, sortedFilms.length * 40);
        ctx.canvas.style.width = `${minWidth}px`;
        ctx.canvas.width = minWidth;
        ctx.canvas.height = 500;

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedFilms.map(film => film.title),
                datasets: [{
                    label: 'Box Office Revenue',
                    data: sortedFilms.map(film => this.parseBoxOffice(film.box_office)),
                    backgroundColor: 'rgba(52, 152, 219, 0.8)', // Single color for all bars
                    borderWidth: 0
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'none'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => this.formatBoxOffice(value.toString())
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            callback: (value, index) => {
                                const title = sortedFilms[index].title;
                                return title.length > 15 ? title.substring(0, 15) + '...' : title;
                            }
                        }
                    }
                }
            }
        });
    }

    renderBubbleChart() {
        const container = document.getElementById('bubbleContainer');
        container.innerHTML = '';
        
        const sortedFilms = [...this.filteredFilms].sort((a, b) => 
            this.parseBoxOffice(b.box_office) - this.parseBoxOffice(a.box_office)
        );

        const maxRevenue = Math.max(...sortedFilms.map(film => this.parseBoxOffice(film.box_office)));
        const minRevenue = Math.min(...sortedFilms.map(film => this.parseBoxOffice(film.box_office)));
        
        const minYear = Math.min(...sortedFilms.map(f => parseInt(f.release_year)));
        const maxYear = Math.max(...sortedFilms.map(f => parseInt(f.release_year)));
        
        const tooltip = document.createElement('div');
        tooltip.className = 'bubble-tooltip';
        container.appendChild(tooltip);

        const padding = 50;
        const containerWidth = container.offsetWidth - 2 * padding;
        const containerHeight = container.offsetHeight - 2 * padding;

        // Create bubbles with initial positions
        const bubbles = sortedFilms.map((film, index) => {
            const revenue = this.parseBoxOffice(film.box_office);
            // Adjust size calculation for better visualization
            const minSize = 40; // Minimum bubble size
            const maxSize = 150; // Maximum bubble size
            const logMin = Math.log(minRevenue);
            const logMax = Math.log(maxRevenue);
            const logRevenue = Math.log(revenue);
            
            // Use logarithmic scale for better size distribution
            const size = minSize + ((logRevenue - logMin) / (logMax - logMin)) * (maxSize - minSize);
            
            const year = parseInt(film.release_year);
            
            return {
                film,
                size,
                radius: size / 2,
                x: padding + ((year - minYear) / (maxYear - minYear)) * (containerWidth - size),
                y: padding + Math.random() * (containerHeight - size),
                vx: 0,
                vy: 0
            };
        });

        // Force simulation function
        const simulateForces = () => {
            const strength = 0.05;
            const separation = 5;

            bubbles.forEach(bubble1 => {
                bubbles.forEach(bubble2 => {
                    if (bubble1 !== bubble2) {
                        const dx = bubble2.x - bubble1.x;
                        const dy = bubble2.y - bubble1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const minDistance = bubble1.radius + bubble2.radius + separation;

                        if (distance < minDistance) {
                            const force = (minDistance - distance) * strength;
                            const angle = Math.atan2(dy, dx);
                            
                            bubble2.vx += Math.cos(angle) * force;
                            bubble2.vy += Math.sin(angle) * force;
                            bubble1.vx -= Math.cos(angle) * force;
                            bubble1.vy -= Math.sin(angle) * force;
                        }
                    }
                });

                // Apply velocity
                bubble1.x += bubble1.vx;
                bubble1.y += bubble1.vy;

                // Damping
                bubble1.vx *= 0.9;
                bubble1.vy *= 0.9;

                // Contain within bounds
                if (bubble1.x < padding) {
                    bubble1.x = padding;
                    bubble1.vx *= -0.5;
                }
                if (bubble1.x > containerWidth + padding - bubble1.size) {
                    bubble1.x = containerWidth + padding - bubble1.size;
                    bubble1.vx *= -0.5;
                }
                if (bubble1.y < padding) {
                    bubble1.y = padding;
                    bubble1.vy *= -0.5;
                }
                if (bubble1.y > containerHeight + padding - bubble1.size) {
                    bubble1.y = containerHeight + padding - bubble1.size;
                    bubble1.vy *= -0.5;
                }
            });

            // Update bubble positions
            bubbles.forEach(bubble => {
                const bubbleElement = document.getElementById(`bubble-${bubble.film.title.replace(/\s+/g, '-')}`);
                if (bubbleElement) {
                    bubbleElement.style.left = `${bubble.x}px`;
                    bubbleElement.style.top = `${bubble.y}px`;
                }
            });

            // Continue simulation if there's still movement
            const isMoving = bubbles.some(bubble => 
                Math.abs(bubble.vx) > 0.01 || Math.abs(bubble.vy) > 0.01
            );

            if (isMoving) {
                requestAnimationFrame(simulateForces);
            }
        };

        // Create and append bubble elements
        bubbles.forEach(bubble => {
            const bubbleElement = document.createElement('div');
            bubbleElement.className = 'bubble';
            bubbleElement.id = `bubble-${bubble.film.title.replace(/\s+/g, '-')}`;
            
            bubbleElement.style.width = `${bubble.size}px`;
            bubbleElement.style.height = `${bubble.size}px`;
            bubbleElement.style.left = `${bubble.x}px`;
            bubbleElement.style.top = `${bubble.y}px`;
            
            const year = parseInt(bubble.film.release_year);
            const year_normalized = (year - minYear) / (maxYear - minYear);
            bubbleElement.style.backgroundColor = `hsla(${210 + year_normalized * 150}, 70%, 50%, 0.8)`;
            
            if (bubble.size > 50) { // Adjusted threshold
                const fontSize = Math.max(0.6, Math.min(1, bubble.size / 100)); // Dynamic font size
                bubbleElement.style.fontSize = `${fontSize}rem`;
                bubbleElement.textContent = bubble.film.title.length > 20 ? 
                    bubble.film.title.substring(0, 20) + '...' : bubble.film.title;
            }

            // Add hover effects
            bubbleElement.addEventListener('mouseover', (e) => {
                tooltip.innerHTML = `
                    <h4>${bubble.film.title}</h4>
                    <p><strong>Year:</strong> ${bubble.film.release_year}</p>
                    <p><strong>Director:</strong> ${bubble.film.director}</p>
                    <p class="box-office">${this.formatBoxOffice(bubble.film.box_office)}</p>
                `;
                tooltip.style.opacity = '1';
                
                const tooltipWidth = 250;
                const tooltipX = Math.min(
                    container.offsetWidth - tooltipWidth - 20,
                    Math.max(10, e.pageX - container.getBoundingClientRect().left + 10)
                );
                const tooltipY = Math.min(
                    container.offsetHeight - tooltip.offsetHeight - 10,
                    Math.max(10, e.pageY - container.getBoundingClientRect().top + 10)
                );
                
                tooltip.style.left = `${tooltipX}px`;
                tooltip.style.top = `${tooltipY}px`;
            });

            bubbleElement.addEventListener('mousemove', (e) => {
                const tooltipWidth = 250;
                const tooltipX = Math.min(
                    container.offsetWidth - tooltipWidth - 20,
                    Math.max(10, e.pageX - container.getBoundingClientRect().left + 10)
                );
                const tooltipY = Math.min(
                    container.offsetHeight - tooltip.offsetHeight - 10,
                    Math.max(10, e.pageY - container.getBoundingClientRect().top + 10)
                );
                
                tooltip.style.left = `${tooltipX}px`;
                tooltip.style.top = `${tooltipY}px`;
            });

            bubbleElement.addEventListener('mouseout', () => {
                tooltip.style.opacity = '0';
            });

            container.appendChild(bubbleElement);
        });

        // Start force simulation
        simulateForces();
    }

    renderFilms() {
        const container = document.getElementById('filmsGrid');
        container.innerHTML = this.filteredFilms.map(film => `
            <div class="film-card">
                <div class="film-title">${film.title}</div>
                <div class="film-info">
                    <p><strong>Director:</strong> ${film.director}</p>
                    <p><strong>Year:</strong> ${film.release_year}</p>
                    <p><strong>Country:</strong> ${film.country_of_origin}</p>
                </div>
                <div class="film-box-office">${this.formatBoxOffice(film.box_office)}</div>
            </div>
        `).join('');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new FilmsManager();
}); 