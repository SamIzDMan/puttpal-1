// ========================================
// SUPABASE CONFIGURATION
// ========================================
const SUPABASE_URL = 'https://ghzbabpscirvyzlhujeh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoemJhYnBzY2lydnl6bGh1amVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjgzMTYsImV4cCI6MjA3MzY0NDMxNn0.dFXWzHY-5BbypW5pNbHPPX0uPpyCX9836vbJYknghT4';

// Initialize Supabase client
let supabase = null;
let isSupabaseConfigured = false;

if (
  SUPABASE_URL.includes('YOUR-PROJECT-ID') ||
  SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
) {
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

// ===== APP MAIN CLASS =====
document.addEventListener('DOMContentLoaded', function() {
  class MiniGolfPro {
    constructor() {
      this.savedGames = [];
      this.currentUser = null;
      this.isOnline = navigator.onLine;
      this.initialize();
    }

    initialize() {
      this.setupOnlineDetection();
      this.setupEventListeners();
      this.checkUserSession();
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
        setTimeout(() => {
          const modal = document.getElementById('config-notice');
          if (modal) modal.classList.remove('hidden');
        }, 2000);
      }
    }

    // ===== EMAIL-ONLY AUTH =====
    async sendEmailLink(email) {
      if (!isSupabaseConfigured) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true };
      }
      try {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) {
          console.error('Email link send error', error);
          return { success: false, message: error.message };
        }
        return { success: true };
      } catch (error) {
        console.error('Email link send error', error);
        return { success: false, message: 'Failed to send email link.' };
      }
    }

    async checkUserSession() {
      if (!isSupabaseConfigured) {
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
            email: session.user.email || 'Unknown',
            createdAt: session.user.created_at,
            initials: this.generateInitials(session.user.email)
          };
          this.showDashboard();
        } else {
          this.showLoginScreen();
        }
        // Supabase auth state change
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            this.currentUser = {
              id: session.user.id,
              email: session.user.email || 'Unknown',
              createdAt: session.user.created_at,
              initials: this.generateInitials(session.user.email)
            };
            this.showDashboard();
          } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.showLoginScreen();
          }
        });
      } catch (error) {
        console.error('Session check error:', error);
        this.showLoginScreen();
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
      // Clear email input and message
      const emailInput = document.getElementById('email-input');
      if (emailInput) {
        emailInput.value = '';
        setTimeout(() => emailInput.focus(), 100);
      }
      const msgDiv = document.getElementById('auth-message');
      if (msgDiv) msgDiv.textContent = '';
    }

    showDashboard() {
      this.switchScreen('dashboard-screen');
      // Add your own dashboard logic here
    }

    // ===== EVENT HANDLING =====
    setupEventListeners() {
      // Email auth form
      const form = document.getElementById('email-auth-form');
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const emailInput = document.getElementById('email-input');
          const msgDiv = document.getElementById('auth-message');
          const email = emailInput.value.trim();
          msgDiv.textContent = 'Sending login link...';
          const result = await this.sendEmailLink(email);
          if (result.success) {
            msgDiv.textContent = '✅ Check your email for a magic login link to sign in.';
          } else {
            msgDiv.textContent = `❌ ${result.message || 'Failed to send email link.'}`;
          }
        });
      }
    }

    // ===== UTILS & TOAST =====
    showToast(text, type='info') {
      // Add your project-wide toast message logic here if needed
      console.log(type, text);
    }

    syncOfflineData() {
      // Add your offline sync logic here if needed
    }

    generateInitials(identifier) {
      if (!identifier) return 'U';
      const match = identifier.match(/[a-zA-Z]/g);
      return match ? match.slice(0, 2).join('').toUpperCase() : 'U';
    }
  }

  // Instantiate app
  window.miniGolfPro = new MiniGolfPro();
});
