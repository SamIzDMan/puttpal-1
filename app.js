// =============================================================================
// SUPABASE CONFIGURATION
// =============================================================================
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://ghzbabpscirvyzlhujeh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoemJhYnBzY2lydnl6bGh1amVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjgzMTYsImV4cCI6MjA3MzY0NDMxNn0.dFXWzHY-5BbypW5pNbHPPX0uPpyCX9836vbJYknghT4'; // Your anon/public key 



// Initialize Supabase client
let supabase = null;

// Check if Supabase credentials are configured
const isSupabaseConfigured = () => {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE';
};

// Initialize Supabase if configured and available
try {
    if (isSupabaseConfigured() && typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (error) {
    console.warn('Supabase initialization failed:', error);
}

// =============================================================================
// GLOBAL STATE
// =============================================================================
let currentUser = null;
let currentGame = null;
let currentPlayers = [];
let currentScores = {};
let availableColors = ['#6B73FF', '#10B981', '#64748B', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#6B7280', '#475569', '#EF4444'];
let usedColors = [];
let isInitialized = false;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const showLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
};

const hideLoading = () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
};

const showError = (message, elementId = 'auth-error') => {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
};

const hideError = (elementId = 'auth-error') => {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.classList.add('hidden');
    }
};

const showSuccess = (message, elementId = 'auth-success') => {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
    }
};

const hideSuccess = (elementId = 'auth-success') => {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.classList.add('hidden');
    }
};

const switchScreen = (screenId) => {
    try {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    } catch (error) {
        console.error('Screen switching error:', error);
    }
};

const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const formatDate = (date) => {
    try {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return new Date().toLocaleDateString();
    }
};

// =============================================================================
// AUTHENTICATION
// =============================================================================
const initializeAuth = async () => {
    try {
        if (!supabase) {
            // Demo mode - check for saved user
            const savedUser = localStorage.getItem('minigolf_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    showDashboard();
                    return;
                } catch (error) {
                    console.error('Invalid saved user data:', error);
                    localStorage.removeItem('minigolf_user');
                }
            }
            console.log('Running in demo mode (Supabase not configured)');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            await ensureUserProfile();
            showDashboard();
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
    }
};

const ensureUserProfile = async () => {
    if (!supabase || !currentUser) return;

    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code === 'PGRST116') {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([
                    {
                        user_id: currentUser.id,
                        email: currentUser.email
                    }
                ]);

            if (insertError) {
                console.error('Error creating profile:', insertError);
            }
        }
    } catch (error) {
        console.error('Profile error:', error);
    }
};

const sendMagicLink = async (email) => {
    if (!supabase) {
        showSuccess('Demo mode: Click "Verify Code" to continue (enter any 6 digits)');
        const otpSection = document.getElementById('otp-section');
        if (otpSection) {
            otpSection.classList.remove('hidden');
        }
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true
            }
        });

        if (error) throw error;

        showSuccess('Check your email for the magic link or verification code!');
        const otpSection = document.getElementById('otp-section');
        if (otpSection) {
            otpSection.classList.remove('hidden');
        }
    } catch (error) {
        throw error;
    }
};

const verifyOTP = async (email, token) => {
    if (!supabase) {
        if (token.length === 6 && /^\d+$/.test(token)) {
            currentUser = {
                id: generateId(),
                email: email,
                created_at: new Date().toISOString()
            };
            localStorage.setItem('minigolf_user', JSON.stringify(currentUser));
            showDashboard();
            return;
        } else {
            throw new Error('Please enter a 6-digit verification code');
        }
    }

    try {
        const { data, error } = await supabase.auth.verifyOtp({
            email: email,
            token: token,
            type: 'email'
        });

        if (error) throw error;

        currentUser = data.user;
        await ensureUserProfile();
        showDashboard();
    } catch (error) {
        throw error;
    }
};

