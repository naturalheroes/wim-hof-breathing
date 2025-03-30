const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsPanel = document.getElementById('settings-panel');
const resetButtons = document.querySelectorAll('.reset-btn');

const breathStatusEl = document.getElementById('breathStatus');
const roundCountEl = document.getElementById('roundCount');
const breathCountEl = document.getElementById('breathCount');
const timerEl = document.getElementById('timer');
const instructionsEl = document.getElementById('instructions').querySelector('p');
const totalRoundsEl = document.getElementById('totalRounds');
const totalBreathsEl = document.getElementById('totalBreaths');

// Settings inputs
const roundsInput = document.getElementById('roundsInput');
const breathsInput = document.getElementById('breathsInput');
const holdTimeInput = document.getElementById('holdTimeInput');
const breathPaceInput = document.getElementById('breathPaceInput');
const breathVolumeInput = document.getElementById('breathVolumeInput');
const musicVolumeInput = document.getElementById('musicVolumeInput');
const breathVolumeValueEl = document.getElementById('breathVolumeValue');
const musicVolumeValueEl = document.getElementById('musicVolumeValue');

// Audio elements
const inhaleAudio = document.getElementById('inhaleAudio');
const exhaleAudio = document.getElementById('exhaleAudio');
const holdAudio = document.getElementById('holdAudio');
const musicAudio = document.getElementById('musicAudio');

let timerInterval = null;
let state = 'idle'; // idle, breathing, holding, paused
let currentRound = 0;
let currentBreath = 0;
let holdTime = 0;
let elapsedTime = 0;

// Default settings
const DEFAULT_SETTINGS = {
    rounds: 3,
    breathsPerRound: 30,
    holdTime: 60,
    breathPace: 1.5,
    breathVolume: 0.7,
    musicVolume: 0.5
};

let ROUNDS = DEFAULT_SETTINGS.rounds;
let BREATHS_PER_ROUND = DEFAULT_SETTINGS.breathsPerRound;
let INITIAL_HOLD_TIME = DEFAULT_SETTINGS.holdTime; // seconds
let BREATH_PACE = DEFAULT_SETTINGS.breathPace; // seconds per breath (both inhale and exhale)
let BREATHE_IN_TIME = BREATH_PACE * 1000; // milliseconds
let BREATHE_OUT_TIME = BREATH_PACE * 1000; // milliseconds

// Reset input to default value
function resetToDefault(inputId, defaultValue) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.value = defaultValue;
    
    // Handle special cases
    if (inputId === 'breathVolumeInput') {
        updateBreathVolume(defaultValue);
    } else if (inputId === 'musicVolumeInput') {
        updateMusicVolume(defaultValue);
    } else if (inputId === 'breathPaceInput') {
        updateBreathPace(defaultValue);
    }
}

// Load settings from localStorage if available
function loadSettings() {
    if (localStorage.getItem('wimHofSettings')) {
        const settings = JSON.parse(localStorage.getItem('wimHofSettings'));
        ROUNDS = settings.rounds;
        BREATHS_PER_ROUND = settings.breathsPerRound;
        INITIAL_HOLD_TIME = settings.holdTime;
        
        // Update input values
        roundsInput.value = ROUNDS;
        breathsInput.value = BREATHS_PER_ROUND;
        holdTimeInput.value = INITIAL_HOLD_TIME;
        
        // Load breathing pace if available
        if (settings.breathPace !== undefined) {
            BREATH_PACE = settings.breathPace;
            breathPaceInput.value = BREATH_PACE;
            updateBreathPace(BREATH_PACE);
        }
        
        // Update volume settings
        if (settings.breathVolume !== undefined) {
            breathVolumeInput.value = settings.breathVolume;
            updateBreathVolume(settings.breathVolume);
        }
        
        if (settings.musicVolume !== undefined) {
            musicVolumeInput.value = settings.musicVolume;
            updateMusicVolume(settings.musicVolume);
        }
    }
    
    // Update display
    totalRoundsEl.textContent = ROUNDS;
    totalBreathsEl.textContent = BREATHS_PER_ROUND;
}

// Save settings to localStorage
function saveSettings() {
    const breathPace = parseFloat(breathPaceInput.value);
    updateBreathPace(breathPace);
    
    const settings = {
        rounds: parseInt(roundsInput.value),
        breathsPerRound: parseInt(breathsInput.value),
        holdTime: parseInt(holdTimeInput.value),
        breathPace: breathPace,
        breathVolume: parseFloat(breathVolumeInput.value),
        musicVolume: parseFloat(musicVolumeInput.value)
    };
    
    localStorage.setItem('wimHofSettings', JSON.stringify(settings));
    
    // Update variables
    ROUNDS = settings.rounds;
    BREATHS_PER_ROUND = settings.breathsPerRound;
    INITIAL_HOLD_TIME = settings.holdTime;
    
    // Update display
    totalRoundsEl.textContent = ROUNDS;
    totalBreathsEl.textContent = BREATHS_PER_ROUND;
    
    // Hide settings panel
    settingsPanel.style.display = 'none';
}

