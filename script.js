    console.log("JavaScript Connected.");
    console.log("loading Scripts...");
    (() => {
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      const startBtn = document.getElementById('startBtn');
      const pauseBtn = document.getElementById('pauseBtn');
      const restartBtn = document.getElementById('restartBtn');
      const autoBtn = document.getElementById('autoBtn');
      const speedInput = document.getElementById('speed');
      const gridInput = document.getElementById('grid');
      const obstacleMode = document.getElementById('obstacleMode');
      const powerupsSel = document.getElementById('powerups');
      const skinSel = document.getElementById('skin');
      const wrapSel = document.getElementById('wrap');
      const toggleThemeBtn = document.getElementById('toggleThemeBtn');
      const fullscreenBtn = document.getElementById('fullscreenBtn');
      const statusChip = document.getElementById('statusChip');

      const scoreEl = document.getElementById('score');
      const highEl = document.getElementById('high');
      const speedDisplay = document.getElementById('speedDisplay');
      const lengthEl = document.getElementById('length');
      const lastScore = document.getElementById('lastScore');
      const longest = document.getElementById('longest');
      const played = document.getElementById('played');
      const obCount = document.getElementById('obCount');
      const pwrCount = document.getElementById('pwrCount');

      const upTouch = document.getElementById('upTouch');
      const downTouch = document.getElementById('downTouch');
      const leftTouch = document.getElementById('leftTouch');
      const rightTouch = document.getElementById('rightTouch');

      // Game variables
      let W = canvas.width;
      let H = canvas.height;
      let grid = parseInt(gridInput.value);
      let cellSize = W / grid;

      let snake = [];
      let dir = {x:1,y:0};
      let nextDir = {x:1,y:0};
      let food = null;
      let obstacles = [];
      let powerups = [];
      let speed = parseInt(speedInput.value);
      let lengthTarget = 1;
      let score = 0;
      let highScore = 0;
      let gameInterval = null;
      let paused = false;
      let playing = false;
      let gameOver = false;
      let wrap = true;
      let autoPlay = false;

      // stats
      let gamesPlayed = 0;
      let longestLength = 1;

      // skins
      const skins = {
        neon: {
          bg: ['#020916','#041432'],
          snakeHead: '#00FFD1',
          snakeBody: '#00CBA0',
          food: '#FF0033',
          obstacle: '#FF00CC',
          powerup: '#00FFFF',
        },
        pixel: {
          bg: ['#222','#444'],
          snakeHead: '#76b900',
          snakeBody: '#a0d300',
          food: '#e8aa0a',
          obstacle: '#d34b1f',
          powerup: '#f0e68c',
        },
        classic: {
          bg: ['#061424','#072238'],
          snakeHead: '#3bd458',
          snakeBody: '#1e832c',
          food: '#d62929',
          obstacle: '#853535',
          powerup: '#70b570',
        }
      };

      let currentSkin = skins[skinSel.value];

      // Load saved theme from localStorage
      let darkMode = localStorage.getItem('tndSnakeDarkMode') !== 'false';
      
      function updateTheme(){
        if(darkMode) {
          document.body.classList.remove('light');
          toggleThemeBtn.textContent = '🌙';
          toggleThemeBtn.title = 'Switch to Light Mode';
        } else {
          document.body.classList.add('light');
          toggleThemeBtn.textContent = '☀️';
          toggleThemeBtn.title = 'Switch to Dark Mode';
        }
        localStorage.setItem('tndSnakeDarkMode', darkMode);
      }
      
      toggleThemeBtn.onclick = ()=>{
        darkMode = !darkMode;
        updateTheme();
        draw();
      };
      updateTheme();

      // fullscreen toggle
      fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          canvas.requestFullscreen().catch(() => {
            statusChip.textContent = "Fullscreen not supported";
            setTimeout(() => { 
              statusChip.textContent = gameOver ? "Game Over!" : (playing ? (paused ? "Paused" : "Playing") : "Ready"); 
            }, 2000);
          });
        } else {
          document.exitFullscreen();
        }
      };

      // prevent arrow & WASD keys from scrolling page when canvas focused
      window.addEventListener('keydown', (e) => {
        const keysToPrevent = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'];
        if(keysToPrevent.includes(e.key)){
          if(document.activeElement === canvas || document.body.classList.contains('playing')){
            e.preventDefault();
          }
        }
        // ESC: pause or exit fullscreen
        if(e.key === 'Escape'){
          if(document.fullscreenElement){
            document.exitFullscreen();
          } else if(playing && !gameOver){
            togglePause();
          }
        }
        // P pause toggle
        if(e.key.toLowerCase() === 'p'){
          if(playing && !gameOver) togglePause();
        }
      }, {passive:false});

      // handle focus for canvas to keep keys working
      canvas.setAttribute('tabindex','0');

      // Resize canvas & recalc sizes
      function resizeCanvas() {
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth - 36; // account for padding
        const size = Math.min(640, containerWidth);
        canvas.width = size;
        canvas.height = size;
        W = canvas.width;
        H = canvas.height;
        cellSize = W / grid;
      }
      
      window.addEventListener('resize', () => {
        resizeCanvas();
        draw();
      });
      resizeCanvas();

      // Game functions
      function resetGame(){
        snake = [{x:Math.floor(grid/2), y:Math.floor(grid/2)}];
        dir = {x:1,y:0};
        nextDir = {x:1,y:0};
        lengthTarget = 1;
        score = 0;
        food = null;
        obstacles = generateObstacles(obstacleMode.value);
        powerups = [];
        playing = false;
        paused = false;
        gameOver = false;
        updateStats();
        draw();
        statusChip.textContent = 'Ready';
      }

      function generateObstacles(mode){
        let obs = [];
        if(mode === 'random'){
          for(let i=0;i<Math.floor(grid*grid*0.06);i++){
            let x, y, ok;
            do{
              x = Math.floor(Math.random()*grid);
              y = Math.floor(Math.random()*grid);
              ok = 
                !snake.some(s=>s.x===x && s.y===y) &&
                !(food && food.x===x && food.y===y) &&
                !powerups.some(p=>p.x===x && p.y===y) &&
                !obs.some(o=>o.x===x && o.y===y);
            }while(!ok);
            obs.push({x,y});
          }
        } else if(mode === 'maze'){
          for(let i=1;i<grid-1;i+=2){
            for(let j=1;j<grid-1;j+=2){
              obs.push({x:i,y:j});
            }
          }
        }
        obCount.textContent = obs.length;
        return obs;
      }

      function placeFood(){
        let attempts=0;
        do{
          food = {x:Math.floor(Math.random()*grid), y:Math.floor(Math.random()*grid)};
          attempts++;
          if(attempts>500) break;
        }while(
          snake.some(s=>s.x===food.x && s.y===food.y) ||
          obstacles.some(o=>o.x===food.x && o.y===food.y) ||
          powerups.some(p=>p.x===food.x && p.y===food.y)
        );
      }

      function placePowerup(){
        if(powerupsSel.value === 'off') return;
        if(powerups.length>3) return;
        let attempts=0;
        let pwr;
        do{
          pwr = {x:Math.floor(Math.random()*grid), y:Math.floor(Math.random()*grid)};
          attempts++;
          if(attempts>500) return;
        }while(
          snake.some(s=>s.x===pwr.x && s.y===pwr.y) ||
          obstacles.some(o=>o.x===pwr.x && o.y===pwr.y) ||
          powerups.some(p=>p.x===pwr.x && p.y===pwr.y) ||
          (food && food.x === pwr.x && food.y === pwr.y)
        );
        const types = ['speedup','slowdown','scoreMulti','shrink'];
        pwr.type = types[Math.floor(Math.random()*types.length)];
        powerups.push(pwr);
        pwrCount.textContent = powerups.length;
      }

      function draw(){
        let grad = ctx.createLinearGradient(0,0,0,H);
        grad.addColorStop(0, currentSkin.bg[0]);
        grad.addColorStop(1, currentSkin.bg[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,W,H);

        if(grid <= 25){
          ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 1;
          for(let x=0;x<=grid;x++){
            ctx.beginPath();
            ctx.moveTo(x*cellSize,0);
            ctx.lineTo(x*cellSize,H);
            ctx.stroke();
          }
          for(let y=0;y<=grid;y++){
            ctx.beginPath();
            ctx.moveTo(0,y*cellSize);
            ctx.lineTo(W,y*cellSize);
            ctx.stroke();
          }
        }

        ctx.fillStyle = currentSkin.obstacle;
        obstacles.forEach(o=>{
          ctx.fillRect(o.x*cellSize,o.y*cellSize,cellSize,cellSize);
        });

        powerups.forEach(p=>{
          ctx.fillStyle = currentSkin.powerup;
          ctx.beginPath();
          ctx.arc(p.x*cellSize+cellSize/2,p.y*cellSize+cellSize/2,cellSize/3,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle = darkMode ? '#000' : '#fff';
          ctx.font = `${cellSize/2}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let symbol = '?';
          switch(p.type){
            case 'speedup': symbol = '⚡'; break;
            case 'slowdown': symbol = '🢠'; break;
            case 'scoreMulti': symbol = '⭐'; break;
            case 'shrink': symbol = '✂️'; break;
          }
          ctx.fillText(symbol,p.x*cellSize+cellSize/2,p.y*cellSize+cellSize/2);
        });

        if(food){
          ctx.fillStyle = currentSkin.food;
          ctx.beginPath();
          ctx.arc(food.x*cellSize+cellSize/2,food.y*cellSize+cellSize/2,cellSize/2.5,0,Math.PI*2);
          ctx.fill();
        }

        snake.forEach((seg,i)=>{
          ctx.fillStyle = (i===snake.length-1) ? currentSkin.snakeHead : currentSkin.snakeBody;
          ctx.strokeStyle = darkMode ? '#0008' : '#fff4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.rect(seg.x*cellSize,seg.y*cellSize,cellSize,cellSize);
          ctx.fill();
          ctx.stroke();
        });
      }

      // Improved auto play function with collision avoidance
      function getSmartDirection() {
        if (!food) return dir;
        
        const head = snake[snake.length - 1];
        
        // Check if a position is safe
        function isSafe(x, y) {
          // Check bounds
          if (!wrap && (x < 0 || x >= grid || y < 0 || y >= grid)) return false;
          
          // Wrap coordinates
          let checkX = x;
          let checkY = y;
          if (wrap) {
            if (checkX < 0) checkX = grid - 1;
            else if (checkX >= grid) checkX = 0;
            if (checkY < 0) checkY = grid - 1;
            else if (checkY >= grid) checkY = 0;
          }
          
          // Check collisions with body
          if (snake.some(s => s.x === checkX && s.y === checkY)) return false;
          
          // Check collisions with obstacles
          if (obstacles.some(o => o.x === checkX && o.y === checkY)) return false;
          
          return true;
        }
        
        // Get all possible directions
        const directions = [
          {x: 0, y: -1}, // up
          {x: 0, y: 1},  // down
          {x: -1, y: 0}, // left
          {x: 1, y: 0}   // right
        ];
        
        // Filter out opposite direction and unsafe moves
        const safeDirs = directions.filter(d => {
          // Don't go opposite to current direction
          if (d.x === -dir.x && d.y === -dir.y) return false;
          
          // Check if this direction is safe
          const newX = head.x + d.x;
          const newY = head.y + d.y;
          return isSafe(newX, newY);
        });
        
        if (safeDirs.length === 0) {
          // If no safe direction, try to keep current direction if possible
          const currentNewX = head.x + dir.x;
          const currentNewY = head.y + dir.y;
          if (isSafe(currentNewX, currentNewY)) {
            return dir;
          }
          // Otherwise return any direction (will likely end game)
          return dir;
        }
        
        // Choose the best direction towards food
        const dx = food.x - head.x;
        const dy = food.y - head.y;
        
        // Handle wrapping for distance calculation
        let adjustedDx = dx;
        let adjustedDy = dy;
        
        if (wrap) {
          if (Math.abs(dx) > grid / 2) {
            adjustedDx = dx > 0 ? dx - grid : dx + grid;
          }
          if (Math.abs(dy) > grid / 2) {
            adjustedDy = dy > 0 ? dy - grid : dy + grid;
          }
        }
        
        // Sort directions by how close they get us to food
        safeDirs.sort((a, b) => {
          const distA = Math.abs(adjustedDx - a.x) + Math.abs(adjustedDy - a.y);
          const distB = Math.abs(adjustedDx - b.x) + Math.abs(adjustedDy - b.y);
          return distA - distB;
        });
        
        return safeDirs[0];
      }

      function update(){
        if(paused || !playing || gameOver) return;

        // Auto control with improved logic
        if (autoPlay) {
          nextDir = getSmartDirection();
        }

        dir = nextDir;
        let head = snake[snake.length-1];
        let newHead = {x: head.x + dir.x, y: head.y + dir.y};

        if(wrap){
          if(newHead.x < 0) newHead.x = grid-1;
          else if(newHead.x >= grid) newHead.x = 0;
          if(newHead.y < 0) newHead.y = grid-1;
          else if(newHead.y >= grid) newHead.y = 0;
        } else {
          if(newHead.x < 0 || newHead.x >= grid || newHead.y < 0 || newHead.y >= grid) {
            endGame('Hit wall');
            return;
          }
        }

        if(snake.some(s=>s.x===newHead.x && s.y===newHead.y)){
          endGame('Hit body');
          return;
        }
        if(obstacles.some(o=>o.x===newHead.x && o.y===newHead.y)){
          endGame('Hit obstacle');
          return;
        }

        snake.push(newHead);

        if(food && newHead.x === food.x && newHead.y === food.y){
          lengthTarget += 1;
          score += 10;
          if(score > highScore) highScore = score;
          placeFood();
          if(Math.random() < 0.3) placePowerup(); // 30% chance for powerup
        }

        for(let i=0;i<powerups.length;i++){
          let p = powerups[i];
          if(newHead.x === p.x && newHead.y === p.y){
            activatePowerup(p.type);
            powerups.splice(i,1);
            pwrCount.textContent = powerups.length;
            break;
          }
        }

        while(snake.length > lengthTarget){
          snake.shift();
        }

        scoreEl.textContent = score;
        highEl.textContent = highScore;
        lengthEl.textContent = snake.length;

        if(snake.length > longestLength) {
          longestLength = snake.length;
          longest.textContent = longestLength;
        }
        played.textContent = gamesPlayed;

        draw();
      }

      function activatePowerup(type){
        switch(type){
          case 'speedup':
            speed = Math.min(speed + 4, 25);
            speedInput.value = speed;
            speedDisplay.textContent = speed;
            statusChip.textContent = 'Speed Up! ⚡';
            break;
          case 'slowdown':
            speed = Math.max(speed - 3, 3);
            speedInput.value = speed;
            speedDisplay.textContent = speed;
            statusChip.textContent = 'Slow Down 🐢';
            break;
          case 'scoreMulti':
            score += 20;
            statusChip.textContent = 'Score Bonus ⭐';
            break;
          case 'shrink':
            lengthTarget = Math.max(1, lengthTarget - 3);
            if(snake.length > lengthTarget){
              snake = snake.slice(snake.length - lengthTarget);
            }
            statusChip.textContent = 'Shrink ✂️';
            break;
        }
        setTimeout(()=>{
          statusChip.textContent = autoPlay ? 'Auto Play ON' : 'Playing';
        }, 1500);
      }

      function gameLoop(){
        update();
        if(playing && !paused && !gameOver) {
          clearInterval(gameInterval);
          gameInterval = setInterval(gameLoop, 1000 / speed);
        }
      }

      function startGame(){
        if(playing && !gameOver) return;
        
        if(gameOver) {
          resetGame();
        }
        
        playing = true;
        paused = false;
        gameOver = false;
        if(!food) placeFood();
        statusChip.textContent = autoPlay ? 'Auto Play ON' : 'Playing';
        speed = parseInt(speedInput.value);
        speedDisplay.textContent = speed;
        gameInterval = setInterval(gameLoop, 1000 / speed);
        canvas.focus();
      }

      function pauseGame(){
        if(!playing || gameOver) return;
        paused = !paused;
        statusChip.textContent = paused ? 'Paused' : (autoPlay ? 'Auto Play ON' : 'Playing');
        if(!paused){
          gameInterval = setInterval(gameLoop, 1000 / speed);
        } else {
          clearInterval(gameInterval);
        }
      }

      function togglePause(){
        if(!playing || gameOver) return;
        pauseGame();
      }

      function endGame(reason){
        clearInterval(gameInterval);
        playing = false;
        paused = false;
        gameOver = true;
        gamesPlayed++;
        lastScore.textContent = score;
        statusChip.textContent = `Game Over! (${reason})`;
        obCount.textContent = obstacles.length;
        pwrCount.textContent = powerups.length;
        speedDisplay.textContent = speed;
        lengthEl.textContent = snake.length;
        if(score > highScore) highScore = score;
        highEl.textContent = highScore;
        
        if(autoPlay) {
          autoPlay = false;
          autoBtn.classList.remove('auto-active');
        }
      }

      // Keyboard input
      window.addEventListener('keydown', e => {
        if(!playing || paused || gameOver || autoPlay) return;
        switch(e.key){
          case 'ArrowUp':
          case 'w':
          case 'W':
            if(dir.y!==1) nextDir = {x:0,y:-1};
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            if(dir.y!==-1) nextDir = {x:0,y:1};
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            if(dir.x!==1) nextDir = {x:-1,y:0};
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            if(dir.x!==-1) nextDir = {x:1,y:0};
            break;
        }
      });

      // Mobile buttons
      upTouch.onclick = () => { 
        if(!autoPlay && playing && !paused && !gameOver && dir.y!==1) nextDir = {x:0,y:-1}; 
      };
      downTouch.onclick = () => { 
        if(!autoPlay && playing && !paused && !gameOver && dir.y!==-1) nextDir = {x:0,y:1}; 
      };
      leftTouch.onclick = () => { 
        if(!autoPlay && playing && !paused && !gameOver && dir.x!==1) nextDir = {x:-1,y:0}; 
      };
      rightTouch.onclick = () => { 
        if(!autoPlay && playing && !paused && !gameOver && dir.x!==-1) nextDir = {x:1,y:0}; 
      };

      // Controls event listeners
      startBtn.onclick = () => {
        startGame();
      };
      
      pauseBtn.onclick = () => {
        if(playing && !gameOver) {
          togglePause();
        } else if(paused) {
          paused = false;
          playing = true;
          statusChip.textContent = autoPlay ? 'Auto Play ON' : 'Playing';
          gameInterval = setInterval(gameLoop, 1000 / speed);
        }
      };
      
      restartBtn.onclick = () => {
        clearInterval(gameInterval);
        resetGame();
      };
      
      autoBtn.onclick = () => {
        autoPlay = !autoPlay;
        if(autoPlay) {
          autoBtn.classList.add('auto-active');
          statusChip.textContent = 'Auto Play ON';
          if(!playing || gameOver) {
            startGame();
          }
        } else {
          autoBtn.classList.remove('auto-active');
          statusChip.textContent = playing ? 'Playing' : 'Ready';
        }
      };

      speedInput.oninput = () => {
        speed = parseInt(speedInput.value);
        speedDisplay.textContent = speed;
        if(playing && !paused && !gameOver){
          clearInterval(gameInterval);
          gameInterval = setInterval(gameLoop, 1000 / speed);
        }
      };

      gridInput.oninput = () => {
        grid = parseInt(gridInput.value);
        cellSize = W / grid;
        resetGame();
      };

      obstacleMode.onchange = () => {
        obstacles = generateObstacles(obstacleMode.value);
        draw();
      };

      powerupsSel.onchange = () => {
        powerups = [];
        pwrCount.textContent = 0;
        draw();
      };

      skinSel.onchange = () => {
        currentSkin = skins[skinSel.value];
        draw();
      };

      wrapSel.onchange = () => {
        wrap = wrapSel.value === 'true';
      };

      // Save/load state with localStorage
      function saveGame(){
        const state = {
          snake, dir, nextDir, food, obstacles, powerups,
          score, highScore, lengthTarget, speed, grid,
          gamesPlayed, longestLength,
          wrap, autoPlay, gameOver, playing, paused,
          darkMode,
          skin: skinSel.value,
          obstacleMode: obstacleMode.value,
          powerupsOn: powerupsSel.value,
        };
        
        try {
          localStorage.setItem('tndSnakeGame', JSON.stringify(state));
          statusChip.textContent = 'Game Saved!';
        } catch (e) {
          statusChip.textContent = 'Save Failed!';
        }
        
        setTimeout(()=>{
          statusChip.textContent = gameOver ? 'Game Over!' : (playing ? (paused ? 'Paused' : (autoPlay ? 'Auto Play ON' : 'Playing')) : 'Ready');
        }, 1500);
      }
      
      function loadGame(){
        try {
          const saved = localStorage.getItem('tndSnakeGame');
          if(!saved) {
            statusChip.textContent = 'No saved game found!';
            setTimeout(()=>{
              statusChip.textContent = gameOver ? 'Game Over!' : (playing ? (paused ? 'Paused' : (autoPlay ? 'Auto Play ON' : 'Playing')) : 'Ready');
            }, 1500);
            return;
          }
          
          const state = JSON.parse(saved);
          snake = state.snake || [{x:Math.floor(grid/2), y:Math.floor(grid/2)}];
          dir = state.dir || {x:1,y:0};
          nextDir = state.nextDir || {x:1,y:0};
          food = state.food || null;
          obstacles = state.obstacles || [];
          powerups = state.powerups || [];
          score = state.score || 0;
          highScore = state.highScore || 0;
          lengthTarget = state.lengthTarget || snake.length;
          speed = state.speed || parseInt(speedInput.value);
          grid = state.grid || grid;
          gamesPlayed = state.gamesPlayed || 0;
          longestLength = state.longestLength || 1;
          wrap = state.wrap !== undefined ? state.wrap : true;
          autoPlay = state.autoPlay || false;
          gameOver = state.gameOver || false;
          playing = state.playing || false;
          paused = state.paused || false;
          darkMode = state.darkMode !== undefined ? state.darkMode : true;
          skinSel.value = state.skin || 'neon';
          currentSkin = skins[skinSel.value];
          obstacleMode.value = state.obstacleMode || 'none';
          powerupsSel.value = state.powerupsOn || 'on';

          speedInput.value = speed;
          gridInput.value = grid;
          wrapSel.value = wrap ? 'true' : 'false';
          
          if(autoPlay) {
            autoBtn.classList.add('auto-active');
          } else {
            autoBtn.classList.remove('auto-active');
          }

          updateTheme();
          updateStats();
          resizeCanvas();
          draw();

          statusChip.textContent = 'Game Loaded!';
          
          if(playing && !paused && !gameOver) {
            gameInterval = setInterval(gameLoop, 1000 / speed);
          }
        } catch (e) {
          statusChip.textContent = 'Load Failed!';
        }
        
        setTimeout(()=>{
          statusChip.textContent = gameOver ? 'Game Over!' : (playing ? (paused ? 'Paused' : (autoPlay ? 'Auto Play ON' : 'Playing')) : 'Ready');
        }, 1500);
      }

      document.getElementById('saveBtn').onclick = saveGame;
      document.getElementById('loadBtn').onclick = loadGame;

      function updateStats(){
        scoreEl.textContent = score;
        highEl.textContent = highScore;
        speedDisplay.textContent = speed;
        lengthEl.textContent = snake.length;
        played.textContent = gamesPlayed;
        longest.textContent = longestLength;
        obCount.textContent = obstacles.length;
        pwrCount.textContent = powerups.length;
      }

      // Load saved data on startup
      try {
        const saved = localStorage.getItem('tndSnakeGame');
        if (saved) {
          const state = JSON.parse(saved);
          highScore = state.highScore || 0;
          gamesPlayed = state.gamesPlayed || 0;
          longestLength = state.longestLength || 1;
          updateStats();
        }
      } catch (e) {
        console.log('No previous save found');
      }

      // Initial setup
      resetGame();

      // Autofocus canvas on load
      window.onload = () => {
        canvas.focus();
      };
    })();
    console.log("Scripts Loaded Successfully");