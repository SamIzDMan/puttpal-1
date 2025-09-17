// Modern Mini Golf Pro - 2025 Enhanced JavaScript Application - Fixed Version

document.addEventListener('DOMContentLoaded', function() {
    
    class MiniGolfPro {
        constructor() {
            // Modern app configuration with calm colors
            this.config = {
                maxPlayers: 10,
                totalHoles: 18,
                // Calm, neutral player colors with high contrast for numbers
                playerColors: [
                    '#6B73FF', // Soft Blue
                    '#10B981', // Sage Green
                    '#64748B', // Warm Gray
                    '#8B5CF6', // Lavender
                    '#F59E0B', // Amber
                    '#06B6D4', // Cyan
                    '#EC4899', // Rose
                    '#6B7280', // Light Gray
                    '#475569', // Slate
                    '#EF4444'  // Coral
                ],
                colorNames: [
                    'Soft Blue', 'Sage Green', 'Warm Gray', 'Lavender', 
                    'Amber', 'Cyan', 'Rose', 'Light Gray', 'Slate', 'Coral'
                ],
                quickScores: [1, 2, 3, 4, 5, 6],
                scoreRange: { min: 1, max: 15 },
                demoVerificationCode: '123456',
                autoSaveInterval: 3000
            };
            
            // App state
            this.currentUser = null;
            this.currentGame = null;
            this.savedGames = [];
            this.selectedGameId = null;
            this.selectedPlayerIndex = null;
            this.autoSaveTimer = null;
            this.lastSaveTime = null;
            
            // Game state
            this.players = [];
            this.currentHole = 1;
            this.totalHoles = 18;
            this.scores = {};
            this.gameComplete = false;
            
            // UI state
            this.currentFilter = 'all';
            
            this.initialize();
        }

        initialize() {
            this.loadUserData();
            this.setupEventListeners();
            this.setupOTPInputs();
            this.checkUserSession();
            this.startPeriodicUpdates();
            
            // Fix: Ensure phone input is ready
            setTimeout(() => {
                this.initializePhoneInput();
            }, 100);
        }

        // Fix: Initialize phone input properly
        initializePhoneInput() {
            const phoneInput = document.getElementById('phone-input');
            if (phoneInput) {
                phoneInput.removeAttribute('disabled');
                phoneInput.removeAttribute('readonly');
                phoneInput.style.pointerEvents = 'auto';
                phoneInput.tabIndex = 1;
                
                // Clear any existing value and focus
                phoneInput.value = '';
                phoneInput.focus();
            }
        }

        // Enhanced Backend Simulation
        async simulateApiCall(endpoint, data = null, duration = 1000) {
            this.showLoading(`Processing ${endpoint}...`);
            return new Promise(resolve => {
                setTimeout(() => {
                    this.hideLoading();
                    resolve(this.mockApiResponse(endpoint, data));
                }, duration);
            });
        }

        mockApiResponse(endpoint, data) {
            switch (endpoint) {
                case 'auth.signInWithOtp':
                    return { success: true, message: `OTP sent to ${data.phone}` };
                case 'auth.verifyOtp':
                    if (data.token === this.config.demoVerificationCode) {
                        const user = {
                            id: Date.now().toString(),
                            phone: data.phone,
                            display_name: `Player ${Date.now().toString().slice(-4)}`,
                            created_at: new Date().toISOString()
                        };
                        return { success: true, user, session: { access_token: 'mock_token' } };
                    }
                    return { success: false, error: { message: 'Invalid verification code. Try 123456' } };
                case 'games.insert':
                case 'games.upsert':
                    return { success: true, data: { ...data, id: data.id || Date.now().toString() } };
                case 'games.delete':
                    return { success: true };
                default:
                    return { success: true, data: data };
            }
        }

        async sendVerificationCode(phone) {
            const response = await this.simulateApiCall('auth.signInWithOtp', { phone }, 1500);
            if (response.success) {
                this.showToast('Verification code sent!', 'success');
            }
            return response;
        }

        async verifyCode(phone, code) {
            const response = await this.simulateApiCall('auth.verifyOtp', { phone, token: code }, 1000);
            if (response.success) {
                this.currentUser = response.user;
                this.saveUserData();
                this.showToast('Welcome to Mini Golf Pro!', 'success');
            }
            return response;
        }

        async saveGame(gameData) {
            const response = await this.simulateApiCall('games.upsert', gameData, 500);
            if (response.success) {
                const savedGame = response.data;
                savedGame.updated_at = new Date().toISOString();
                
                const index = this.savedGames.findIndex(g => g.id === savedGame.id);
                if (index !== -1) {
                    this.savedGames[index] = savedGame;
                } else {
                    savedGame.created_at = savedGame.created_at || new Date().toISOString();
                    this.savedGames.unshift(savedGame);
                }
                this.saveUserData();
                this.updateAutoSaveIndicator();
                this.lastSaveTime = Date.now();
            }
            return response;
        }

        async deleteGame(gameId) {
            const response = await this.simulateApiCall('games.delete', { id: gameId }, 500);
            if (response.success) {
                this.savedGames = this.savedGames.filter(g => g.id !== gameId);
                this.saveUserData();
                this.showToast('Game deleted successfully', 'success');
            }
            return response;
        }

        // Enhanced Local Storage
        saveUserData() {
            const userData = {
                currentUser: this.currentUser,
                savedGames: this.savedGames,
                lastSync: new Date().toISOString()
            };
            try {
                window.miniGolfProData = userData;
                console.log('Data saved locally (would sync to Supabase in production)');
            } catch (error) {
                console.error('Failed to save user data:', error);
            }
        }

        loadUserData() {
            try {
                const userData = window.miniGolfProData || {};
                this.currentUser = userData.currentUser || null;
                this.savedGames = userData.savedGames || [];
            } catch (error) {
                console.error('Failed to load user data:', error);
                this.currentUser = null;
                this.savedGames = [];
            }
        }

        checkUserSession() {
            if (this.currentUser) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
        }

        // Enhanced UI Helpers
        showLoading(message = 'Loading...') {
            const overlay = document.getElementById('loading-overlay');
            const text = overlay?.querySelector('.loading-text');
            if (overlay) {
                overlay.classList.remove('hidden');
                if (text) text.textContent = message;
            }
        }

        hideLoading() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.add('hidden');
        }

        showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        }

        showMessage(elementId, message, type = 'success') {
            const messageEl = document.getElementById(elementId);
            if (messageEl) {
                messageEl.textContent = message;
                messageEl.className = `message ${type}`;
                messageEl.classList.remove('hidden');
                
                if (type === 'success') {
                    setTimeout(() => {
                        messageEl.classList.add('hidden');
                    }, 3000);
                }
            }
        }

        hideMessage(elementId) {
            const messageEl = document.getElementById(elementId);
            if (messageEl) messageEl.classList.add('hidden');
        }

        switchScreen(screenId) {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => screen.classList.remove('active'));
            
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
            }
        }

        // Enhanced OTP Setup
        setupOTPInputs() {
            const otpInputs = document.querySelectorAll('.otp-digit');
            otpInputs.forEach((input, index) => {
                input.addEventListener('input', (e) => this.handleOTPInput(e, index));
                input.addEventListener('keydown', (e) => this.handleOTPKeydown(e, index));
                input.addEventListener('paste', (e) => this.handleOTPPaste(e));
            });
        }

        handleOTPInput(e, index) {
            const value = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = value;
            
            if (value) {
                e.target.classList.add('filled');
                if (index < 5) {
                    const nextInput = document.querySelector(`.otp-digit[data-index="${index + 1}"]`);
                    if (nextInput) nextInput.focus();
                }
            } else {
                e.target.classList.remove('filled');
            }
            
            const allInputs = document.querySelectorAll('.otp-digit');
            const allFilled = Array.from(allInputs).every(input => input.value);
            if (allFilled) {
                setTimeout(() => this.handleVerifyCode(), 500);
            }
        }

        handleOTPKeydown(e, index) {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                const prevInput = document.querySelector(`.otp-digit[data-index="${index - 1}"]`);
                if (prevInput) {
                    prevInput.focus();
                    prevInput.value = '';
                    prevInput.classList.remove('filled');
                }
            }
        }

        handleOTPPaste(e) {
            e.preventDefault();
            const paste = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            const inputs = document.querySelectorAll('.otp-digit');
            
            paste.split('').forEach((digit, index) => {
                if (inputs[index]) {
                    inputs[index].value = digit;
                    inputs[index].classList.add('filled');
                }
            });
            
            if (paste.length === 6) {
                setTimeout(() => this.handleVerifyCode(), 500);
            }
        }

        // Comprehensive Event Listeners
        setupEventListeners() {
            this.setupAuthEventListeners();
            this.setupDashboardEventListeners();
            this.setupGameEventListeners();
            this.setupModalEventListeners();
        }

        setupAuthEventListeners() {
            const sendCodeBtn = document.getElementById('send-code-btn');
            const verifyCodeBtn = document.getElementById('verify-code-btn');
            const backToLoginBtn = document.getElementById('back-to-login');
            const logoutBtn = document.getElementById('logout-btn');
            const resendCodeBtn = document.getElementById('resend-code');

            if (sendCodeBtn) {
                sendCodeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleSendCode();
                });
            }

            if (verifyCodeBtn) {
                verifyCodeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleVerifyCode();
                });
            }

            if (backToLoginBtn) {
                backToLoginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showLogin();
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }

            if (resendCodeBtn) {
                resendCodeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleSendCode();
                });
            }

            // Fix: Proper phone input event handling
            const phoneInput = document.getElementById('phone-input');
            if (phoneInput) {
                phoneInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleSendCode();
                    }
                });
                
                // Allow only numbers, spaces, dashes, and parentheses
                phoneInput.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const cleaned = value.replace(/[^\d\s\-\(\)]/g, '');
                    if (value !== cleaned) {
                        e.target.value = cleaned;
                    }
                });
            }
        }

        setupDashboardEventListeners() {
            const newGameBtn = document.getElementById('new-game-btn');
            const backToDashboard = document.getElementById('back-to-dashboard');
            const filterBtns = document.querySelectorAll('.filter-btn');

            if (newGameBtn) {
                newGameBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showPlayerSetup();
                });
            }

            if (backToDashboard) {
                backToDashboard.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showDashboard();
                });
            }

            filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.setGameFilter(btn.dataset.filter);
                });
            });
        }

        setupGameEventListeners() {
            const playerCountSelect = document.getElementById('player-count');
            const totalHolesSelect = document.getElementById('total-holes');
            const startGameBtn = document.getElementById('start-game');

            if (playerCountSelect) {
                playerCountSelect.addEventListener('change', () => this.generatePlayerInputs());
            }
            
            if (totalHolesSelect) {
                totalHolesSelect.addEventListener('change', (e) => {
                    this.totalHoles = parseInt(e.target.value);
                });
            }
            
            if (startGameBtn) {
                startGameBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.startGame();
                });
            }

            // Game screen events
            const saveExitBtn = document.getElementById('save-exit-btn');
            const scoreTab = document.getElementById('score-tab');
            const leaderboardTab = document.getElementById('leaderboard-tab');
            
            // Fix: All navigation button variants
            const prevHoleBtn = document.getElementById('prev-hole');
            const nextHoleBtn = document.getElementById('next-hole');
            const prevHoleTopBtn = document.getElementById('prev-hole-top');
            const nextHoleTopBtn = document.getElementById('next-hole-top');

            if (saveExitBtn) {
                saveExitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.saveAndExit();
                });
            }

            if (scoreTab) {
                scoreTab.addEventListener('click', () => this.showScoreTab());
            }

            if (leaderboardTab) {
                leaderboardTab.addEventListener('click', () => this.showLeaderboardTab());
            }

            // Fix: Ensure all navigation buttons work
            if (prevHoleBtn) {
                prevHoleBtn.addEventListener('click', () => this.previousHole());
            }
            if (nextHoleBtn) {
                nextHoleBtn.addEventListener('click', () => this.nextHole());
            }
            if (prevHoleTopBtn) {
                prevHoleTopBtn.addEventListener('click', () => this.previousHole());
            }
            if (nextHoleTopBtn) {
                nextHoleTopBtn.addEventListener('click', () => this.nextHole());
            }

            // Quick score and scorecard
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-btn')) {
                    const score = parseInt(e.target.dataset.score);
                    if (this.selectedPlayerIndex !== null) {
                        this.setQuickScore(this.selectedPlayerIndex, score);
                    }
                }
            });

            const viewScorecardBtn = document.getElementById('view-scorecard-btn');
            if (viewScorecardBtn) {
                viewScorecardBtn.addEventListener('click', () => this.showScorecard());
            }
        }

        setupModalEventListeners() {
            // Game complete modal
            const saveCompletedBtn = document.getElementById('save-completed-game');
            const newGameModalBtn = document.getElementById('new-game-modal');
            const viewScorecardBtn = document.getElementById('view-scorecard');
            const shareGameBtn = document.getElementById('share-game');

            if (saveCompletedBtn) {
                saveCompletedBtn.addEventListener('click', () => this.saveCompletedGame());
            }
            if (newGameModalBtn) {
                newGameModalBtn.addEventListener('click', () => this.newGame());
            }
            if (viewScorecardBtn) {
                viewScorecardBtn.addEventListener('click', () => this.showScorecard());
            }
            if (shareGameBtn) {
                shareGameBtn.addEventListener('click', () => this.shareGame());
            }

            // Scorecard modal
            const closeScorecardBtn = document.getElementById('close-scorecard');
            const exportPdfBtn = document.getElementById('export-pdf');
            const shareScorecardBtn = document.getElementById('share-scorecard');

            if (closeScorecardBtn) {
                closeScorecardBtn.addEventListener('click', () => this.hideScorecard());
            }
            if (exportPdfBtn) {
                exportPdfBtn.addEventListener('click', () => this.exportPDF());
            }
            if (shareScorecardBtn) {
                shareScorecardBtn.addEventListener('click', () => this.shareScorecard());
            }

            // Game actions modal
            const closeGameActionsBtn = document.getElementById('close-game-actions');
            const continueGameBtn = document.getElementById('continue-game');
            const editGameBtn = document.getElementById('edit-game');
            const duplicateGameBtn = document.getElementById('duplicate-game');
            const deleteGameBtn = document.getElementById('delete-game');

            if (closeGameActionsBtn) {
                closeGameActionsBtn.addEventListener('click', () => this.hideGameActions());
            }
            if (continueGameBtn) {
                continueGameBtn.addEventListener('click', () => this.continueGame());
            }
            if (editGameBtn) {
                editGameBtn.addEventListener('click', () => this.editGame());
            }
            if (duplicateGameBtn) {
                duplicateGameBtn.addEventListener('click', () => this.duplicateGame());
            }
            if (deleteGameBtn) {
                deleteGameBtn.addEventListener('click', () => this.confirmDeleteGame());
            }

            // Modal backdrop clicks
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-backdrop')) {
                    this.closeAllModals();
                }
            });
        }

        // Authentication Functions
        async handleSendCode() {
            const countryCode = document.getElementById('country-code')?.value || '+1';
            const phoneInput = document.getElementById('phone-input');
            const phone = phoneInput?.value?.trim();

            this.hideMessage('login-message');

            if (!phone) {
                this.showMessage('login-message', 'Please enter your phone number', 'error');
                if (phoneInput) {
                    phoneInput.focus();
                }
                return;
            }

            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (!/^\d{7,15}$/.test(cleanPhone)) {
                this.showMessage('login-message', 'Please enter a valid phone number', 'error');
                if (phoneInput) {
                    phoneInput.focus();
                }
                return;
            }

            const fullPhone = `${countryCode}${cleanPhone}`;

            try {
                const sendCodeBtn = document.getElementById('send-code-btn');
                if (sendCodeBtn) {
                    sendCodeBtn.classList.add('loading');
                }

                const result = await this.sendVerificationCode(fullPhone);
                if (result.success) {
                    this.switchScreen('verification-screen');
                    const messageEl = document.getElementById('verification-message');
                    if (messageEl) {
                        messageEl.textContent = `Enter the 6-digit code sent to ${fullPhone}`;
                    }
                    
                    const firstOtpInput = document.querySelector('.otp-digit[data-index="0"]');
                    setTimeout(() => {
                        if (firstOtpInput) {
                            firstOtpInput.focus();
                        }
                    }, 100);
                } else {
                    this.showMessage('login-message', result.message || 'Failed to send code', 'error');
                }
            } catch (error) {
                this.showMessage('login-message', 'Network error. Please try again.', 'error');
            } finally {
                const sendCodeBtn = document.getElementById('send-code-btn');
                if (sendCodeBtn) {
                    sendCodeBtn.classList.remove('loading');
                }
            }
        }

        async handleVerifyCode() {
            const otpInputs = document.querySelectorAll('.otp-digit');
            const code = Array.from(otpInputs).map(input => input.value).join('');
            const countryCode = document.getElementById('country-code')?.value || '+1';
            const phoneInput = document.getElementById('phone-input');
            const cleanPhone = phoneInput?.value?.trim().replace(/[\s\-\(\)]/g, '');
            const fullPhone = `${countryCode}${cleanPhone}`;

            this.hideMessage('verification-error');

            if (!code || code.length !== 6) {
                this.showMessage('verification-error', 'Please enter the complete 6-digit code', 'error');
                if (otpInputs[0]) {
                    otpInputs[0].focus();
                }
                return;
            }

            if (!/^\d{6}$/.test(code)) {
                this.showMessage('verification-error', 'Code must contain only numbers', 'error');
                if (otpInputs[0]) {
                    otpInputs[0].focus();
                }
                return;
            }

            try {
                const verifyBtn = document.getElementById('verify-code-btn');
                if (verifyBtn) {
                    verifyBtn.classList.add('loading');
                }

                const result = await this.verifyCode(fullPhone, code);
                if (result.success) {
                    this.currentUser = result.user;
                    this.showDashboard();
                } else {
                    this.showMessage('verification-error', result.error?.message || 'Invalid code', 'error');
                    otpInputs.forEach(input => {
                        input.value = '';
                        input.classList.remove('filled');
                    });
                    if (otpInputs[0]) {
                        otpInputs[0].focus();
                    }
                }
            } catch (error) {
                this.showMessage('verification-error', 'Network error. Please try again.', 'error');
            } finally {
                const verifyBtn = document.getElementById('verify-code-btn');
                if (verifyBtn) {
                    verifyBtn.classList.remove('loading');
                }
            }
        }

        handleLogout() {
            if (confirm('Are you sure you want to logout? Any unsaved progress will be lost.')) {
                this.currentUser = null;
                this.savedGames = [];
                this.currentGame = null;
                this.clearAutoSave();
                window.miniGolfProData = null;
                this.showLogin();
                this.showToast('Logged out successfully', 'success');
            }
        }

        // Screen Navigation
        showLogin() {
            this.switchScreen('login-screen');
            this.hideMessage('login-message');
            this.hideMessage('verification-error');
            
            const phoneInput = document.getElementById('phone-input');
            const otpInputs = document.querySelectorAll('.otp-digit');
            
            if (phoneInput) {
                phoneInput.value = '';
                setTimeout(() => {
                    phoneInput.focus();
                }, 100);
            }
            
            otpInputs.forEach(input => {
                input.value = '';
                input.classList.remove('filled');
            });
        }

        showDashboard() {
            this.switchScreen('dashboard-screen');
            const userDisplay = document.getElementById('user-display');
            if (userDisplay && this.currentUser) {
                userDisplay.textContent = this.currentUser.display_name || this.currentUser.phone;
            }
            this.updateDashboardStats();
            this.renderSavedGames();
        }

        showPlayerSetup() {
            this.switchScreen('setup-screen');
            this.currentGame = null;
            this.clearAutoSave();
            this.generatePlayerInputs();
        }

        // Dashboard Functions
        updateDashboardStats() {
            const completedGames = this.savedGames.filter(g => g.status === 'completed').length;
            const inProgressGames = this.savedGames.filter(g => g.status === 'in-progress').length;
            
            let bestScore = '--';
            if (completedGames > 0) {
                const completedScores = this.savedGames
                    .filter(g => g.status === 'completed')
                    .map(g => this.calculateGameTotal(g))
                    .filter(score => score > 0);
                
                if (completedScores.length > 0) {
                    bestScore = Math.min(...completedScores).toString();
                }
            }

            const gamesCompletedEl = document.getElementById('games-completed');
            const gamesInProgressEl = document.getElementById('games-in-progress');
            const bestScoreEl = document.getElementById('best-score');

            if (gamesCompletedEl) gamesCompletedEl.textContent = completedGames;
            if (gamesInProgressEl) gamesInProgressEl.textContent = inProgressGames;
            if (bestScoreEl) bestScoreEl.textContent = bestScore;
        }

        calculateGameTotal(game) {
            if (!game.players || !game.scores) return 0;
            
            let bestTotal = Infinity;
            game.players.forEach((player, index) => {
                let playerTotal = 0;
                if (game.scores[index]) {
                    for (let hole = 1; hole <= game.total_holes; hole++) {
                        if (game.scores[index][hole]) {
                            playerTotal += game.scores[index][hole];
                        }
                    }
                }
                if (playerTotal > 0 && playerTotal < bestTotal) {
                    bestTotal = playerTotal;
                }
            });
            return bestTotal === Infinity ? 0 : bestTotal;
        }

        setGameFilter(filter) {
            this.currentFilter = filter;
            
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });
            
            this.renderSavedGames();
        }

        renderSavedGames() {
            const gamesContainer = document.getElementById('games-list');
            if (!gamesContainer) return;

            let filteredGames = this.savedGames;
            if (this.currentFilter !== 'all') {
                filteredGames = this.savedGames.filter(g => g.status === this.currentFilter);
            }

            if (filteredGames.length === 0) {
                gamesContainer.innerHTML = '<div class="empty-games">No games found. Start playing!</div>';
                return;
            }

            let gamesHTML = '';
            filteredGames.forEach(game => {
                const gameDate = new Date(game.created_at).toLocaleDateString();
                const gameTime = new Date(game.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const statusClass = game.status === 'completed' ? 'status-completed' : 'status-in-progress';
                const statusText = game.status === 'completed' ? 'Completed' : `Hole ${game.current_hole}/${game.total_holes}`;

                let playersHTML = '';
                if (game.players) {
                    game.players.forEach(player => {
                        playersHTML += `
                            <span class="player-badge">
                                <span class="player-color-dot" style="background-color: ${player.color}"></span>
                                ${player.name}
                            </span>
                        `;
                    });
                }

                gamesHTML += `
                    <div class="game-card" onclick="window.miniGolfPro.showGameActions('${game.id}')">
                        <div class="game-header-info">
                            <h4 class="game-title">${game.name || 'Mini Golf Game'}</h4>
                            <div class="game-date">${gameDate}<br>${gameTime}</div>
                        </div>
                        <div class="game-progress">${statusText}</div>
                        <div class="game-players">${playersHTML}</div>
                        <div class="game-status ${statusClass}">${game.status === 'completed' ? '✅ Completed' : '⏳ In Progress'}</div>
                    </div>
                `;
            });

            gamesContainer.innerHTML = gamesHTML;
        }

        // Player Setup
        generatePlayerInputs() {
            const playerCountSelect = document.getElementById('player-count');
            const container = document.getElementById('player-names');

            if (!playerCountSelect || !container) return;

            const playerCount = parseInt(playerCountSelect.value);
            container.innerHTML = '';

            for (let i = 0; i < playerCount; i++) {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-input';
                
                const defaultName = this.currentGame?.players?.[i]?.name || `Player ${i + 1}`;
                const selectedColor = this.currentGame?.players?.[i]?.color || this.config.playerColors[i % this.config.playerColors.length];
                
                let colorOptionsHTML = '';
                this.config.playerColors.forEach((color, colorIndex) => {
                    const isSelected = color === selectedColor ? 'selected' : '';
                    colorOptionsHTML += `
                        <div class="color-option ${isSelected}" 
                             style="background-color: ${color}" 
                             data-color="${color}"
                             onclick="window.miniGolfPro.selectColor(${i}, '${color}')"></div>
                    `;
                });

                playerDiv.innerHTML = `
                    <div class="player-number" style="--player-color: ${selectedColor}">${i + 1}</div>
                    <div class="player-name-group">
                        <label class="form-label">Player ${i + 1} Name</label>
                        <input type="text" class="form-control" id="player-${i}" 
                               value="${defaultName}" placeholder="Enter name">
                    </div>
                    <div class="color-picker-group">
                        <label class="form-label">Color</label>
                        <div class="color-options">${colorOptionsHTML}</div>
                    </div>
                `;
                
                container.appendChild(playerDiv);

                const nameInput = document.getElementById(`player-${i}`);
                if (nameInput) {
                    nameInput.addEventListener('input', (e) => {
                        this.updatePlayerNumber(i, e.target.value);
                    });
                }
            }
        }

        selectColor(playerIndex, color) {
            const container = document.getElementById('player-names');
            const playerInput = container?.children[playerIndex];
            if (playerInput) {
                const colorOptions = playerInput.querySelectorAll('.color-option');
                colorOptions.forEach(option => option.classList.remove('selected'));

                const selectedOption = playerInput.querySelector(`[data-color="${color}"]`);
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                }

                const playerNumber = playerInput.querySelector('.player-number');
                if (playerNumber) {
                    playerNumber.style.setProperty('--player-color', color);
                }
            }
        }

        updatePlayerNumber(playerIndex, name) {
            const playerNumber = document.querySelector(`#player-names .player-input:nth-child(${playerIndex + 1}) .player-number`);
            if (playerNumber && name.trim()) {
                playerNumber.textContent = playerIndex + 1;
            }
        }

        // Game Functions
        async startGame() {
            const playerCountSelect = document.getElementById('player-count');
            const totalHolesSelect = document.getElementById('total-holes');
            
            if (!playerCountSelect || !totalHolesSelect) return;

            const playerCount = parseInt(playerCountSelect.value);
            this.totalHoles = parseInt(totalHolesSelect.value);
            this.players = [];
            this.scores = {};

            for (let i = 0; i < playerCount; i++) {
                const nameInput = document.getElementById(`player-${i}`);
                const selectedColorEl = document.querySelector(`#player-names .player-input:nth-child(${i + 1}) .color-option.selected`);
                
                const name = nameInput?.value?.trim() || `Player ${i + 1}`;
                const color = selectedColorEl?.getAttribute('data-color') || this.config.playerColors[i % this.config.playerColors.length];
                
                this.players.push({ name, color });
                this.scores[i] = this.currentGame?.scores?.[i] || {};
            }

            this.currentHole = this.currentGame?.current_hole || 1;
            this.gameComplete = false;

            const gameData = {
                id: this.currentGame?.id || null,
                user_id: this.currentUser.id,
                name: this.currentGame?.name || `Game ${new Date().toLocaleDateString()}`,
                players: this.players,
                scores: this.scores,
                current_hole: this.currentHole,
                total_holes: this.totalHoles,
                status: 'in-progress',
                created_at: this.currentGame?.created_at || new Date().toISOString()
            };

            const saveResult = await this.saveGame(gameData);
            if (saveResult.success) {
                this.currentGame = saveResult.data;
                this.switchScreen('game-screen');
                this.generateScoreInputs();
                this.generateHoleSelectors();
                this.updateDisplay();
                this.updateLeaderboard();
                this.showScoreTab();
                this.setupAutoSave();
                this.showToast('Game started! Auto-saving enabled.', 'success');
            }
        }

        // Fix: Synchronized hole selector generation
        generateHoleSelectors() {
            this.generateHoleSelectorTop();
            this.generateHoleSelectorBottom();
        }

        generateHoleSelectorTop() {
            const container = document.getElementById('hole-selector-top');
            if (!container) return;

            container.innerHTML = '';
            
            for (let hole = 1; hole <= this.totalHoles; hole++) {
                const holeBtn = document.createElement('div');
                holeBtn.className = 'hole-number';
                holeBtn.textContent = hole;
                holeBtn.onclick = () => this.goToHole(hole);
                
                if (hole === this.currentHole) {
                    holeBtn.classList.add('current');
                } else if (this.isHoleCompleted(hole)) {
                    holeBtn.classList.add('completed');
                }
                
                container.appendChild(holeBtn);
            }
        }

        generateHoleSelectorBottom() {
            const container = document.getElementById('hole-selector-bottom');
            if (!container) return;

            container.innerHTML = '';
            
            for (let hole = 1; hole <= this.totalHoles; hole++) {
                const indicator = document.createElement('div');
                indicator.className = 'hole-indicator';
                indicator.title = `Hole ${hole}`;
                indicator.onclick = () => this.goToHole(hole);
                
                if (hole === this.currentHole) {
                    indicator.classList.add('current');
                } else if (this.isHoleCompleted(hole)) {
                    indicator.classList.add('completed');
                }
                
                container.appendChild(indicator);
            }
        }

        // Fix: Synchronized hole navigation
        goToHole(holeNumber) {
            if (holeNumber >= 1 && holeNumber <= this.totalHoles) {
                this.currentHole = holeNumber;
                this.generateScoreInputs();
                this.updateDisplay();
                this.generateHoleSelectors(); // Update both selectors
                this.autoSaveGame();
            }
        }

        isHoleCompleted(hole) {
            return this.players.every((player, index) => {
                return this.scores[index] && this.scores[index][hole];
            });
        }

        generateScoreInputs() {
            const container = document.getElementById('score-inputs');
            if (!container) return;

            container.innerHTML = '';

            this.players.forEach((player, index) => {
                const scoreDiv = document.createElement('div');
                scoreDiv.className = 'score-input-group';
                scoreDiv.style.setProperty('--player-color', player.color);

                const currentScore = this.scores[index][this.currentHole] || '';
                const total = this.calculatePlayerTotal(index);

                scoreDiv.innerHTML = `
                    <div class="player-info">
                        <div class="player-avatar" style="--player-color: ${player.color}">${index + 1}</div>
                        <div class="player-details">
                            <div class="player-name">${player.name}</div>
                            <div class="player-total">Total: ${total}</div>
                        </div>
                    </div>
                    <input type="number" class="score-input" id="score-${index}" 
                           min="${this.config.scoreRange.min}" max="${this.config.scoreRange.max}" 
                           value="${currentScore}" placeholder="0">
                `;
                
                container.appendChild(scoreDiv);

                scoreDiv.addEventListener('click', () => this.selectPlayer(index));

                const scoreInput = document.getElementById(`score-${index}`);
                if (scoreInput) {
                    scoreInput.addEventListener('input', (e) => {
                        this.updateScore(index, e.target.value);
                    });
                    scoreInput.addEventListener('focus', (e) => {
                        e.target.select();
                        this.selectPlayer(index);
                    });
                }
            });

            this.updateSelectedPlayerIndicator();
        }

        selectPlayer(index) {
            this.selectedPlayerIndex = index;
            
            const scoreGroups = document.querySelectorAll('.score-input-group');
            scoreGroups.forEach((group, i) => {
                group.classList.toggle('selected', i === index);
            });
            
            this.updateSelectedPlayerIndicator();
        }

        updateSelectedPlayerIndicator() {
            const indicator = document.getElementById('selected-player');
            if (indicator) {
                if (this.selectedPlayerIndex !== null) {
                    const player = this.players[this.selectedPlayerIndex];
                    indicator.textContent = `Selected: ${player.name}`;
                    indicator.style.color = player.color;
                } else {
                    indicator.textContent = 'Select a player to use quick scoring';
                    indicator.style.color = '';
                }
            }
        }

        setQuickScore(playerIndex, score) {
            if (playerIndex >= 0 && playerIndex < this.players.length) {
                const scoreInput = document.getElementById(`score-${playerIndex}`);
                if (scoreInput) {
                    scoreInput.value = score;
                    this.updateScore(playerIndex, score);
                    this.showToast(`${this.players[playerIndex].name}: ${score}`, 'success');
                }
            }
        }

        updateScore(playerIndex, score) {
            const numScore = parseInt(score);
            if (isNaN(numScore) || numScore < this.config.scoreRange.min || numScore > this.config.scoreRange.max) {
                if (this.scores[playerIndex]) {
                    delete this.scores[playerIndex][this.currentHole];
                }
            } else {
                if (!this.scores[playerIndex]) {
                    this.scores[playerIndex] = {};
                }
                this.scores[playerIndex][this.currentHole] = numScore;
            }

            this.updateDisplay();
            this.updateLeaderboard();
            this.generateHoleSelectors(); // Update completion status
            this.scheduleAutoSave();
        }

        // Auto-save system
        setupAutoSave() {
            this.clearAutoSave();
            this.scheduleAutoSave();
        }

        scheduleAutoSave() {
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
            }
            
            this.autoSaveTimer = setTimeout(() => {
                this.autoSaveGame();
            }, this.config.autoSaveInterval);
        }

        async autoSaveGame() {
            if (this.currentGame) {
                const gameData = {
                    ...this.currentGame,
                    scores: this.scores,
                    current_hole: this.currentHole,
                    status: this.gameComplete ? 'completed' : 'in-progress'
                };
                
                try {
                    await this.saveGame(gameData);
                    this.currentGame = gameData;
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }

        clearAutoSave() {
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }
        }

        updateAutoSaveIndicator() {
            const indicator = document.querySelector('.auto-save-indicator');
            if (indicator) {
                indicator.style.opacity = '1';
                setTimeout(() => {
                    if (indicator) indicator.style.opacity = '0.7';
                }, 1000);
            }
        }

        calculatePlayerTotal(playerIndex) {
            let total = 0;
            if (this.scores[playerIndex]) {
                for (let hole = 1; hole <= this.totalHoles; hole++) {
                    if (this.scores[playerIndex][hole]) {
                        total += this.scores[playerIndex][hole];
                    }
                }
            }
            return total;
        }

        // Fix: Synchronized display updates
        updateDisplay() {
            const holeDisplay = document.getElementById('hole-display');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            const prevBtn = document.getElementById('prev-hole');
            const nextBtn = document.getElementById('next-hole');
            const prevBtnTop = document.getElementById('prev-hole-top');
            const nextBtnTop = document.getElementById('next-hole-top');

            if (holeDisplay) {
                holeDisplay.textContent = `Hole ${this.currentHole} of ${this.totalHoles}`;
            }

            const progress = (this.currentHole - 1) / this.totalHoles * 100;
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
            if (progressText) {
                progressText.textContent = `${Math.round(progress)}%`;
            }

            const isFirstHole = this.currentHole === 1;
            const isLastHole = this.currentHole === this.totalHoles;

            [prevBtn, prevBtnTop].forEach(btn => {
                if (btn) btn.disabled = isFirstHole;
            });

            [nextBtn, nextBtnTop].forEach(btn => {
                if (btn) btn.textContent = isLastHole ? 'Finish Game' : 'Next';
            });

            this.players.forEach((player, index) => {
                const totalElement = document.querySelector(`#score-inputs .score-input-group:nth-child(${index + 1}) .player-total`);
                if (totalElement) {
                    totalElement.textContent = `Total: ${this.calculatePlayerTotal(index)}`;
                }
            });
        }

        previousHole() {
            if (this.currentHole > 1) {
                this.currentHole--;
                this.generateScoreInputs();
                this.updateDisplay();
                this.generateHoleSelectors();
                this.scheduleAutoSave();
            }
        }

        nextHole() {
            if (this.currentHole < this.totalHoles) {
                this.currentHole++;
                this.generateScoreInputs();
                this.updateDisplay();
                this.generateHoleSelectors();
                this.scheduleAutoSave();
            } else {
                this.completeGame();
            }
        }

        completeGame() {
            this.gameComplete = true;
            this.clearAutoSave();
            this.showGameCompleteModal();
        }

        async saveAndExit() {
            if (this.currentGame) {
                await this.autoSaveGame();
                this.clearAutoSave();
                this.showToast('Game saved successfully!', 'success');
                this.showDashboard();
            }
        }

        // Modal Functions
        showGameCompleteModal() {
            const modal = document.getElementById('game-complete-modal');
            const resultsContainer = document.getElementById('final-results');

            if (!modal || !resultsContainer) return;

            const sortedPlayers = this.getSortedPlayers();
            let resultsHTML = '<div class="leaderboard-grid">';

            sortedPlayers.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                resultsHTML += `
                    <div class="leaderboard-item ${index === 0 ? 'leader' : ''}" 
                         style="--player-color: ${player.color}">
                        <div class="player-rank">
                            <div class="rank-number">${index + 1}</div>
                            <div class="rank-name">${medal} ${player.name}</div>
                        </div>
                        <div class="rank-score">${player.total}</div>
                    </div>
                `;
            });

            resultsHTML += '</div>';
            resultsContainer.innerHTML = resultsHTML;
            modal.classList.remove('hidden');
        }

        async saveCompletedGame() {
            if (this.currentGame) {
                this.currentGame.status = 'completed';
                await this.autoSaveGame();
                this.hideGameComplete();
                this.showToast('Game completed and saved!', 'success');
                this.showDashboard();
            }
        }

        shareGame() {
            const winner = this.getSortedPlayers()[0];
            const gameData = {
                winner: winner.name,
                score: winner.total,
                players: this.players.length,
                holes: this.totalHoles,
                date: new Date().toLocaleDateString()
            };
            
            if (navigator.share) {
                navigator.share({
                    title: 'Mini Golf Pro Results',
                    text: `🏆 ${gameData.winner} won with ${gameData.score} strokes!`,
                    url: window.location.href
                });
            } else {
                const shareText = `🏆 ${gameData.winner} won with ${gameData.score} strokes! ${gameData.players} players, ${gameData.holes} holes.`;
                navigator.clipboard.writeText(shareText).then(() => {
                    this.showToast('Results copied to clipboard!', 'success');
                });
            }
        }

        showGameActions(gameId) {
            this.selectedGameId = gameId;
            const modal = document.getElementById('game-actions-modal');
            if (modal) modal.classList.remove('hidden');
        }

        hideGameActions() {
            const modal = document.getElementById('game-actions-modal');
            if (modal) modal.classList.add('hidden');
            this.selectedGameId = null;
        }

        continueGame() {
            const game = this.savedGames.find(g => g.id === this.selectedGameId);
            if (game) {
                this.currentGame = game;
                this.players = game.players;
                this.scores = game.scores;
                this.currentHole = game.current_hole || 1;
                this.totalHoles = game.total_holes || 18;
                this.gameComplete = game.status === 'completed';

                this.switchScreen('game-screen');
                this.generateScoreInputs();
                this.generateHoleSelectors();
                this.updateDisplay();
                this.updateLeaderboard();
                this.showScoreTab();
                if (!this.gameComplete) {
                    this.setupAutoSave();
                }
            }
            this.hideGameActions();
        }

        editGame() {
            const game = this.savedGames.find(g => g.id === this.selectedGameId);
            if (game) {
                this.currentGame = game;
                this.showPlayerSetup();
                
                const playerCountSelect = document.getElementById('player-count');
                const totalHolesSelect = document.getElementById('total-holes');
                
                if (playerCountSelect) playerCountSelect.value = game.players.length.toString();
                if (totalHolesSelect) totalHolesSelect.value = game.total_holes.toString();
                
                this.totalHoles = game.total_holes;
                setTimeout(() => this.generatePlayerInputs(), 100);
            }
            this.hideGameActions();
        }

        duplicateGame() {
            const game = this.savedGames.find(g => g.id === this.selectedGameId);
            if (game) {
                const duplicatedGame = {
                    ...game,
                    id: null,
                    name: `${game.name} (Copy)`,
                    scores: {},
                    current_hole: 1,
                    status: 'in-progress'
                };
                
                this.currentGame = duplicatedGame;
                this.showPlayerSetup();
            }
            this.hideGameActions();
        }

        async confirmDeleteGame() {
            if (confirm('Are you sure you want to delete this game?')) {
                await this.deleteGame(this.selectedGameId);
                this.renderSavedGames();
                this.updateDashboardStats();
            }
            this.hideGameActions();
        }

        getSortedPlayers() {
            return this.players.map((player, index) => ({
                ...player,
                index,
                total: this.calculatePlayerTotal(index)
            })).sort((a, b) => a.total - b.total);
        }

        updateLeaderboard() {
            const container = document.getElementById('leaderboard-list');
            const title = document.getElementById('leaderboard-title');

            if (!container) return;

            const sortedPlayers = this.getSortedPlayers();

            if (title) {
                title.textContent = this.gameComplete ? 'Final Results' : 'Current Standings';
            }

            let leaderboardHTML = '';
            sortedPlayers.forEach((player, index) => {
                const isLeader = index === 0 && player.total > 0;
                leaderboardHTML += `
                    <div class="leaderboard-item ${isLeader ? 'leader' : ''}"
                         style="--player-color: ${player.color}">
                        <div class="player-rank">
                            <div class="rank-number">${index + 1}</div>
                            <div class="rank-name">${player.name}</div>
                        </div>
                        <div class="rank-score">${player.total || 0}</div>
                    </div>
                `;
            });

            container.innerHTML = leaderboardHTML;
        }

        showScoreTab() {
            const scoreTab = document.getElementById('score-tab');
            const leaderboardTab = document.getElementById('leaderboard-tab');
            const scoreContent = document.getElementById('score-content');
            const leaderboardContent = document.getElementById('leaderboard-content');

            if (scoreTab) scoreTab.classList.add('active');
            if (leaderboardTab) leaderboardTab.classList.remove('active');
            if (scoreContent) scoreContent.classList.add('active');
            if (leaderboardContent) leaderboardContent.classList.remove('active');
        }

        showLeaderboardTab() {
            const scoreTab = document.getElementById('score-tab');
            const leaderboardTab = document.getElementById('leaderboard-tab');
            const scoreContent = document.getElementById('score-content');
            const leaderboardContent = document.getElementById('leaderboard-content');

            if (scoreTab) scoreTab.classList.remove('active');
            if (leaderboardTab) leaderboardTab.classList.add('active');
            if (scoreContent) scoreContent.classList.remove('active');
            if (leaderboardContent) leaderboardContent.classList.add('active');

            this.updateLeaderboard();
        }

        showScorecard() {
            const modal = document.getElementById('scorecard-modal');
            const container = document.getElementById('scorecard-table');

            if (!modal || !container) return;

            let tableHTML = '<table class="scorecard-table"><thead><tr><th class="player-name">Player</th>';
            
            for (let hole = 1; hole <= this.totalHoles; hole++) {
                tableHTML += `<th>H${hole}</th>`;
            }
            tableHTML += '<th>Total</th></tr></thead><tbody>';

            this.players.forEach((player, index) => {
                tableHTML += `<tr><td class="player-name" style="color: ${player.color}"><strong>${player.name}</strong></td>`;
                for (let hole = 1; hole <= this.totalHoles; hole++) {
                    const score = this.scores[index]?.[hole] || '';
                    const cellClass = score ? '' : 'empty-score';
                    tableHTML += `<td class="${cellClass}">${score || '-'}</td>`;
                }
                const total = this.calculatePlayerTotal(index);
                tableHTML += `<td class="total-score">${total}</td></tr>`;
            });

            tableHTML += '</tbody></table>';
            container.innerHTML = tableHTML;
            modal.classList.remove('hidden');
        }

        hideScorecard() {
            const modal = document.getElementById('scorecard-modal');
            if (modal) modal.classList.add('hidden');
        }

        exportPDF() {
            this.showToast('PDF export feature coming soon!', 'warning');
        }

        shareScorecard() {
            if (navigator.share) {
                navigator.share({
                    title: 'Mini Golf Scorecard',
                    text: 'Check out my mini golf scorecard!',
                    url: window.location.href
                });
            } else {
                this.showToast('Scorecard link copied!', 'success');
            }
        }

        newGame() {
            this.hideGameComplete();
            this.showPlayerSetup();
        }

        hideGameComplete() {
            const modal = document.getElementById('game-complete-modal');
            if (modal) modal.classList.add('hidden');
        }

        closeAllModals() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => modal.classList.add('hidden'));
        }

        startPeriodicUpdates() {
            setInterval(() => {
                if (this.currentUser && document.getElementById('dashboard-screen')?.classList.contains('active')) {
                    this.updateDashboardStats();
                }
            }, 30000);
        }

        handleError(error, context = 'Unknown') {
            console.error(`Error in ${context}:`, error);
            this.showToast(`Error in ${context}. Please try again.`, 'error');
        }
    }

    // Initialize the app
    window.miniGolfPro = new MiniGolfPro();
    
    // Global error handling
    window.addEventListener('error', (event) => {
        window.miniGolfPro?.handleError(event.error, 'Global');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        window.miniGolfPro?.handleError(event.reason, 'Promise');
    });
});