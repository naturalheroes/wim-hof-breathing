const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const breathStatusEl = document.getElementById('breathStatus');
const roundCountEl = document.getElementById('roundCount');
const breathCountEl = document.getElementById('breathCount');
const timerEl = document.getElementById('timer');
const instructionsEl = document.getElementById('instructions').querySelector('p');

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

const ROUNDS = 3;
const BREATHS_PER_ROUND = 30;
const INITIAL_HOLD_TIME = 60; // seconds, can increase per round if desired
const BREATHE_IN_TIME = 1500; // milliseconds
const BREATHE_OUT_TIME = 1500; // milliseconds

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

startBtn.addEventListener('click', startExercise);
pauseBtn.addEventListener('click', pauseExercise);
resetBtn.addEventListener('click', resetExercise);

// Initial UI setup
updateUI(); 