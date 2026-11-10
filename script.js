document.addEventListener('DOMContentLoaded', () => {
  const connectBtn = document.getElementById('connectBtn');
  const mirrorBtn = document.getElementById('mirrorBtn');
  const screen = document.getElementById('screen');
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');
  const actionButtons = document.querySelectorAll('[data-action]');

  let isConnected = false;

  function setConnectedState(nextState) {
    isConnected = nextState;
    statusDot.classList.toggle('live', nextState);
    statusText.textContent = nextState ? 'Live' : 'Ready';
    mirrorBtn.textContent = nextState ? 'Stop mirroring' : 'Start mirroring';
    screen.style.filter = nextState ? 'saturate(1.15)' : 'grayscale(0.25) brightness(0.78)';
    screen.style.transform = nextState ? 'scale(1)' : 'scale(0.99)';
    screen.style.transition = 'transform 0.25s ease, filter 0.25s ease';
  }

  function flashScreen() {
    if (!screen) return;
    screen.animate(
      [
        { boxShadow: 'inset 0 0 0 rgba(125,225,217,0)' },
        { boxShadow: 'inset 0 0 18px rgba(125,225,217,0.22)' },
        { boxShadow: 'inset 0 0 0 rgba(125,225,217,0)' }
      ],
      { duration: 520, easing: 'ease-out' }
    );
  }

  connectBtn?.addEventListener('click', () => {
    setConnectedState(!isConnected);
    flashScreen();
  });

  mirrorBtn?.addEventListener('click', () => {
    setConnectedState(!isConnected);
    flashScreen();
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;

      if (action === 'screenshot') {
        button.textContent = 'Saved';
        setTimeout(() => (button.textContent = 'Screenshot'), 900);
      }

      if (action === 'record') {
        const isRecording = button.classList.toggle('is-recording');
        button.textContent = isRecording ? 'Stop' : 'Record';
        button.style.color = isRecording ? '#0b0f10' : '#ebf5f7';
        button.style.background = isRecording
          ? 'linear-gradient(135deg, #ff6b6b, #fbbf24)'
          : 'rgba(255,255,255,0.04)';
      }

      if (action === 'rotate') {
        const current = screen.style.transform || '';
        screen.style.transform = current.includes('rotate')
          ? current.replace(/rotate\([^\)]*\)/g, '')
          : `${current} rotate(90deg)`;
      }

      flashScreen();
    });
  });

  setConnectedState(true);
});