function updateBreathPace(value) {
    BREATH_PACE = value;
    BREATHE_IN_TIME = value * 1000;
    BREATHE_OUT_TIME = value * 1000;
}

function updateBreathVolume(value) {
    inhaleAudio.volume = value;
    exhaleAudio.volume = value;
    holdAudio.volume = value;
    breathVolumeValueEl.textContent = `${Math.round(value * 100)}%`;
}

function updateMusicVolume(value) {
    musicAudio.volume = value;
    musicVolumeValueEl.textContent = `${Math.round(value * 100)}%`;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

function updateUI() {
    breathStatusEl.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    roundCountEl.textContent = currentRound;
    breathCountEl.textContent = state === 'breathing' ? currentBreath : '-';
    timerEl.textContent = formatTime(elapsedTime);

    startBtn.disabled = state !== 'idle' && state !== 'paused';
    pauseBtn.disabled = state === 'idle' || state === 'paused';
    resetBtn.disabled = state === 'idle';
    settingsBtn.disabled = state !== 'idle';
}

function playSound(audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(e => console.error("Error playing sound:", e));
}

function stopSound(audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
}

function stopAllSounds() {
    stopSound(inhaleAudio);
    stopSound(exhaleAudio);
    stopSound(holdAudio);
    // Don't stop music here, handle separately
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        elapsedTime++;
        if (state === 'holding') {
            timerEl.textContent = formatTime(elapsedTime);
            if (elapsedTime >= holdTime) {
                transitionToRecoveryBreath();
            }
        } else if (state === 'breathing') {
            // Timer just runs in the background during breathing
             timerEl.textContent = formatTime(elapsedTime);
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    elapsedTime = 0;
    timerEl.textContent = formatTime(elapsedTime);
}

async function breatheCycle() {
    if (state !== 'breathing' || currentBreath >= BREATHS_PER_ROUND) {
        if (currentBreath >= BREATHS_PER_ROUND) {
            transitionToHold();
        }
        return;
    }

    currentBreath++;
    updateUI();
    instructionsEl.textContent = `Breathe In... (${currentBreath}/${BREATHS_PER_ROUND})`;
    playSound(inhaleAudio);

    await new Promise(resolve => setTimeout(resolve, BREATHE_IN_TIME));
    stopSound(inhaleAudio);

    if (state !== 'breathing') return; // Check if paused/reset during inhale

    instructionsEl.textContent = `Breathe Out... (${currentBreath}/${BREATHS_PER_ROUND})`;
    playSound(exhaleAudio);

    await new Promise(resolve => setTimeout(resolve, BREATHE_OUT_TIME));
    stopSound(exhaleAudio);

    if (state !== 'breathing') return; // Check if paused/reset during exhale

    // Loop
    breatheCycle();
}

function transitionToBreathing() {
    state = 'breathing';
    currentRound++;
    currentBreath = 0;
    elapsedTime = 0; // Reset timer for breathing phase if needed, or let it continue
    resetTimer(); // Reset timer for each round's breathing phase
    updateUI();
    instructionsEl.textContent = 'Starting breathing round...';
    stopAllSounds();
    musicAudio.play().catch(e => console.error("Error playing music:", e));
    // Short delay before first breath
    setTimeout(() => {
        if (state === 'breathing') {
             startTimer(); // Start timer for breathing phase
            breatheCycle();
        }
    }, 1000);
}

function transitionToHold() {
    state = 'holding';
    holdTime = INITIAL_HOLD_TIME; // Or calculate based on round
    elapsedTime = 0; // Reset timer for hold phase
    updateUI();
    resetTimer();
    startTimer();
    instructionsEl.textContent = `Hold your breath after exhaling. Target: ${formatTime(holdTime)}`;
    stopAllSounds();
    playSound(holdAudio); // Optional: sound cue for holding
}

function transitionToRecoveryBreath() {
    state = 'recovery';
    stopSound(holdAudio);
    pauseTimer(); // Pause timer during recovery
    updateUI();
    instructionsEl.textContent = 'Recovery: Take a deep breath in and hold for 15 seconds...';
    playSound(inhaleAudio);

    setTimeout(() => {
        stopSound(inhaleAudio);
        instructionsEl.textContent = 'Recovery hold complete. Exhale.';
        playSound(exhaleAudio);
        setTimeout(() => {
            stopSound(exhaleAudio);
            if (currentRound < ROUNDS) {
                transitionToBreathing();
            } else {
                finishExercise();
            }
        }, BREATHE_OUT_TIME); // Exhale time for recovery
    }, 15000); // 15 second recovery hold
}

function finishExercise() {
    state = 'finished';
    resetTimer();
    stopAllSounds();
    musicAudio.pause();
    musicAudio.currentTime = 0;
    instructionsEl.textContent = 'Exercise complete! Well done.';
    updateUI();
     // Re-enable start button, disable pause/reset
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    settingsBtn.disabled = false;
    // Reset counters for next run
    currentRound = 0;
    currentBreath = 0;
    elapsedTime = 0;
    // Update UI one last time to show reset state
     setTimeout(() => {
         state = 'idle';
         updateUI();
         timerEl.textContent = formatTime(0);
         roundCountEl.textContent = 0;
         breathCountEl.textContent = 0;
         instructionsEl.textContent = 'Press Start to begin the exercise.';
     }, 2000); // Show finished message for 2 seconds

}

function startExercise() {
    if (state === 'idle' || state === 'paused') {
        const previouslyPaused = state === 'paused';
        state = previouslyPaused ? breathStatusEl.textContent.toLowerCase() : 'breathing'; // Resume or start anew

        if (!previouslyPaused) {
            currentRound = 0;
            currentBreath = 0;
            elapsedTime = 0;
            resetTimer();
            transitionToBreathing();
        } else {
             // Resume logic
             state = breathStatusEl.textContent.toLowerCase(); // Get the state before pause
             updateUI();
             musicAudio.play().catch(e => console.error("Error playing music:", e));
             startTimer();
             if (state === 'breathing') {
                 breatheCycle(); // Resume breathing cycle
             } else if (state === 'holding') {
                 playSound(holdAudio);
                 // Timer already running via startTimer()
             } else if (state === 'recovery') {
                 // Complex to resume accurately, might restart recovery phase or transition
                 console.warn('Resuming from recovery is complex, may restart phase.');
                 // For simplicity, let's restart the recovery breath logic if needed
                 // This part might need refinement based on desired resume behavior
                  transitionToRecoveryBreath(); // Re-trigger recovery
             }
        }
    }
}

function pauseExercise() {
    if (state !== 'idle' && state !== 'paused') {
        const stateBeforePause = state;
        state = 'paused';
        pauseTimer();
        stopAllSounds();
        musicAudio.pause();
        updateUI();
        instructionsEl.textContent = 'Exercise paused. Press Start to resume.';
        // Store the state before pause so resume knows where to pick up
        breathStatusEl.textContent = stateBeforePause.charAt(0).toUpperCase() + stateBeforePause.slice(1);
    }
}

function resetExercise() {
    state = 'idle';
    resetTimer();
    stopAllSounds();
    musicAudio.pause();
    musicAudio.currentTime = 0;
    currentRound = 0;
    currentBreath = 0;
    holdTime = 0;
    elapsedTime = 0;
    updateUI();
    instructionsEl.textContent = 'Press Start to begin the exercise.';
}

function toggleSettings() {
    settingsPanel.style.display = settingsPanel.style.display === 'none' || settingsPanel.style.display === '' ? 'block' : 'none';
}

// Event listeners
startBtn.addEventListener('click', startExercise);
pauseBtn.addEventListener('click', pauseExercise);
resetBtn.addEventListener('click', resetExercise);
settingsBtn.addEventListener('click', toggleSettings);
saveSettingsBtn.addEventListener('click', saveSettings);

// Volume control event listeners
breathVolumeInput.addEventListener('input', (e) => updateBreathVolume(e.target.value));
musicVolumeInput.addEventListener('input', (e) => updateMusicVolume(e.target.value));

// Register reset button click handlers
resetButtons.forEach(button => {
    button.addEventListener('click', function() {
        const targetInput = this.getAttribute('data-target');
        const defaultValue = this.getAttribute('data-default');
        resetToDefault(targetInput, defaultValue);
    });
});

// Update breath volume display on input change
breathVolumeInput.addEventListener('input', (e) => {
    breathVolumeValueEl.textContent = `${Math.round(e.target.value * 100)}%`;
});

// Update music volume display on input change
musicVolumeInput.addEventListener('input', (e) => {
    musicVolumeValueEl.textContent = `${Math.round(e.target.value * 100)}%`;
});

// Initial setup
loadSettings();
updateBreathVolume(breathVolumeInput.value);
updateMusicVolume(musicVolumeInput.value);
updateUI(); 