const logout = async () => {
    try {
        if (supabase) {
            await supabase.auth.signOut();
        }
        
        currentUser = null;
        currentGame = null;
        currentPlayers = [];
        currentScores = {};
        
        localStorage.removeItem('minigolf_user');
        localStorage.removeItem('minigolf_games');
        
        switchScreen('auth-screen');
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// =============================================================================
// GAME DATA MANAGEMENT
// =============================================================================
const saveGameToDatabase = async (gameData) => {
    if (!supabase || !currentUser) {
        return saveGameToLocalStorage(gameData);
    }

    try {
        const { data, error } = await supabase
            .from('games')
            .insert([{
                user_id: currentUser.id,
                name: gameData.name,
                current_hole: gameData.currentHole,
                total_holes: gameData.totalHoles,
                status: gameData.status,
                location: gameData.location || null,
                course: gameData.course || null
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Database save error:', error);
        return saveGameToLocalStorage(gameData);
    }
};

const savePlayersToDatabase = async (gameId, players) => {
    if (!supabase) {
        return savePlayersToLocalStorage(players, gameId);
    }

    try {
        const playersData = players.map((player, index) => ({
            game_id: gameId,
            name: player.name,
            color: player.color,
            position: index + 1
        }));

        const { data, error } = await supabase
            .from('players')
            .insert(playersData)
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Players save error:', error);
        return savePlayersToLocalStorage(players, gameId);
    }
};

const saveScoresToDatabase = async (playerScores) => {
    if (!supabase) {
        return saveScoresToLocalStorage(playerScores);
    }

    try {
        const scoresData = [];
        for (const [playerId, scores] of Object.entries(playerScores)) {
            for (const [holeNumber, strokes] of Object.entries(scores)) {
                if (strokes && strokes > 0) {
                    scoresData.push({
                        player_id: playerId,
                        hole_number: parseInt(holeNumber),
                        strokes: parseInt(strokes)
                    });
                }
            }
        }

        if (scoresData.length === 0) return;

        const playerIds = Object.keys(playerScores);
        await supabase
            .from('scores')
            .delete()
            .in('player_id', playerIds);

        const { data, error } = await supabase
            .from('scores')
            .insert(scoresData)
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Scores save error:', error);
        return saveScoresToLocalStorage(playerScores);
    }
};

const updateGameInDatabase = async (gameId, updates) => {
    if (!supabase) {
        return updateGameInLocalStorage(gameId, updates);
    }

    try {
        const { data, error } = await supabase
            .from('games')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', gameId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Game update error:', error);
        return updateGameInLocalStorage(gameId, updates);
    }
};

const loadGamesFromDatabase = async () => {
    if (!supabase || !currentUser) {
        return loadGamesFromLocalStorage();
    }

    try {
        const { data: games, error } = await supabase
            .from('games')
            .select(`
                *,
                players (
                    id,
                    name,
                    color,
                    position,
                    scores (
                        hole_number,
                        strokes
                    )
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return games || [];
    } catch (error) {
        console.error('Load games error:', error);
        return loadGamesFromLocalStorage();
    }
};

const deleteGameFromDatabase = async (gameId) => {
    if (!supabase) {
        return deleteGameFromLocalStorage(gameId);
    }

    try {
        const { data: players } = await supabase
            .from('players')
            .select('id')
            .eq('game_id', gameId);

        if (players && players.length > 0) {
            const playerIds = players.map(p => p.id);
            await supabase
                .from('scores')
                .delete()
                .in('player_id', playerIds);
        }

        await supabase
            .from('players')
            .delete()
            .eq('game_id', gameId);

        const { error } = await supabase
            .from('games')
            .delete()
            .eq('id', gameId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Delete game error:', error);
        return deleteGameFromLocalStorage(gameId);
    }
};

// =============================================================================
// LOCAL STORAGE FALLBACKS
// =============================================================================
const saveGameToLocalStorage = (gameData) => {
    try {
        const games = JSON.parse(localStorage.getItem('minigolf_games') || '[]');
        const game = {
            id: generateId(),
            ...gameData,
            user_id: currentUser?.id || 'demo',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        games.push(game);
        localStorage.setItem('minigolf_games', JSON.stringify(games));
        return game;
    } catch (error) {
        console.error('Local storage save error:', error);
        return null;
    }
};

const savePlayersToLocalStorage = (players, gameId) => {
    try {
        const playersWithIds = players.map((player, index) => ({
            id: generateId(),
            game_id: gameId || currentGame?.id,
            ...player,
            position: index + 1,
            created_at: new Date().toISOString()
        }));
        
        if (gameId || currentGame?.id) {
            localStorage.setItem(`players_${gameId || currentGame.id}`, JSON.stringify(playersWithIds));
        }
        
        return playersWithIds;
    } catch (error) {
        console.error('Local storage players save error:', error);
        return [];
    }
};

const saveScoresToLocalStorage = (playerScores) => {
    try {
        if (currentGame?.id) {
            localStorage.setItem(`scores_${currentGame.id}`, JSON.stringify(playerScores));
        }
        return playerScores;
    } catch (error) {
        console.error('Local storage scores save error:', error);
        return {};
    }
};

const updateGameInLocalStorage = (gameId, updates) => {
    try {
        const games = JSON.parse(localStorage.getItem('minigolf_games') || '[]');
        const gameIndex = games.findIndex(g => g.id === gameId);
        if (gameIndex !== -1) {
            games[gameIndex] = {
                ...games[gameIndex],
                ...updates,
                updated_at: new Date().toISOString()
            };
            localStorage.setItem('minigolf_games', JSON.stringify(games));
            return games[gameIndex];
        }
        return null;
    } catch (error) {
        console.error('Local storage update error:', error);
        return null;
    }
};

const loadGamesFromLocalStorage = () => {
    try {
        const games = JSON.parse(localStorage.getItem('minigolf_games') || '[]');
        return games.filter(g => g.user_id === (currentUser?.id || 'demo'));
    } catch (error) {
        console.error('Local storage load error:', error);
        return [];
    }
};

const deleteGameFromLocalStorage = (gameId) => {
    try {
        const games = JSON.parse(localStorage.getItem('minigolf_games') || '[]');
        const filteredGames = games.filter(g => g.id !== gameId);
        localStorage.setItem('minigolf_games', JSON.stringify(filteredGames));
        
        localStorage.removeItem(`players_${gameId}`);
        localStorage.removeItem(`scores_${gameId}`);
        
        return true;
    } catch (error) {
        console.error('Local storage delete error:', error);
        return false;
    }
};

// =============================================================================
// UI MANAGEMENT
// =============================================================================
const showDashboard = async () => {
    try {
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = currentUser?.email || 'Demo User';
        }
        switchScreen('dashboard-screen');
        await loadAndDisplayGames();
    } catch (error) {
        console.error('Show dashboard error:', error);
    }
};

const loadAndDisplayGames = async () => {
    try {
        showLoading();
        const games = await loadGamesFromDatabase();
        displayGames(games);
    } catch (error) {
        console.error('Load games error:', error);
        showError('Failed to load games');
    } finally {
        hideLoading();
    }
};

const displayGames = (games) => {
    try {
        const gamesGrid = document.getElementById('games-grid');
        const noGames = document.getElementById('no-games');
        
        if (!games || games.length === 0) {
            if (gamesGrid) gamesGrid.innerHTML = '';
            if (noGames) noGames.classList.remove('hidden');
            return;
        }
        
        if (noGames) noGames.classList.add('hidden');
        
        const template = document.getElementById('game-card-template');
        if (!template || !gamesGrid) return;
        
        gamesGrid.innerHTML = '';
        
        games.forEach(game => {
            const card = template.content.cloneNode(true);
            
            const nameElement = card.querySelector('.game-name');
            const statusElement = card.querySelector('.game-status');
            const detailsElement = card.querySelector('.game-details');
            const progressElement = card.querySelector('.game-progress');
            const dateElement = card.querySelector('.game-date');
            
            if (nameElement) nameElement.textContent = game.name;
            if (statusElement) {
                statusElement.textContent = game.status;
                statusElement.classList.add(`status--${game.status === 'active' ? 'info' : 'success'}`);
            }
            
            const details = [];
            if (game.location) details.push(game.location);
            if (game.course) details.push(game.course);
            if (detailsElement) detailsElement.textContent = details.join(' • ') || 'Mini Golf Game';
            
            if (progressElement) progressElement.textContent = `Hole ${game.current_hole} of ${game.total_holes}`;
            if (dateElement) dateElement.textContent = formatDate(game.created_at);
            
            const continueBtn = card.querySelector('.continue-game-btn');
            const deleteBtn = card.querySelector('.delete-game-btn');
            
            if (continueBtn) continueBtn.addEventListener('click', () => continueGame(game));
            if (deleteBtn) deleteBtn.addEventListener('click', () => deleteGame(game.id));
            
            gamesGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Display games error:', error);
    }
};

const continueGame = async (game) => {
    try {
        showLoading();
        currentGame = game;
        
        if (supabase) {
            const { data: players, error } = await supabase
                .from('players')
                .select(`
                    *,
                    scores (
                        hole_number,
                        strokes
                    )
                `)
                .eq('game_id', game.id)
                .order('position');

            if (error) throw error;
            
            currentPlayers = players || [];
            
            currentScores = {};
            currentPlayers.forEach(player => {
                currentScores[player.id] = {};
                if (player.scores) {
                    player.scores.forEach(score => {
                        currentScores[player.id][score.hole_number] = score.strokes;
                    });
                }
            });
        } else {
            currentPlayers = JSON.parse(localStorage.getItem(`players_${game.id}`) || '[]');
            currentScores = JSON.parse(localStorage.getItem(`scores_${game.id}`) || '{}');
        }
        
        if (game.status === 'completed') {
            showGameResults();
        } else {
            showGameScreen();
        }
    } catch (error) {
        console.error('Continue game error:', error);
        showError('Failed to load game');
    } finally {
        hideLoading();
    }
};

const deleteGame = async (gameId) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading();
        await deleteGameFromDatabase(gameId);
        await loadAndDisplayGames();
    } catch (error) {
        console.error('Delete game error:', error);
        showError('Failed to delete game');
    } finally {
        hideLoading();
    }
};

const showGameSetup = () => {
    try {
        switchScreen('setup-screen');
        resetSetupForm();
        addPlayer();
    } catch (error) {
        console.error('Show game setup error:', error);
    }
};

const resetSetupForm = () => {
    try {
        const gameNameInput = document.getElementById('game-name');
        const totalHolesSelect = document.getElementById('total-holes');
        const locationInput = document.getElementById('game-location');
        const courseInput = document.getElementById('game-course');
        const playersList = document.getElementById('players-list');
        
        if (gameNameInput) gameNameInput.value = 'Mini Golf Game';
        if (totalHolesSelect) totalHolesSelect.value = '18';
        if (locationInput) locationInput.value = '';
        if (courseInput) courseInput.value = '';
        if (playersList) playersList.innerHTML = '';
        
        usedColors = [];
    } catch (error) {
        console.error('Reset setup form error:', error);
    }
};

const addPlayer = () => {
    try {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        const playerCount = playersList.children.length;
        
        if (playerCount >= 10) {
            alert('Maximum 10 players allowed');
            return;
        }
        
        const template = document.getElementById('player-template');
        if (!template) return;
        
        const player = template.content.cloneNode(true);
        
        const availableColor = availableColors.find(color => !usedColors.includes(color)) || availableColors[0];
        usedColors.push(availableColor);
        
        const colorCircle = player.querySelector('.color-circle');
        const nameInput = player.querySelector('.player-name-input');
        const removeBtn = player.querySelector('.remove-player-btn');
        
        if (colorCircle) colorCircle.style.backgroundColor = availableColor;
        if (nameInput) nameInput.value = `Player ${playerCount + 1}`;
        
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                try {
                    const playerItem = removeBtn.closest('.player-item');
                    if (playerItem) {
                        const colorCircle = playerItem.querySelector('.color-circle');
                        if (colorCircle) {
                            const color = rgbToHex(colorCircle.style.backgroundColor);
                            usedColors = usedColors.filter(c => c !== color);
                        }
                        playerItem.remove();
                    }
                } catch (error) {
                    console.error('Remove player error:', error);
                }
            });
        }
        
        if (colorCircle) {
            colorCircle.addEventListener('click', () => {
                try {
                    const currentColor = colorCircle.style.backgroundColor;
                    const currentColorHex = rgbToHex(currentColor);
                    const availableColor = availableColors.find(color => !usedColors.includes(color) && color !== currentColorHex);
                    
                    if (availableColor) {
                        usedColors = usedColors.filter(c => c !== currentColorHex);
                        usedColors.push(availableColor);
                        colorCircle.style.backgroundColor = availableColor;
                    }
                } catch (error) {
                    console.error('Color picker error:', error);
                }
            });
        }
        
        playersList.appendChild(player);
    } catch (error) {
        console.error('Add player error:', error);
    }
};

const rgbToHex = (rgb) => {
    try {
        if (rgb.startsWith('#')) return rgb;
        
        const result = rgb.match(/\d+/g);
        if (!result || result.length < 3) return rgb;
        
        return '#' + result.map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    } catch (error) {
        console.error('RGB to hex conversion error:', error);
        return rgb;
    }
};

const startGame = async () => {
    try {
        const playerItems = document.querySelectorAll('.player-item');
        
        if (playerItems.length === 0) {
            alert('Please add at least one player');
            return;
        }
        
        const playerNames = Array.from(playerItems).map(item => 
            item.querySelector('.player-name-input')?.value?.trim() || ''
        );
        
        if (playerNames.some(name => !name)) {
            alert('Please enter names for all players');
            return;
        }
        
        showLoading();
        
        const gameNameInput = document.getElementById('game-name');
        const totalHolesSelect = document.getElementById('total-holes');
        const locationInput = document.getElementById('game-location');
        const courseInput = document.getElementById('game-course');
        
        const gameData = {
            name: gameNameInput?.value || 'Mini Golf Game',
            currentHole: 1,
            totalHoles: parseInt(totalHolesSelect?.value || '18'),
            status: 'active',
            location: locationInput?.value || '',
            course: courseInput?.value || ''
        };
        
        currentGame = await saveGameToDatabase(gameData);
        if (!currentGame) {
            throw new Error('Failed to create game');
        }
        
        const playersData = Array.from(playerItems).map(item => {
            const nameInput = item.querySelector('.player-name-input');
            const colorCircle = item.querySelector('.color-circle');
            
            return {
                name: nameInput?.value?.trim() || 'Player',
                color: rgbToHex(colorCircle?.style?.backgroundColor || '#6B73FF')
            };
        });
        
        currentPlayers = await savePlayersToDatabase(currentGame.id, playersData);
        
        currentScores = {};
        currentPlayers.forEach(player => {
            currentScores[player.id] = {};
        });
        
        showGameScreen();
    } catch (error) {
        console.error('Start game error:', error);
        showError('Failed to start game');
    } finally {
        hideLoading();
    }
};

const showGameScreen = () => {
    try {
        switchScreen('game-screen');
        updateGameHeader();
        displayPlayerScores();
        updateGameNavigation();
        updateLeaderboard();
    } catch (error) {
        console.error('Show game screen error:', error);
    }
};

const updateGameHeader = () => {
    try {
        const titleElement = document.getElementById('game-title');
        const locationElement = document.getElementById('game-location-display');
        const holeElement = document.getElementById('current-hole-display');
        const totalElement = document.getElementById('total-holes-display');
        
        if (titleElement) titleElement.textContent = currentGame?.name || 'Mini Golf Game';
        
        if (locationElement) {
            const details = [];
            if (currentGame?.location) details.push(currentGame.location);
            if (currentGame?.course) details.push(currentGame.course);
            locationElement.textContent = details.join(' • ') || '';
        }
        
        if (holeElement) holeElement.textContent = `Hole ${currentGame?.current_hole || 1}`;
        if (totalElement) totalElement.textContent = `of ${currentGame?.total_holes || 18}`;
    } catch (error) {
        console.error('Update game header error:', error);
    }
};

const displayPlayerScores = () => {
    try {
        const container = document.getElementById('players-scores');
        const template = document.getElementById('player-score-template');
        
        if (!container || !template || !currentPlayers) return;
        
        container.innerHTML = '';
        
        currentPlayers.forEach(player => {
            const card = template.content.cloneNode(true);
            
            const nameElement = card.querySelector('.player-name');
            const colorElement = card.querySelector('.player-color-indicator');
            const totalElement = card.querySelector('.player-total');
            const scoreInput = card.querySelector('.score-input');
            const decreaseBtn = card.querySelector('.decrease-btn');
            const increaseBtn = card.querySelector('.increase-btn');
            
            if (nameElement) nameElement.textContent = player.name;
            if (colorElement) colorElement.style.backgroundColor = player.color;
            
            const currentHoleScore = currentScores[player.id]?.[currentGame.current_hole] || 1;
            if (scoreInput) scoreInput.value = currentHoleScore;
            
            const totalScore = Object.values(currentScores[player.id] || {}).reduce((sum, score) => sum + score, 0);
            if (totalElement) totalElement.textContent = `Total: ${totalScore}`;
            
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', () => {
                    const current = parseInt(scoreInput.value) || 1;
                    if (current > 1) {
                        scoreInput.value = current - 1;
                        updatePlayerScore(player.id, current - 1);
                    }
                });
            }
            
            if (increaseBtn) {
                increaseBtn.addEventListener('click', () => {
                    const current = parseInt(scoreInput.value) || 1;
                    if (current < 10) {
                        scoreInput.value = current + 1;
                        updatePlayerScore(player.id, current + 1);
                    }
                });
            }
            
            if (scoreInput) {
                scoreInput.addEventListener('input', () => {
                    const score = parseInt(scoreInput.value) || 1;
                    if (score >= 1 && score <= 10) {
                        updatePlayerScore(player.id, score);
                    }
                });
            }
            
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Display player scores error:', error);
    }
};

const updatePlayerScore = async (playerId, score) => {
    try {
        if (!currentScores[playerId]) {
            currentScores[playerId] = {};
        }
        
        currentScores[playerId][currentGame.current_hole] = score;
        
        const playerCard = Array.from(document.querySelectorAll('.player-score-card')).find(card => {
            const playerName = card.querySelector('.player-name')?.textContent;
            return currentPlayers.find(p => p.id === playerId)?.name === playerName;
        });
        
        if (playerCard) {
            const totalScore = Object.values(currentScores[playerId] || {}).reduce((sum, score) => sum + score, 0);
            const totalElement = playerCard.querySelector('.player-total');
            if (totalElement) totalElement.textContent = `Total: ${totalScore}`;
        }
        
        updateLeaderboard();
        
        try {
            await saveScoresToDatabase({ [playerId]: currentScores[playerId] });
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    } catch (error) {
        console.error('Update player score error:', error);
    }
};

const updateGameNavigation = () => {
    try {
        const prevBtn = document.getElementById('prev-hole-btn');
        const nextBtn = document.getElementById('next-hole-btn');
        const finishBtn = document.getElementById('finish-game-btn');
        
        if (prevBtn) prevBtn.disabled = currentGame.current_hole === 1;
        
        if (currentGame.current_hole === currentGame.total_holes) {
            if (nextBtn) nextBtn.classList.add('hidden');
            if (finishBtn) finishBtn.classList.remove('hidden');
        } else {
            if (nextBtn) nextBtn.classList.remove('hidden');
            if (finishBtn) finishBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error('Update game navigation error:', error);
    }
};

const updateLeaderboard = () => {
    try {
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard || !currentPlayers) return;
        
        const playersWithTotals = currentPlayers.map(player => ({
            ...player,
            totalScore: Object.values(currentScores[player.id] || {}).reduce((sum, score) => sum + score, 0)
        }));
        
        playersWithTotals.sort((a, b) => a.totalScore - b.totalScore);
        
        leaderboard.innerHTML = '';
        
        playersWithTotals.forEach((player, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            item.innerHTML = `
                <div class="leaderboard-player">
                    <span class="leaderboard-position">${index + 1}</span>
                    <div class="player-color-indicator" style="background-color: ${player.color}"></div>
                    <span>${player.name}</span>
                </div>
                <span class="leaderboard-score">${player.totalScore}</span>
            `;
            
            leaderboard.appendChild(item);
        });
    } catch (error) {
        console.error('Update leaderboard error:', error);
    }
};

const navigateHole = async (direction) => {
    try {
        const newHole = currentGame.current_hole + direction;
        
        if (newHole < 1 || newHole > currentGame.total_holes) {
            return;
        }
        
        currentGame.current_hole = newHole;
        
        await updateGameInDatabase(currentGame.id, { current_hole: newHole });
        
        updateGameHeader();
        displayPlayerScores();
        updateGameNavigation();
    } catch (error) {
        console.error('Navigate hole error:', error);
    }
};

const finishGame = async () => {
    if (!confirm('Are you sure you want to finish this game? You can still view the results later.')) {
        return;
    }
    
    try {
        showLoading();
        
        currentGame.status = 'completed';
        await updateGameInDatabase(currentGame.id, { status: 'completed' });
        
        showGameResults();
    } catch (error) {
        console.error('Finish game error:', error);
        showError('Failed to finish game');
    } finally {
        hideLoading();
    }
};

const showGameResults = () => {
    try {
        alert('Game completed! Check the final leaderboard below.');
        setTimeout(() => {
            showDashboard();
        }, 2000);
    } catch (error) {
        console.error('Show game results error:', error);
        showDashboard();
    }
};

// =============================================================================
// EVENT LISTENERS & INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Mini Golf Score Tracker - Initializing...');
        
        // Immediately hide loading overlay
        hideLoading();
        
        // Set initialization flag
        isInitialized = true;
        
        // Authentication events
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                try {
                    const emailInput = document.getElementById('email');
                    const email = emailInput?.value?.trim();
                    
                    if (!email) {
                        showError('Please enter your email address');
                        return;
                    }
                    
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        showError('Please enter a valid email address');
                        return;
                    }
                    
                    hideError();
                    showLoading();
                    
                    await sendMagicLink(email);
                } catch (error) {
                    showError(error.message || 'Failed to send magic link');
                } finally {
                    hideLoading();
                }
            });
        }
        
        const verifyBtn = document.getElementById('verify-otp-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', async () => {
                try {
                    const emailInput = document.getElementById('email');
                    const otpInput = document.getElementById('otp');
                    const email = emailInput?.value?.trim();
                    const otp = otpInput?.value?.trim();
                    
                    if (!email || !otp) {
                        showError('Please enter both email and verification code');
                        return;
                    }
                    
                    hideError();
                    showLoading();
                    
                    await verifyOTP(email, otp);
                } catch (error) {
                    showError(error.message || 'Invalid verification code');
                } finally {
                    hideLoading();
                }
            });
        }
        
        // Dashboard events
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', showGameSetup);
        }
        
        // Setup events
        const backToDashboard = document.getElementById('back-to-dashboard');
        if (backToDashboard) {
            backToDashboard.addEventListener('click', showDashboard);
        }
        
        const addPlayerBtn = document.getElementById('add-player-btn');
        if (addPlayerBtn) {
            addPlayerBtn.addEventListener('click', addPlayer);
        }
        
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', startGame);
        }
        
        // Game events
        const backToSetup = document.getElementById('back-to-setup');
        if (backToSetup) {
            backToSetup.addEventListener('click', () => {
                if (confirm('Are you sure you want to go back? Game progress will be saved.')) {
                    showGameSetup();
                }
            });
        }
        
        const prevHoleBtn = document.getElementById('prev-hole-btn');
        if (prevHoleBtn) {
            prevHoleBtn.addEventListener('click', () => navigateHole(-1));
        }
        
        const nextHoleBtn = document.getElementById('next-hole-btn');
        if (nextHoleBtn) {
            nextHoleBtn.addEventListener('click', () => navigateHole(1));
        }
        
        const finishGameBtn = document.getElementById('finish-game-btn');
        if (finishGameBtn) {
            finishGameBtn.addEventListener('click', finishGame);
        }
        
        // Initialize auth after DOM is ready
        setTimeout(() => {
            initializeAuth().catch(error => {
                console.error('Initialization failed:', error);
            }).finally(() => {
                hideLoading();
            });
        }, 100);
        
        // Listen for auth changes if Supabase is available
        if (supabase) {
            supabase.auth.onAuthStateChange((event, session) => {
                try {
                    if (event === 'SIGNED_IN' && session?.user) {
                        currentUser = session.user;
                        ensureUserProfile().then(() => {
                            showDashboard();
                        });
                    } else if (event === 'SIGNED_OUT') {
                        logout();
                    }
                } catch (error) {
                    console.error('Auth state change error:', error);
                }
            });
        }
        
        console.log('Mini Golf Score Tracker - Ready!');
    } catch (error) {
        console.error('Initialization error:', error);
        hideLoading();
    }
});
