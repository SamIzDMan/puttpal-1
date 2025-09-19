// ========================================
// SUPABASE CONFIGURATION
// Replace these with your actual Supabase project details
// ========================================
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your anon/public key

// Initialize Supabase client
let supabase = null;
let isSupabaseConfigured = false;

// Check if Supabase is properly configured
if (SUPABASE_URL.includes('YOUR-PROJECT-ID') || SUPABASE_ANON_KEY.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
    console.warn('⚠️ Supabase not configured. Using demo mode with localStorage fallback.');
} else {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isSupabaseConfigured = true;
        console.log('✅ Supabase initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
    }
}

// ========================================
// DATABASE SCHEMA SETUP (for reference)
// Create this table in your Supabase database:
// ========================================
/*
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    players JSONB NOT NULL,
    scores JSONB NOT NULL DEFAULT '{}',
    current_hole INTEGER DEFAULT 1,
    total_holes INTEGER DEFAULT 18,
    status TEXT DEFAULT 'in-progress',
    start_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policy for user data access
CREATE POLICY "Users can access their own games" ON games
    FOR ALL USING (auth.uid()::text = user_id);
*/

// Enhanced Mini Golf Pro with Supabase Integration
document.addEventListener('DOMContentLoaded', function() {
    
    class MiniGolfPro {
        constructor() {
            // Application configuration
            this.config = {
                maxPlayers: 10,
                playerColors: ["#FF4444", "#4444FF", "#44FF44", "#FFFF44", "#FF8844", "#8844FF", "#FF44FF", "#44FFFF", "#8B4513", "#888888"],
                colorNames: ["Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink", "Teal", "Brown", "Gray"],
                countryCodes: [
                    {code: "+1", country: "US/CA", flag: "🇺🇸"},
                    {code: "+44", country: "UK", flag: "🇬🇧"},
                    {code: "+49", country: "DE", flag: "🇩🇪"},
                    {code: "+33", country: "FR", flag: "🇫🇷"},
                    {code: "+39", country: "IT", flag: "🇮🇹"},
                    {code: "+34", country: "ES", flag: "🇪🇸"},
                    {code: "+31", country: "NL", flag: "🇳🇱"},
                    {code: "+61", country: "AU", flag: "🇦🇺"}
                ],
                quickScores: [1, 2, 3, 4, 5],
                gameTemplates: ["Quick 9", "Full 18", "Tournament", "Practice"],
                demoCode: "123456",
                defaultHoles: 18
            };
            
            // Application state
            this.currentUser = null;
            this.currentGame = null;
            this.savedGames = [];
            this.selectedGameId = null;
            this.activePlayerIndex = null;
            
            // Game state
            this.players = [];
            this.currentHole = 1;
            this.totalHoles = 18;
            this.scores = {};
            this.gameComplete = false;
            this.gameStartTime = null;
            
            // UI state
            this.resendTimer = null;
            this.resendCountdown = 30;
            this.playerCount = 2;
            this.isOnline = navigator.onLine;
            
            this.initialize();
        }

        initialize() {
            this.setupOnlineDetection();
            this.loadUserData();
            this.setupEventListeners();
            this.checkUserSession();
            this.setupToastContainer();
            this.showConfigurationNoticeIfNeeded();
        }

        setupOnlineDetection() {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.showToast('Back online! Data will sync.', 'success');
                this.syncOfflineData();
            });
            
            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.showToast('You\'re offline. Changes saved locally.', 'warning');
            });
        }

        showConfigurationNoticeIfNeeded() {
            if (!isSupabaseConfigured) {
                // Show configuration notice after a delay
                setTimeout(() => {
                    const modal = document.getElementById('config-notice');
                    if (modal) modal.classList.remove('hidden');
                }, 2000);
            }
        }

        // ===== SUPABASE AUTHENTICATION =====
        async sendSMSCode(phoneNumber) {
            if (!isSupabaseConfigured) {
                // Demo mode - simulate API call
                await new Promise(resolve => setTimeout(resolve, 1500));
                return { success: true };
            }

            try {
                const { error } = await supabase.auth.signInWithOtp({
                    phone: phoneNumber.replace(/\s/g, ''), // Remove spaces
                });

                if (error) {
                    console.error('SMS send error:', error);
                    return { success: false, message: error.message };
                }

                return { success: true };
            } catch (error) {
                console.error('SMS send error:', error);
                return { success: false, message: 'Failed to send SMS. Please try again.' };
            }
        }

        async verifySMSCode(phoneNumber, code) {
            if (!isSupabaseConfigured) {
                // Demo mode - simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (code === this.config.demoCode) {
                    const user = {
                        id: 'demo-user-' + Date.now(),
                        phone: phoneNumber,
                        createdAt: new Date().toISOString(),
                        initials: this.generateInitials(phoneNumber)
                    };
                    
                    this.currentUser = user;
                    this.saveUserData();
                    return { success: true, user };
                } else {
                    return { success: false, message: 'Invalid verification code. Use 123456 for demo.' };
                }
            }

            try {
                const { data, error } = await supabase.auth.verifyOtp({
                    phone: phoneNumber.replace(/\s/g, ''),
                    token: code,
                    type: 'sms'
                });

                if (error) {
                    console.error('SMS verification error:', error);
                    return { success: false, message: error.message };
                }

                if (data?.user) {
                    const user = {
                        id: data.user.id,
                        phone: data.user.phone || phoneNumber,
                        createdAt: data.user.created_at,
                        initials: this.generateInitials(phoneNumber)
                    };
                    
                    this.currentUser = user;
                    await this.saveUserData();
                    return { success: true, user };
                }

                return { success: false, message: 'Verification failed' };
            } catch (error) {
                console.error('SMS verification error:', error);
                return { success: false, message: 'Verification failed. Please try again.' };
            }
        }

        async checkUserSession() {
            if (!isSupabaseConfigured) {
                // Demo mode - check localStorage
                if (this.currentUser) {
                    this.showDashboard();
                } else {
                    this.showLoginScreen();
                }
                return;
            }

            try {
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user) {
                    this.currentUser = {
                        id: session.user.id,
                        phone: session.user.phone || session.user.email || 'Unknown',
                        createdAt: session.user.created_at,
                        initials: this.generateInitials(session.user.phone || session.user.email)
                    };
                    
                    await this.loadSavedGames();
                    this.showDashboard();
                } else {
                    this.showLoginScreen();
                }
                
                // Listen for auth state changes
                supabase.auth.onAuthStateChange((event, session) => {
                    console.log('Auth state changed:', event);
                    
                    if (event === 'SIGNED_IN' && session?.user) {
                        this.currentUser = {
                            id: session.user.id,
                            phone: session.user.phone || session.user.email || 'Unknown',
                            createdAt: session.user.created_at,
                            initials: this.generateInitials(session.user.phone || session.user.email)
                        };
                        
                        this.loadSavedGames().then(() => {
                            this.showDashboard();
                        });
                    } else if (event === 'SIGNED_OUT') {
                        this.currentUser = null;
                        this.savedGames = [];
                        this.showLoginScreen();
                    }
                });
                
            } catch (error) {
                console.error('Session check error:', error);
                this.showLoginScreen();
            }
        }

        // ===== SUPABASE DATABASE OPERATIONS =====
        async saveGame(gameData) {
            const isNewGame = !gameData.id;
            
            if (!isSupabaseConfigured || !this.isOnline) {
                // Fallback to localStorage
                return this.saveGameToLocalStorage(gameData);
            }

            try {
                const gameToSave = {
                    user_id: this.currentUser.id,
                    name: gameData.name,
                    players: gameData.players,
                    scores: gameData.scores,
                    current_hole: gameData.currentHole,
                    total_holes: gameData.totalHoles,
                    status: gameData.status,
                    start_time: gameData.startTime || new Date().toISOString()
                };

                let result;
                if (isNewGame) {
                    const { data, error } = await supabase
                        .from('games')
                        .insert([gameToSave])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    result = data;
                } else {
                    const { data, error } = await supabase
                        .from('games')
                        .update({
                            ...gameToSave,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', gameData.id)
                        .select()
                        .single();
                    
                    if (error) throw error;
                    result = data;
                }

                // Update local state
                const savedGame = {
                    id: result.id,
                    userId: result.user_id,
                    name: result.name,
                    players: result.players,
                    scores: result.scores,
                    currentHole: result.current_hole,
                    totalHoles: result.total_holes,
                    status: result.status,
                    startTime: result.start_time,
                    createdAt: result.created_at,
                    updatedAt: result.updated_at
                };

                if (isNewGame) {
                    this.savedGames.unshift(savedGame);
                    this.showToast('Game saved successfully!', 'success');
                } else {
                    const index = this.savedGames.findIndex(g => g.id === savedGame.id);
                    if (index !== -1) {
                        this.savedGames[index] = savedGame;
                    }
                }

                // Also save to localStorage as backup
                this.saveUserDataToLocalStorage();

                return { success: true, game: savedGame };
            } catch (error) {
                console.error('Save game error:', error);
                
                // Fallback to localStorage
                this.showToast('Saved locally (will sync when online)', 'warning');
                return this.saveGameToLocalStorage(gameData);
            }
        }

        async loadSavedGames() {
            if (!isSupabaseConfigured || !this.isOnline) {
                // Load from localStorage
                this.loadUserDataFromLocalStorage();
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('games')
                    .select('*')
                    .eq('user_id', this.currentUser.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                this.savedGames = data.map(game => ({
                    id: game.id,
                    userId: game.user_id,
                    name: game.name,
                    players: game.players,
                    scores: game.scores,
                    currentHole: game.current_hole,
                    totalHoles: game.total_holes,
                    status: game.status,
                    startTime: game.start_time,
                    createdAt: game.created_at,
                    updatedAt: game.updated_at
                }));

                // Also save to localStorage as backup
                this.saveUserDataToLocalStorage();

            } catch (error) {
                console.error('Load games error:', error);
                this.showToast('Using offline data', 'warning');
                this.loadUserDataFromLocalStorage();
            }
        }

        async deleteGame(gameId) {
            if (!isSupabaseConfigured || !this.isOnline) {
                // Delete from localStorage
                this.savedGames = this.savedGames.filter(g => g.id !== gameId);
                this.saveUserDataToLocalStorage();
                this.showToast('Game deleted', 'success');
                return { success: true };
            }

            try {
                const { error } = await supabase
                    .from('games')
                    .delete()
                    .eq('id', gameId)
                    .eq('user_id', this.currentUser.id);

                if (error) throw error;

                // Remove from local state
                this.savedGames = this.savedGames.filter(g => g.id !== gameId);
                this.saveUserDataToLocalStorage();
                this.showToast('Game deleted', 'success');
                return { success: true };

            } catch (error) {
                console.error('Delete game error:', error);
                this.showToast('Delete failed - try again when online', 'error');
                return { success: false };
            }
        }

        // ===== FALLBACK LOCAL STORAGE METHODS =====
        saveGameToLocalStorage(gameData) {
            const isNewGame = !gameData.id;
            
            if (isNewGame) {
                gameData.id = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                gameData.createdAt = new Date().toISOString();
                this.savedGames.unshift(gameData);
            } else {
                const index = this.savedGames.findIndex(g => g.id === gameData.id);
                if (index !== -1) {
                    this.savedGames[index] = { ...gameData, updatedAt: new Date().toISOString() };
                }
            }
            
            this.saveUserDataToLocalStorage();
            
            if (isNewGame) {
                this.showToast('Game saved locally!', 'success');
            }
            
            return { success: true, game: gameData };
        }

        saveUserDataToLocalStorage() {
            const userData = {
                currentUser: this.currentUser,
                savedGames: this.savedGames,
                timestamp: Date.now()
            };
            try {
                localStorage.setItem('miniGolfProData', JSON.stringify(userData));
            } catch (error) {
                console.warn('Could not save to localStorage');
            }
        }

        loadUserDataFromLocalStorage() {
            try {
                const savedData = localStorage.getItem('miniGolfProData');
                if (savedData) {
                    const userData = JSON.parse(savedData);
                    this.savedGames = userData.savedGames || [];
                }
            } catch (error) {
                console.warn('Could not load from localStorage');
                this.savedGames = [];
            }
        }

        // Legacy method for backward compatibility
        saveUserData() {
            this.saveUserDataToLocalStorage();
        }

        loadUserData() {
            this.loadUserDataFromLocalStorage();
        }

        async syncOfflineData() {
            if (!isSupabaseConfigured || !this.isOnline) return;

            // Find games that were created/modified offline
            const localGames = this.savedGames.filter(game => 
                game.id.startsWith('local-') || !game.synced
            );

            for (const game of localGames) {
                try {
                    const result = await this.saveGame(game);
                    if (result.success) {
                        // Update the local ID with the server ID
                        const index = this.savedGames.findIndex(g => g.id === game.id);
                        if (index !== -1) {
                            this.savedGames[index] = { ...result.game, synced: true };
                        }
                    }
                } catch (error) {
                    console.error('Sync error for game:', game.id, error);
                }
            }

            // Refresh games from server
            await this.loadSavedGames();
            this.renderGames();
        }

        generateInitials(identifier) {
            if (!identifier) return 'U';
            const cleaned = identifier.replace(/\D/g, '');
            return cleaned.slice(-2) || identifier.substring(0, 2).toUpperCase();
        }

        formatPhoneNumber(value, countryCode) {
            const numbers = value.replace(/\D/g, '');
            if (countryCode === '+1') {
                // US format: (555) 123-4567
                if (numbers.length >= 6) {
                    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
                } else if (numbers.length >= 3) {
                    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
                }
                return numbers;
            }
            return numbers;
        }

        // ===== BUTTON STATE MANAGEMENT =====
        setButtonLoading(buttonId, loading) {
            const button = document.getElementById(buttonId);
            if (!button) return;
            
            const btnText = button.querySelector('.btn-text');
            const btnLoading = button.querySelector('.btn-loading');
            
            if (loading) {
                button.disabled = true;
                if (btnText) btnText.style.display = 'none';
                if (btnLoading) btnLoading.classList.remove('hidden');
            } else {
                button.disabled = false;
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.classList.add('hidden');
            }
        }

        duplicateGame(gameId) {
            const game = this.savedGames.find(g => g.id === gameId);
            if (game) {
                const duplicatedGame = {
                    ...game,
                    id: null, // Will be assigned in saveGame
                    name: `${game.name} (Copy)`,
                    status: 'in-progress',
                    currentHole: 1,
                    scores: {},
                    startTime: new Date().toISOString()
                };
                
                // Reset all scores
                game.players.forEach((_, index) => {
                    duplicatedGame.scores[index] = {};
                });
                
                this.saveGame(duplicatedGame).then(() => {
                    this.renderGames();
                    this.showToast('Game duplicated successfully!', 'success');
                });
            }
        }

        // ===== SCREEN MANAGEMENT =====
        switchScreen(screenId) {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => screen.classList.remove('active'));
            
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
            }
        }

        showLoginScreen() {
            this.switchScreen('login-screen');
            const phoneInput = document.getElementById('phone-input');
            if (phoneInput) {
                phoneInput.value = '';
                setTimeout(() => phoneInput.focus(), 100);
            }
        }

        showDashboard() {
            this.switchScreen('dashboard-screen');
            this.updateUserProfile();
            this.updateDashboardStats();
            this.renderGames();
        }

        updateUserProfile() {
            if (!this.currentUser) return;
            
            const userInitials = document.getElementById('user-initials');
            const userPhone = document.getElementById('user-phone');
            const profileInitials = document.getElementById('profile-initials');
            const profilePhone = document.getElementById('profile-phone');
            const memberSince = document.getElementById('member-since');
            
            if (userInitials) userInitials.textContent = this.currentUser.initials;
            if (userPhone) userPhone.textContent = this.currentUser.phone;
            if (profileInitials) profileInitials.textContent = this.currentUser.initials;
            if (profilePhone) profilePhone.textContent = this.currentUser.phone;
            if (memberSince) {
                const date = new Date(this.currentUser.createdAt).toLocaleDateString();
                memberSince.textContent = date;
            }
        }

        updateDashboardStats() {
            const totalGamesEl = document.getElementById('total-games');
            const avgScoreEl = document.getElementById('avg-score');
            const bestScoreEl = document.getElementById('best-score');
            
            const completedGames = this.savedGames.filter(g => g.status === 'completed');
            const totalGames = completedGames.length;
            
            if (totalGamesEl) totalGamesEl.textContent = totalGames;
            
            if (totalGames > 0) {
                const totalScores = completedGames.map(game => {
                    return Math.min(...game.players.map((_, index) => 
                        Object.values(game.scores[index] || {}).reduce((sum, score) => sum + score, 0)
                    ));
                });
                
                const avgScore = Math.round(totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length);
                const bestScore = Math.min(...totalScores);
                
                if (avgScoreEl) avgScoreEl.textContent = avgScore;
                if (bestScoreEl) bestScoreEl.textContent = bestScore;
            } else {
                if (avgScoreEl) avgScoreEl.textContent = '-';
                if (bestScoreEl) bestScoreEl.textContent = '-';
            }
        }

        renderGames() {
            const container = document.getElementById('games-container');
            const emptyState = document.getElementById('empty-games');
            
            if (!container) return;
            
            if (this.savedGames.length === 0) {
                container.innerHTML = '';
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }
            
            if (emptyState) emptyState.classList.add('hidden');
            
            let gamesHTML = '';
            this.savedGames.forEach(game => {
                const createdDate = new Date(game.createdAt);
                const now = new Date();
                const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
                
                let dateText;
                if (daysDiff === 0) dateText = 'Today';
                else if (daysDiff === 1) dateText = 'Yesterday';
                else if (daysDiff < 7) dateText = `${daysDiff} days ago`;
                else dateText = createdDate.toLocaleDateString();
                
                const timeText = createdDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const statusClass = game.status === 'completed' ? 'status-completed' : 'status-in-progress';
                const statusText = game.status === 'completed' ? 'Completed' : `Hole ${game.currentHole}`;
                
                let playersHTML = '';
                game.players.forEach(player => {
                    playersHTML += `
                        <div class="player-badge" style="background-color: ${player.color}">
                            <div class="player-color-dot"></div>
                            ${player.name}
                        </div>
                    `;
                });
                
                gamesHTML += `
                    <div class="game-card" onclick="window.gameApp.showGameActions('${game.id}')">
                        <div class="game-card-header">
                            <h4 class="game-title">${game.name || 'Mini Golf Game'}</h4>
                            <div class="game-date">
                                <div>${dateText}</div>
                                <div>${timeText}</div>
                            </div>
                        </div>
                        <div class="game-progress">Progress: ${statusText} of ${game.totalHoles || 18}</div>
                        <div class="game-players">${playersHTML}</div>
                        <div class="game-status ${statusClass}">${game.status === 'completed' ? 'Completed' : 'In Progress'}</div>
                    </div>
                `;
            });
            
            container.innerHTML = gamesHTML;
        }

        // ===== PLAYER SETUP =====
        showPlayerSetup(existingGame = null) {
            this.switchScreen('setup-screen');
            this.currentGame = existingGame;
            
            const titleText = document.getElementById('setup-title-text');
            if (titleText) {
                titleText.textContent = existingGame ? 'Edit Game' : 'New Game Setup';
            }
            
            // Initialize form with existing data or defaults
            const gameNameInput = document.getElementById('game-name-input');
            const courseType = document.getElementById('course-type');
            
            if (gameNameInput) {
                gameNameInput.value = existingGame?.name || `Game ${new Date().toLocaleDateString()}`;
            }
            
            if (courseType) {
                courseType.value = existingGame?.totalHoles?.toString() || '18';
                this.handleCourseTypeChange();
            }
            
            // Set player count and generate inputs
            this.playerCount = existingGame?.players?.length || 2;
            this.updatePlayerCountDisplay();
            this.generatePlayerInputs();
        }

        updatePlayerCountDisplay() {
            const display = document.getElementById('player-count-display');
            if (display) {
                display.textContent = `${this.playerCount} ${this.playerCount === 1 ? 'Player' : 'Players'}`;
            }
            
            const decreaseBtn = document.getElementById('decrease-players');
            const increaseBtn = document.getElementById('increase-players');
            
            if (decreaseBtn) decreaseBtn.disabled = this.playerCount <= 1;
            if (increaseBtn) increaseBtn.disabled = this.playerCount >= this.config.maxPlayers;
        }

        generatePlayerInputs() {
            const container = document.getElementById('players-container');
            if (!container) return;
            
            container.innerHTML = '';
            
            for (let i = 0; i < this.playerCount; i++) {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-input';
                
                const existingPlayer = this.currentGame?.players?.[i];
                const playerName = existingPlayer?.name || `Player ${i + 1}`;
                const selectedColor = existingPlayer?.color || this.config.playerColors[i % this.config.playerColors.length];
                
                let colorOptionsHTML = '';
                this.config.playerColors.forEach(color => {
                    const isSelected = color === selectedColor ? 'selected' : '';
                    colorOptionsHTML += `
                        <div class="color-option ${isSelected}" 
                             style="background-color: ${color}" 
                             data-color="${color}"
                             onclick="window.gameApp.selectPlayerColor(${i}, '${color}')"></div>
                    `;
                });
                
                playerDiv.innerHTML = `
                    <div class="player-number" id="player-number-${i}" style="--player-color: ${selectedColor}">
                        ${i + 1}
                    </div>
                    <div class="player-name-input">
                        <input type="text" class="form-control" id="player-name-${i}" 
                               value="${playerName}" placeholder="Player ${i + 1}">
                    </div>
                    <div class="color-picker">
                        ${colorOptionsHTML}
                    </div>
                `;
                
                container.appendChild(playerDiv);
                
                // Add event listeners
                const nameInput = document.getElementById(`player-name-${i}`);
                if (nameInput) {
                    nameInput.addEventListener('input', () => this.validatePlayerInputs());
                }
            }
            
            this.validatePlayerInputs();
        }

        selectPlayerColor(playerIndex, color) {
            // Update UI
            const playerInput = document.querySelector(`#players-container .player-input:nth-child(${playerIndex + 1})`);
            if (playerInput) {
                // Remove selected class from all colors
                playerInput.querySelectorAll('.color-option').forEach(option => {
                    option.classList.remove('selected');
                });
                
                // Add selected class to clicked color
                const selectedOption = playerInput.querySelector(`[data-color="${color}"]`);
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                }
                
                // Update player number color
                const playerNumber = document.getElementById(`player-number-${playerIndex}`);
                if (playerNumber) {
                    playerNumber.style.setProperty('--player-color', color);
                }
            }
            
            this.validatePlayerInputs();
        }

        validatePlayerInputs() {
            const startBtn = document.getElementById('start-new-game');
            if (!startBtn) return;
            
            let isValid = true;
            const usedColors = new Set();
            
            for (let i = 0; i < this.playerCount; i++) {
                const nameInput = document.getElementById(`player-name-${i}`);
                const selectedColor = document.querySelector(`#players-container .player-input:nth-child(${i + 1}) .color-option.selected`);
                
                if (!nameInput?.value.trim() || !selectedColor) {
                    isValid = false;
                    break;
                }
                
                const color = selectedColor.getAttribute('data-color');
                if (usedColors.has(color)) {
                    isValid = false;
                    break;
                }
                usedColors.add(color);
            }
            
            startBtn.disabled = !isValid;
        }

        // ===== GAME PLAY =====
        async startNewGame() {
            const gameNameInput = document.getElementById('game-name-input');
            const courseType = document.getElementById('course-type');
            const customHoles = document.getElementById('custom-holes');
            
            const gameName = gameNameInput?.value.trim() || `Game ${new Date().toLocaleDateString()}`;
            let holes = parseInt(courseType?.value) || 18;
            
            if (courseType?.value === 'custom') {
                holes = parseInt(customHoles?.value) || 18;
            }
            
            // Collect player data
            this.players = [];
            this.scores = {};
            
            for (let i = 0; i < this.playerCount; i++) {
                const nameInput = document.getElementById(`player-name-${i}`);
                const selectedColor = document.querySelector(`#players-container .player-input:nth-child(${i + 1}) .color-option.selected`);
                
                const name = nameInput?.value.trim() || `Player ${i + 1}`;
                const color = selectedColor?.getAttribute('data-color') || this.config.playerColors[i];
                
                this.players.push({ name, color });
                this.scores[i] = this.currentGame?.scores?.[i] || {};
            }
            
            this.currentHole = this.currentGame?.currentHole || 1;
            this.totalHoles = holes;
            this.gameComplete = false;
            this.gameStartTime = new Date().toISOString();
            
            // Create game data
            const gameData = {
                id: this.currentGame?.id || null,
                userId: this.currentUser.id,
                name: gameName,
                players: this.players,
                scores: this.scores,
                currentHole: this.currentHole,
                totalHoles: this.totalHoles,
                status: 'in-progress',
                startTime: this.gameStartTime
            };
            
            const result = await this.saveGame(gameData);
            if (result.success) {
                this.currentGame = result.game;
                this.showGameScreen();
            }
        }

        showGameScreen() {
            this.switchScreen('game-screen');
            this.updateGameHeader();
            this.generateHoleSelector();
            this.generateScoreInputs();
            this.updateLeaderboard();
            this.updateScorecard();
            this.showScoreTab();
        }

        updateGameHeader() {
            const gameTitle = document.getElementById('game-title');
            const holeNumber = document.getElementById('hole-number');
            const totalHolesEl = document.getElementById('total-holes');
            const progressIndicator = document.getElementById('progress-indicator');
            const progressPercentage = document.getElementById('progress-percentage');
            
            if (gameTitle) gameTitle.textContent = this.currentGame?.name || 'Game in Progress';
            if (holeNumber) holeNumber.textContent = `Hole ${this.currentHole}`;
            if (totalHolesEl) totalHolesEl.textContent = this.totalHoles;
            
            const progress = ((this.currentHole - 1) / this.totalHoles) * 100;
            if (progressIndicator) progressIndicator.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${Math.round(progress)}%`;
        }

        generateHoleSelector() {
            const selector = document.getElementById('hole-selector');
            if (!selector) return;
            
            selector.innerHTML = '';
            for (let i = 1; i <= this.totalHoles; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Hole ${i}`;
                if (i === this.currentHole) option.selected = true;
                selector.appendChild(option);
            }
        }

        generateScoreInputs() {
            const container = document.getElementById('score-players');
            if (!container) return;
            
            container.innerHTML = '';
            
            this.players.forEach((player, index) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'score-player';
                playerDiv.style.setProperty('--player-color', player.color);
                playerDiv.style.setProperty('--player-color-rgb', this.hexToRgb(player.color));
                
                const currentScore = this.scores[index]?.[this.currentHole] || '';
                const totalScore = this.calculatePlayerTotal(index);
                
                playerDiv.innerHTML = `
                    <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                    <div class="player-details">
                        <div class="player-name">${player.name}</div>
                        <div class="player-total">Total: ${totalScore}</div>
                    </div>
                    <input type="number" class="score-input" id="score-${index}" 
                           min="1" max="15" value="${currentScore}" placeholder="-"
                           data-player-index="${index}">
                `;
                
                container.appendChild(playerDiv);
                
                // Add event listener
                const scoreInput = document.getElementById(`score-${index}`);
                if (scoreInput) {
                    scoreInput.addEventListener('input', (e) => this.updateScore(index, e.target.value));
                    scoreInput.addEventListener('focus', () => this.setActivePlayer(index));
                }
            });
            
            this.updateNavigationButtons();
        }

        setActivePlayer(index) {
            this.activePlayerIndex = index;
            
            // Update quick score buttons
            const quickScores = document.getElementById('quick-scores');
            if (quickScores) {
                quickScores.innerHTML = '';
                this.config.quickScores.forEach(score => {
                    const btn = document.createElement('button');
                    btn.className = 'quick-score-btn';
                    btn.setAttribute('data-score', score);
                    btn.textContent = score === 5 ? '5+' : score;
                    btn.addEventListener('click', () => this.setQuickScore(score));
                    quickScores.appendChild(btn);
                });
            }
        }

        setQuickScore(score) {
            if (this.activePlayerIndex !== null) {
                const scoreInput = document.getElementById(`score-${this.activePlayerIndex}`);
                if (scoreInput) {
                    const actualScore = score === 5 ? 5 : score;
                    scoreInput.value = actualScore;
                    this.updateScore(this.activePlayerIndex, actualScore);
                    
                    // Move to next player if not the last one
                    if (this.activePlayerIndex < this.players.length - 1) {
                        const nextInput = document.getElementById(`score-${this.activePlayerIndex + 1}`);
                        if (nextInput) {
                            nextInput.focus();
                        }
                    }
                }
            }
        }

        updateScore(playerIndex, score) {
            const numScore = parseInt(score);
            
            if (isNaN(numScore) || numScore < 1 || numScore > 15) {
                if (this.scores[playerIndex]) {
                    delete this.scores[playerIndex][this.currentHole];
                }
            } else {
                if (!this.scores[playerIndex]) {
                    this.scores[playerIndex] = {};
                }
                this.scores[playerIndex][this.currentHole] = numScore;
            }
            
            this.updatePlayerTotals();
            this.updateLeaderboard();
            this.updateScorecard();
            this.autoSaveGame();
        }

        updatePlayerTotals() {
            this.players.forEach((player, index) => {
                const totalEl = document.querySelector(`#score-players .score-player:nth-child(${index + 1}) .player-total`);
                if (totalEl) {
                    totalEl.textContent = `Total: ${this.calculatePlayerTotal(index)}`;
                }
            });
        }

        calculatePlayerTotal(playerIndex) {
            if (!this.scores[playerIndex]) return 0;
            return Object.values(this.scores[playerIndex]).reduce((sum, score) => sum + score, 0);
        }

        updateNavigationButtons() {
            const prevBtn = document.getElementById('prev-hole-btn');
            const nextBtn = document.getElementById('next-hole-btn');
            
            if (prevBtn) {
                prevBtn.disabled = this.currentHole === 1;
            }
            
            if (nextBtn) {
                const btnText = nextBtn.querySelector('.btn-text');
                const btnIcon = nextBtn.querySelector('.btn-icon');
                
                if (this.currentHole === this.totalHoles) {
                    if (btnText) btnText.textContent = 'Finish';
                    if (btnIcon) btnIcon.textContent = '🏁';
                } else {
                    if (btnText) btnText.textContent = 'Next';
                    if (btnIcon) btnIcon.textContent = '→';
                }
            }
        }

        // ===== NAVIGATION =====
        previousHole() {
            if (this.currentHole > 1) {
                this.currentHole--;
                this.updateGameHeader();
                this.generateScoreInputs();
                this.autoSaveGame();
            }
        }

        nextHole() {
            if (this.currentHole < this.totalHoles) {
                this.currentHole++;
                this.updateGameHeader();
                this.generateScoreInputs();
                this.autoSaveGame();
            } else {
                this.completeGame();
            }
        }

        jumpToHole(holeNumber) {
            const hole = parseInt(holeNumber);
            if (hole >= 1 && hole <= this.totalHoles) {
                this.currentHole = hole;
                this.updateGameHeader();
                this.generateScoreInputs();
                this.autoSaveGame();
            }
        }

        // ===== LEADERBOARD =====
        updateLeaderboard() {
            const container = document.getElementById('leaderboard-list');
            if (!container) return;
            
            const sortedPlayers = this.getSortedPlayers();
            
            container.innerHTML = '';
            sortedPlayers.forEach((player, rank) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = `leaderboard-item ${rank === 0 ? 'leader' : ''}`;
                playerDiv.style.setProperty('--player-color', player.color);
                
                const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
                
                playerDiv.innerHTML = `
                    <div class="player-rank">
                        <div class="rank-number">${rank + 1}</div>
                        <div class="rank-name">${medal} ${player.name}</div>
                    </div>
                    <div class="rank-score">${player.total}</div>
                `;
                
                container.appendChild(playerDiv);
            });
        }

        getSortedPlayers() {
            return this.players.map((player, index) => ({
                ...player,
                index,
                total: this.calculatePlayerTotal(index)
            })).sort((a, b) => a.total - b.total);
        }

        // ===== SCORECARD =====
        updateScorecard() {
            const container = document.getElementById('scorecard-table');
            if (!container) return;
            
            let tableHTML = '<table><thead><tr><th class="player-name">Player</th>';
            
            // Hole headers
            for (let hole = 1; hole <= this.totalHoles; hole++) {
                tableHTML += `<th>H${hole}</th>`;
            }
            tableHTML += '<th>Total</th></tr></thead><tbody>';
            
            // Player rows
            this.players.forEach((player, index) => {
                tableHTML += `<tr><td class="player-name" style="color: ${player.color}"><strong>${player.name}</strong></td>`;
                
                for (let hole = 1; hole <= this.totalHoles; hole++) {
                    const score = this.scores[index]?.[hole] || '-';
                    const isCurrent = hole === this.currentHole ? 'current-hole' : '';
                    tableHTML += `<td class="${isCurrent}">${score}</td>`;
                }
                
                const total = this.calculatePlayerTotal(index);
                tableHTML += `<td class="total-cell">${total}</td></tr>`;
            });
            
            tableHTML += '</tbody></table>';
            container.innerHTML = tableHTML;
        }

        // ===== GAME COMPLETION =====
        completeGame() {
            this.gameComplete = true;
            if (this.currentGame) {
                this.currentGame.status = 'completed';
            }
            this.showGameCompleteModal();
        }

        showGameCompleteModal() {
            const modal = document.getElementById('game-complete-modal');
            const finalLeaderboard = document.getElementById('final-leaderboard');
            const gameStats = document.getElementById('game-stats');
            
            if (!modal) return;
            
            // Update final leaderboard
            if (finalLeaderboard) {
                const sortedPlayers = this.getSortedPlayers();
                let leaderboardHTML = '';
                
                sortedPlayers.forEach((player, rank) => {
                    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
                    leaderboardHTML += `
                        <div class="leaderboard-item ${rank === 0 ? 'leader' : ''}" style="--player-color: ${player.color}">
                            <div class="player-rank">
                                <div class="rank-number">${rank + 1}</div>
                                <div class="rank-name">${medal} ${player.name}</div>
                            </div>
                            <div class="rank-score">${player.total}</div>
                        </div>
                    `;
                });
                
                finalLeaderboard.innerHTML = leaderboardHTML;
            }
            
            // Update game stats
            if (gameStats) {
                const winner = this.getSortedPlayers()[0];
                const totalTime = this.calculateGameDuration();
                
                gameStats.innerHTML = `
                    <div class="celebration-stat">
                        <div class="celebration-stat-number">${winner.total}</div>
                        <div class="celebration-stat-label">Winning Score</div>
                    </div>
                    <div class="celebration-stat">
                        <div class="celebration-stat-number">${totalTime}</div>
                        <div class="celebration-stat-label">Game Duration</div>
                    </div>
                `;
            }
            
            modal.classList.remove('hidden');
        }

        calculateGameDuration() {
            if (!this.gameStartTime) return '0m';
            
            const start = new Date(this.gameStartTime);
            const now = new Date();
            const diffMinutes = Math.round((now - start) / (1000 * 60));
            
            if (diffMinutes < 60) return `${diffMinutes}m`;
            
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            return `${hours}h ${minutes}m`;
        }

        // ===== AUTO SAVE =====
        async autoSaveGame() {
            if (this.currentGame) {
                const gameData = {
                    ...this.currentGame,
                    players: this.players,
                    scores: this.scores,
                    currentHole: this.currentHole,
                    totalHoles: this.totalHoles,
                    status: this.gameComplete ? 'completed' : 'in-progress'
                };
                
                const result = await this.saveGame(gameData);
                if (result.success) {
                    this.currentGame = result.game;
                }
            }
        }

        // ===== MODALS AND UI =====
        showGameActions(gameId) {
            this.selectedGameId = gameId;
            const modal = document.getElementById('game-actions-modal');
            if (modal) modal.classList.remove('hidden');
        }

        hideModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('hidden');
        }

        showToast(message, type = 'success', duration = 3000) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️'
            };
            
            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-message">${message}</div>
            `;
            
            container.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, duration);
        }

        showLoading(message = 'Loading...') {
            const overlay = document.getElementById('loading-overlay');
            const loadingText = document.getElementById('loading-text');
            
            if (overlay) overlay.classList.remove('hidden');
            if (loadingText) loadingText.textContent = message;
        }

        hideLoading() {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) overlay.classList.add('hidden');
        }

        setupToastContainer() {
            if (!document.getElementById('toast-container')) {
                const container = document.createElement('div');
                container.id = 'toast-container';
                container.className = 'toast-container';
                document.body.appendChild(container);
            }
        }

        // ===== TAB MANAGEMENT =====
        showScoreTab() {
            this.switchTab('score-tab', 'score-content');
        }

        showLeaderboardTab() {
            this.switchTab('leaderboard-tab', 'leaderboard-content');
            this.updateLeaderboard();
        }

        showScorecardTab() {
            this.switchTab('scorecard-tab', 'scorecard-content');
            this.updateScorecard();
        }

        switchTab(activeTabId, activeContentId) {
            // Update tabs
            document.querySelectorAll('.game-tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById(activeTabId)?.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(activeContentId)?.classList.add('active');
        }

        // ===== UTILITY FUNCTIONS =====
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                '0, 0, 0';
        }

        // ===== EVENT LISTENERS =====
        setupEventListeners() {
            this.setupAuthListeners();
            this.setupDashboardListeners();
            this.setupGameListeners();
            this.setupModalListeners();
        }

        setupAuthListeners() {
            // Phone input formatting
            const phoneInput = document.getElementById('phone-input');
            const countryCode = document.getElementById('country-code');
            const sendSMSBtn = document.getElementById('send-sms-btn');
            
            if (phoneInput && countryCode) {
                phoneInput.addEventListener('input', (e) => {
                    const formatted = this.formatPhoneNumber(e.target.value, countryCode.value);
                    e.target.value = formatted;
                });
            }
            
            if (sendSMSBtn) {
                sendSMSBtn.addEventListener('click', () => this.handleSendSMS());
            }
            
            // SMS verification
            this.setupSMSCodeInputs();
            
            const verifySMSBtn = document.getElementById('verify-sms-btn');
            if (verifySMSBtn) {
                verifySMSBtn.addEventListener('click', () => this.handleVerifySMS());
            }
            
            const backToPhone = document.getElementById('back-to-phone');
            if (backToPhone) {
                backToPhone.addEventListener('click', () => this.showLoginScreen());
            }
            
            const resendCodeBtn = document.getElementById('resend-code-btn');
            if (resendCodeBtn) {
                resendCodeBtn.addEventListener('click', () => this.handleResendCode());
            }
        }

        setupSMSCodeInputs() {
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`code-${i}`);
                if (input) {
                    input.addEventListener('input', (e) => this.handleCodeInput(e, i));
                    input.addEventListener('keydown', (e) => this.handleCodeKeydown(e, i));
                    input.addEventListener('paste', (e) => this.handleCodePaste(e));
                }
            }
        }

        handleCodeInput(e, position) {
            const value = e.target.value;
            
            if (value.length > 0) {
                e.target.classList.add('filled');
                
                // Move to next input
                if (position < 6) {
                    const nextInput = document.getElementById(`code-${position + 1}`);
                    if (nextInput) nextInput.focus();
                }
                
                // Check if all inputs are filled
                this.checkSMSCodeComplete();
            } else {
                e.target.classList.remove('filled');
            }
        }

        handleCodeKeydown(e, position) {
            if (e.key === 'Backspace' && e.target.value === '' && position > 1) {
                const prevInput = document.getElementById(`code-${position - 1}`);
                if (prevInput) {
                    prevInput.focus();
                    prevInput.value = '';
                    prevInput.classList.remove('filled');
                }
            }
        }

        handleCodePaste(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const digits = paste.replace(/\D/g, '').slice(0, 6);
            
            for (let i = 0; i < 6; i++) {
                const input = document.getElementById(`code-${i + 1}`);
                if (input) {
                    input.value = digits[i] || '';
                    if (digits[i]) {
                        input.classList.add('filled');
                    } else {
                        input.classList.remove('filled');
                    }
                }
            }
            
            this.checkSMSCodeComplete();
        }

        checkSMSCodeComplete() {
            const code = this.getSMSCode();
            if (code.length === 6) {
                setTimeout(() => this.handleVerifySMS(), 500);
            }
        }

        getSMSCode() {
            let code = '';
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`code-${i}`);
                if (input) code += input.value;
            }
            return code;
        }

        setupDashboardListeners() {
            const newGameFAB = document.getElementById('new-game-fab');
            if (newGameFAB) {
                newGameFAB.addEventListener('click', () => this.showPlayerSetup());
            }
            
            const quick9Btn = document.getElementById('quick-9-btn');
            if (quick9Btn) {
                quick9Btn.addEventListener('click', () => this.createQuickGame(9));
            }
            
            const quick18Btn = document.getElementById('quick-18-btn');
            if (quick18Btn) {
                quick18Btn.addEventListener('click', () => this.createQuickGame(18));
            }
            
            const profileMenuBtn = document.getElementById('profile-menu-btn');
            if (profileMenuBtn) {
                profileMenuBtn.addEventListener('click', () => this.showModal('profile-modal'));
            }
            
            const gamesSearch = document.getElementById('games-search');
            if (gamesSearch) {
                gamesSearch.addEventListener('input', () => this.filterGames());
            }
            
            const gamesFilter = document.getElementById('games-filter');
            if (gamesFilter) {
                gamesFilter.addEventListener('change', () => this.filterGames());
            }
        }

        setupGameListeners() {
            // Setup screen listeners
            const backToDashboard = document.getElementById('back-to-dashboard');
            if (backToDashboard) {
                backToDashboard.addEventListener('click', () => this.showDashboard());
            }
            
            const decreasePlayersBtn = document.getElementById('decrease-players');
            if (decreasePlayersBtn) {
                decreasePlayersBtn.addEventListener('click', () => this.changePlayerCount(-1));
            }
            
            const increasePlayersBtn = document.getElementById('increase-players');
            if (increasePlayersBtn) {
                increasePlayersBtn.addEventListener('click', () => this.changePlayerCount(1));
            }
            
            const courseType = document.getElementById('course-type');
            if (courseType) {
                courseType.addEventListener('change', () => this.handleCourseTypeChange());
            }
            
            const startNewGameBtn = document.getElementById('start-new-game');
            if (startNewGameBtn) {
                startNewGameBtn.addEventListener('click', () => this.startNewGame());
            }
            
            // Game screen listeners
            const scoreTab = document.getElementById('score-tab');
            const leaderboardTab = document.getElementById('leaderboard-tab');
            const scorecardTab = document.getElementById('scorecard-tab');
            
            if (scoreTab) scoreTab.addEventListener('click', () => this.showScoreTab());
            if (leaderboardTab) leaderboardTab.addEventListener('click', () => this.showLeaderboardTab());
            if (scorecardTab) scorecardTab.addEventListener('click', () => this.showScorecardTab());
            
            const prevHoleBtn = document.getElementById('prev-hole-btn');
            const nextHoleBtn = document.getElementById('next-hole-btn');
            const holeSelector = document.getElementById('hole-selector');
            
            if (prevHoleBtn) prevHoleBtn.addEventListener('click', () => this.previousHole());
            if (nextHoleBtn) nextHoleBtn.addEventListener('click', () => this.nextHole());
            if (holeSelector) {
                holeSelector.addEventListener('change', (e) => this.jumpToHole(e.target.value));
            }
            
            const gameMenuBtn = document.getElementById('game-menu-btn');
            if (gameMenuBtn) {
                gameMenuBtn.addEventListener('click', () => this.showModal('game-menu-modal'));
            }
        }

        setupModalListeners() {
            // Close buttons
            const closeButtons = document.querySelectorAll('[id^="close-"]');
            closeButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const buttonId = e.target.id;
                    if (buttonId === 'close-config-notice') {
                        this.hideModal('config-notice');
                        return;
                    }
                    
                    const modalId = buttonId.replace('close-', '') + '-modal';
                    this.hideModal(modalId);
                });
            });
            
            // Game actions
            const continueGame = document.getElementById('continue-selected-game');
            if (continueGame) {
                continueGame.addEventListener('click', () => this.continueSelectedGame());
            }
            
            const editGame = document.getElementById('edit-selected-game');
            if (editGame) {
                editGame.addEventListener('click', () => this.editSelectedGame());
            }
            
            const duplicateGame = document.getElementById('duplicate-game');
            if (duplicateGame) {
                duplicateGame.addEventListener('click', () => this.duplicateSelectedGame());
            }
            
            const deleteGame = document.getElementById('delete-selected-game');
            if (deleteGame) {
                deleteGame.addEventListener('click', () => this.deleteSelectedGame());
            }
            
            // Profile actions
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
            
            // Game menu actions
            const saveAndExit = document.getElementById('save-and-exit');
            if (saveAndExit) {
                saveAndExit.addEventListener('click', () => this.saveAndExitGame());
            }
            
            // Game complete actions
            const saveGameBtn = document.getElementById('save-game-btn');
            const newGameBtn = document.getElementById('new-game-btn');
            
            if (saveGameBtn) {
                saveGameBtn.addEventListener('click', () => this.saveCompletedGame());
            }
            
            if (newGameBtn) {
                newGameBtn.addEventListener('click', () => this.startNewGameFromComplete());
            }
        }

        // ===== EVENT HANDLERS =====
        async handleSendSMS() {
            const phoneInput = document.getElementById('phone-input');
            const countryCode = document.getElementById('country-code');
            
            const phone = phoneInput?.value?.trim();
            const code = countryCode?.value || '+1';
            
            if (!phone) {
                this.showToast('Please enter a phone number', 'error');
                return;
            }
            
            const fullPhone = `${code} ${phone}`;
            
            // Set button loading state
            this.setButtonLoading('send-sms-btn', true);
            
            try {
                const result = await this.sendSMSCode(fullPhone);
                if (result.success) {
                    this.setButtonLoading('send-sms-btn', false);
                    this.switchScreen('verification-screen');
                    const smsMessage = document.getElementById('sms-message');
                    if (smsMessage) {
                        smsMessage.textContent = `Enter the 6-digit code sent to ${fullPhone}`;
                    }
                    
                    // Focus first code input
                    const firstInput = document.getElementById('code-1');
                    if (firstInput) firstInput.focus();
                    
                    this.startResendTimer();
                } else {
                    this.setButtonLoading('send-sms-btn', false);
                    this.showToast(result.message || 'Failed to send SMS', 'error');
                }
            } catch (error) {
                this.setButtonLoading('send-sms-btn', false);
                this.showToast('Failed to send SMS. Please try again.', 'error');
            }
        }

        async handleVerifySMS() {
            const code = this.getSMSCode();
            
            if (code.length !== 6) {
                this.showToast('Please enter a 6-digit code', 'error');
                return;
            }
            
            const phoneInput = document.getElementById('phone-input');
            const countryCode = document.getElementById('country-code');
            const fullPhone = `${countryCode?.value || '+1'} ${phoneInput?.value?.trim()}`;
            
            // Set button loading state
            this.setButtonLoading('verify-sms-btn', true);
            
            try {
                const result = await this.verifySMSCode(fullPhone, code);
                this.setButtonLoading('verify-sms-btn', false);
                
                if (result.success) {
                    this.showToast('Successfully signed in!', 'success');
                    await this.loadSavedGames();
                    this.showDashboard();
                } else {
                    this.showToast(result.message, 'error');
                    this.clearSMSCode();
                }
            } catch (error) {
                this.setButtonLoading('verify-sms-btn', false);
                this.showToast('Verification failed. Please try again.', 'error');
            }
        }

        handleResendCode() {
            this.handleSendSMS();
        }

        startResendTimer() {
            this.resendCountdown = 30;
            const resendBtn = document.getElementById('resend-code-btn');
            const resendText = document.getElementById('resend-text');
            const resendTimer = document.getElementById('resend-timer');
            const timerCount = document.getElementById('timer-count');
            
            if (resendBtn) resendBtn.disabled = true;
            if (resendText) resendText.classList.add('hidden');
            if (resendTimer) resendTimer.classList.remove('hidden');
            
            this.resendTimer = setInterval(() => {
                this.resendCountdown--;
                if (timerCount) timerCount.textContent = this.resendCountdown;
                
                if (this.resendCountdown <= 0) {
                    clearInterval(this.resendTimer);
                    if (resendBtn) resendBtn.disabled = false;
                    if (resendText) resendText.classList.remove('hidden');
                    if (resendTimer) resendTimer.classList.add('hidden');
                }
            }, 1000);
        }

        clearSMSCode() {
            for (let i = 1; i <= 6; i++) {
                const input = document.getElementById(`code-${i}`);
                if (input) {
                    input.value = '';
                    input.classList.remove('filled');
                }
            }
            
            const firstInput = document.getElementById('code-1');
            if (firstInput) firstInput.focus();
        }

        async handleLogout() {
            if (isSupabaseConfigured) {
                try {
                    await supabase.auth.signOut();
                } catch (error) {
                    console.error('Logout error:', error);
                }
            }
            
            // Clear local state regardless
            this.currentUser = null;
            this.savedGames = [];
            this.currentGame = null;
            
            try {
                localStorage.removeItem('miniGolfProData');
            } catch (error) {
                console.warn('Could not clear localStorage');
            }
            
            this.hideModal('profile-modal');
            this.showLoginScreen();
            this.showToast('Signed out successfully', 'success');
        }

        changePlayerCount(delta) {
            const newCount = this.playerCount + delta;
            if (newCount >= 1 && newCount <= this.config.maxPlayers) {
                this.playerCount = newCount;
                this.updatePlayerCountDisplay();
                this.generatePlayerInputs();
            }
        }

        handleCourseTypeChange() {
            const courseType = document.getElementById('course-type');
            const customHolesGroup = document.getElementById('custom-holes-group');
            
            if (courseType?.value === 'custom') {
                customHolesGroup?.classList.remove('hidden');
            } else {
                customHolesGroup?.classList.add('hidden');
            }
        }

        createQuickGame(holes) {
            // Create a quick game with default players
            const quickGame = {
                name: `Quick ${holes}-Hole Game`,
                players: [
                    { name: 'Player 1', color: this.config.playerColors[0] },
                    { name: 'Player 2', color: this.config.playerColors[1] }
                ],
                totalHoles: holes,
                currentHole: 1,
                scores: { 0: {}, 1: {} },
                status: 'in-progress'
            };
            
            this.showPlayerSetup(quickGame);
        }

        continueSelectedGame() {
            const game = this.savedGames.find(g => g.id === this.selectedGameId);
            if (game) {
                this.currentGame = game;
                this.players = game.players;
                this.scores = game.scores;
                this.currentHole = game.currentHole;
                this.totalHoles = game.totalHoles || 18;
                this.gameComplete = game.status === 'completed';
                
                this.hideModal('game-actions-modal');
                this.showGameScreen();
            }
        }

        editSelectedGame() {
            const game = this.savedGames.find(g => g.id === this.selectedGameId);
            if (game) {
                this.hideModal('game-actions-modal');
                this.showPlayerSetup(game);
            }
        }

        duplicateSelectedGame() {
            this.duplicateGame(this.selectedGameId);
            this.hideModal('game-actions-modal');
        }

        async deleteSelectedGame() {
            if (confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
                await this.deleteGame(this.selectedGameId);
                this.hideModal('game-actions-modal');
                this.renderGames();
            }
        }

        async saveAndExitGame() {
            await this.autoSaveGame();
            this.hideModal('game-menu-modal');
            this.showDashboard();
            this.showToast('Game saved successfully!', 'success');
        }

        async saveCompletedGame() {
            if (this.currentGame) {
                this.currentGame.status = 'completed';
                await this.autoSaveGame();
            }
            this.hideModal('game-complete-modal');
            this.showDashboard();
            this.showToast('Game completed and saved!', 'success');
        }

        startNewGameFromComplete() {
            this.hideModal('game-complete-modal');
            this.showPlayerSetup();
        }

        showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('hidden');
        }

        filterGames() {
            // Implementation for filtering games would go here
            // For now, just re-render all games
            this.renderGames();
        }
    }

    // Initialize the application
    window.gameApp = new MiniGolfPro();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}