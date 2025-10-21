import React, { useEffect, useRef, useState } from 'react';

const MarioGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('start'); // start, playing, gameOver, win
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3); // eslint-disable-line no-unused-vars
  const gameLoopRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Game constants
    const GRAVITY = 0.6;
    const JUMP_STRENGTH = -12;
    const MOVE_SPEED = 5;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Game state object
    const game = {
      mario: {
        x: 100,
        y: 400,
        width: 32,
        height: 32,
        velocityX: 0,
        velocityY: 0,
        jumping: false,
        onGround: false,
        powerUp: 'small', // small, big, fire, star
        invincible: false,
        invincibleTimer: 0,
        direction: 'right'
      },
      keys: {},
      camera: {
        x: 0
      },
      level: {
        width: 6400, // 8 screens wide
        platforms: [],
        blocks: [],
        enemies: [],
        powerUps: [],
        coins: [],
        flagPole: null
      },
      score: 0,
      coins: 0,
      lives: 3,
      time: 300,
      gameState: 'playing'
    };

    gameRef.current = game;

    // Create level
    const createLevel = () => {
      const platforms = [];
      const blocks = [];
      const enemies = [];
      const powerUps = [];
      const coins = [];

      // Ground
      for (let i = 0; i < 200; i++) {
        platforms.push({
          x: i * 32,
          y: CANVAS_HEIGHT - 32,
          width: 32,
          height: 32,
          type: 'ground'
        });
      }

      // Floating platforms
      for (let i = 5; i < 10; i++) {
        platforms.push({
          x: i * 100,
          y: 400,
          width: 64,
          height: 16,
          type: 'platform'
        });
      }

      // Question blocks
      for (let i = 0; i < 30; i++) {
        const x = 300 + i * 200 + Math.random() * 100;
        blocks.push({
          x: x,
          y: 300 - Math.floor(Math.random() * 3) * 64,
          width: 32,
          height: 32,
          type: 'question',
          hit: false,
          contents: Math.random() > 0.5 ? 'coin' : 'mushroom'
        });
      }

      // Brick blocks
      for (let i = 0; i < 50; i++) {
        const x = 400 + i * 150 + Math.random() * 50;
        blocks.push({
          x: x,
          y: 250 - Math.floor(Math.random() * 2) * 64,
          width: 32,
          height: 32,
          type: 'brick',
          hit: false
        });
      }

      // Pipes
      for (let i = 0; i < 10; i++) {
        const x = 500 + i * 600;
        const height = 64 + Math.floor(Math.random() * 2) * 32;
        platforms.push({
          x: x,
          y: CANVAS_HEIGHT - 32 - height,
          width: 64,
          height: height,
          type: 'pipe'
        });
      }

      // Goombas
      for (let i = 0; i < 20; i++) {
        enemies.push({
          x: 400 + i * 300 + Math.random() * 200,
          y: CANVAS_HEIGHT - 64,
          width: 32,
          height: 32,
          velocityX: -1,
          velocityY: 0,
          type: 'goomba',
          alive: true,
          squashed: false
        });
      }

      // Koopa Troopas
      for (let i = 0; i < 10; i++) {
        enemies.push({
          x: 800 + i * 500 + Math.random() * 200,
          y: CANVAS_HEIGHT - 64,
          width: 32,
          height: 40,
          velocityX: -1.5,
          velocityY: 0,
          type: 'koopa',
          alive: true,
          inShell: false
        });
      }

      // Coins
      for (let i = 0; i < 40; i++) {
        coins.push({
          x: 300 + i * 150 + Math.random() * 100,
          y: 200 - Math.random() * 100,
          width: 24,
          height: 24,
          collected: false,
          frame: 0
        });
      }

      // Flag pole at the end
      const flagPole = {
        x: game.level.width - 200,
        y: CANVAS_HEIGHT - 32 - 200,
        width: 16,
        height: 200
      };

      game.level.platforms = platforms;
      game.level.blocks = blocks;
      game.level.enemies = enemies;
      game.level.powerUps = powerUps;
      game.level.coins = coins;
      game.level.flagPole = flagPole;
    };

    createLevel();

    // Key handlers
    const handleKeyDown = (e) => {
      game.keys[e.key] = true;

      // Jump
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && game.mario.onGround) {
        game.mario.velocityY = JUMP_STRENGTH;
        game.mario.jumping = true;
        game.mario.onGround = false;
      }
    };

    const handleKeyUp = (e) => {
      game.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Collision detection
    const checkCollision = (rect1, rect2) => {
      return rect1.x < rect2.x + rect2.width &&
             rect1.x + rect1.width > rect2.x &&
             rect1.y < rect2.y + rect2.height &&
             rect1.y + rect1.height > rect2.y;
    };

    const checkCollisionSide = (mario, platform) => {
      const marioBottom = mario.y + mario.height;
      const marioRight = mario.x + mario.width;
      const platformTop = platform.y;
      const platformBottom = platform.y + platform.height;
      const platformRight = platform.x + platform.width;

      if (checkCollision(mario, platform)) {
        // From above
        if (mario.velocityY > 0 && marioBottom - mario.velocityY <= platformTop + 5) {
          return 'top';
        }
        // From below
        if (mario.velocityY < 0 && mario.y - mario.velocityY >= platformBottom - 5) {
          return 'bottom';
        }
        // From left
        if (mario.velocityX > 0 && marioRight - mario.velocityX <= platform.x + 5) {
          return 'left';
        }
        // From right
        if (mario.velocityX < 0 && mario.x - mario.velocityX >= platformRight - 5) {
          return 'right';
        }
      }
      return null;
    };

    // Update game
    const update = () => {
      if (game.gameState !== 'playing') return;

      const mario = game.mario;

      // Handle input
      mario.velocityX = 0;
      if (game.keys['ArrowLeft'] || game.keys['a']) {
        mario.velocityX = -MOVE_SPEED;
        mario.direction = 'left';
      }
      if (game.keys['ArrowRight'] || game.keys['d']) {
        mario.velocityX = MOVE_SPEED;
        mario.direction = 'right';
      }

      // Apply gravity
      mario.velocityY += GRAVITY;

      // Limit fall speed
      if (mario.velocityY > 15) mario.velocityY = 15;

      // Update position
      mario.x += mario.velocityX;
      mario.y += mario.velocityY;

      mario.onGround = false;

      // Check platform collisions
      [...game.level.platforms, ...game.level.blocks].forEach(platform => {
        const side = checkCollisionSide(mario, platform);

        if (side === 'top') {
          mario.y = platform.y - mario.height;
          mario.velocityY = 0;
          mario.onGround = true;
          mario.jumping = false;
        } else if (side === 'bottom') {
          mario.y = platform.y + platform.height;
          mario.velocityY = 0;

          // Hit block from below
          if (platform.type === 'question' && !platform.hit) {
            platform.hit = true;
            game.score += 100;

            if (platform.contents === 'coin') {
              game.coins += 1;
              game.score += 200;
            } else if (platform.contents === 'mushroom' && mario.powerUp === 'small') {
              // Spawn mushroom power-up
              game.level.powerUps.push({
                x: platform.x,
                y: platform.y - 32,
                width: 32,
                height: 32,
                velocityX: 2,
                velocityY: 0,
                type: 'mushroom'
              });
            }
          } else if (platform.type === 'brick' && mario.powerUp !== 'small') {
            platform.broken = true;
            game.score += 50;
          }
        } else if (side === 'left' || side === 'right') {
          if (side === 'left') {
            mario.x = platform.x - mario.width;
          } else {
            mario.x = platform.x + platform.width;
          }
          mario.velocityX = 0;
        }
      });

      // Remove broken blocks
      game.level.blocks = game.level.blocks.filter(block => !block.broken);

      // Update power-ups
      game.level.powerUps = game.level.powerUps.filter(powerUp => {
        powerUp.velocityY += GRAVITY;
        powerUp.x += powerUp.velocityX;
        powerUp.y += powerUp.velocityY;

        // Platform collision for power-ups
        game.level.platforms.forEach(platform => {
          if (checkCollision(powerUp, platform)) {
            powerUp.y = platform.y - powerUp.height;
            powerUp.velocityY = 0;
          }
        });

        // Mario collision
        if (checkCollision(mario, powerUp)) {
          if (powerUp.type === 'mushroom') {
            mario.powerUp = 'big';
            mario.height = 48;
            game.score += 1000;
          }
          return false; // Remove power-up
        }

        return powerUp.x > -50 && powerUp.x < game.level.width + 50;
      });

      // Update enemies
      game.level.enemies.forEach(enemy => {
        if (!enemy.alive) return;

        enemy.velocityY += GRAVITY;
        enemy.x += enemy.velocityX;
        enemy.y += enemy.velocityY;

        // Platform collision for enemies
        game.level.platforms.forEach(platform => {
          const side = checkCollisionSide(enemy, platform);
          if (side === 'top') {
            enemy.y = platform.y - enemy.height;
            enemy.velocityY = 0;
          } else if (side === 'left' || side === 'right') {
            enemy.velocityX *= -1;
          }
        });

        // Mario collision
        if (checkCollision(mario, enemy) && !enemy.squashed) {
          const marioBottom = mario.y + mario.height;
          const enemyTop = enemy.y;

          // Jumping on enemy
          if (mario.velocityY > 0 && marioBottom - mario.velocityY <= enemyTop + 10) {
            enemy.squashed = true;
            enemy.alive = false;
            mario.velocityY = -8;
            game.score += 200;
          } else if (!mario.invincible) {
            // Hit by enemy
            if (mario.powerUp === 'big') {
              mario.powerUp = 'small';
              mario.height = 32;
              mario.invincible = true;
              mario.invincibleTimer = 120;
            } else {
              game.lives -= 1;
              if (game.lives <= 0) {
                game.gameState = 'gameOver';
              } else {
                mario.x = 100;
                mario.y = 400;
                mario.invincible = true;
                mario.invincibleTimer = 180;
              }
            }
          }
        }
      });

      // Update invincibility
      if (mario.invincible) {
        mario.invincibleTimer--;
        if (mario.invincibleTimer <= 0) {
          mario.invincible = false;
        }
      }

      // Collect coins
      game.level.coins.forEach(coin => {
        if (!coin.collected && checkCollision(mario, coin)) {
          coin.collected = true;
          game.coins += 1;
          game.score += 100;
        }
        coin.frame = (coin.frame + 0.1) % 4;
      });

      // Check flag pole
      if (game.level.flagPole && checkCollision(mario, game.level.flagPole)) {
        game.gameState = 'win';
        game.score += 5000;
      }

      // Update camera
      const cameraTarget = mario.x - CANVAS_WIDTH / 3;
      game.camera.x = Math.max(0, Math.min(cameraTarget, game.level.width - CANVAS_WIDTH));

      // Boundaries
      if (mario.x < 0) mario.x = 0;
      if (mario.x > game.level.width - mario.width) mario.x = game.level.width - mario.width;

      // Fall off screen
      if (mario.y > CANVAS_HEIGHT) {
        game.lives -= 1;
        if (game.lives <= 0) {
          game.gameState = 'gameOver';
        } else {
          mario.x = 100;
          mario.y = 400;
          mario.velocityY = 0;
        }
      }

      // Update React state
      setScore(game.score);
      setLives(game.lives);
      setGameState(game.gameState);
    };

    // Render game
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Save context
      ctx.save();

      // Apply camera
      ctx.translate(-game.camera.x, 0);

      // Draw ground and platforms
      game.level.platforms.forEach(platform => {
        if (platform.type === 'ground') {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.strokeStyle = '#654321';
          ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        } else if (platform.type === 'platform') {
          ctx.fillStyle = '#228B22';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.strokeStyle = '#006400';
          ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        } else if (platform.type === 'pipe') {
          ctx.fillStyle = '#228B22';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.fillStyle = '#006400';
          ctx.fillRect(platform.x, platform.y, platform.width, 8);
          ctx.strokeStyle = '#004d00';
          ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
        }
      });

      // Draw blocks
      game.level.blocks.forEach(block => {
        if (block.type === 'question') {
          ctx.fillStyle = block.hit ? '#8B4513' : '#FFD700';
          ctx.fillRect(block.x, block.y, block.width, block.height);
          ctx.strokeStyle = block.hit ? '#654321' : '#FFA500';
          ctx.strokeRect(block.x, block.y, block.width, block.height);

          if (!block.hit) {
            ctx.fillStyle = '#000';
            ctx.font = '20px Arial';
            ctx.fillText('?', block.x + 10, block.y + 23);
          }
        } else if (block.type === 'brick') {
          ctx.fillStyle = '#CD853F';
          ctx.fillRect(block.x, block.y, block.width, block.height);
          ctx.strokeStyle = '#8B4513';
          ctx.strokeRect(block.x, block.y, block.width, block.height);
          // Brick pattern
          ctx.strokeRect(block.x, block.y, 16, 16);
          ctx.strokeRect(block.x + 16, block.y, 16, 16);
          ctx.strokeRect(block.x, block.y + 16, 16, 16);
          ctx.strokeRect(block.x + 16, block.y + 16, 16, 16);
        }
      });

      // Draw coins
      game.level.coins.forEach(coin => {
        if (!coin.collected) {
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          const scale = Math.abs(Math.cos(coin.frame));
          ctx.ellipse(coin.x + 12, coin.y + 12, 12 * scale, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFA500';
          ctx.stroke();
        }
      });

      // Draw power-ups
      game.level.powerUps.forEach(powerUp => {
        if (powerUp.type === 'mushroom') {
          // Mushroom cap
          ctx.fillStyle = '#FF0000';
          ctx.beginPath();
          ctx.arc(powerUp.x + 16, powerUp.y + 12, 14, Math.PI, 0, false);
          ctx.fill();

          // White spots
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(powerUp.x + 10, powerUp.y + 10, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(powerUp.x + 22, powerUp.y + 10, 4, 0, Math.PI * 2);
          ctx.fill();

          // Mushroom stem
          ctx.fillStyle = '#FFFACD';
          ctx.fillRect(powerUp.x + 10, powerUp.y + 16, 12, 16);
        }
      });

      // Draw enemies
      game.level.enemies.forEach(enemy => {
        if (!enemy.alive && enemy.squashed) {
          ctx.fillStyle = '#654321';
          ctx.fillRect(enemy.x, enemy.y + enemy.height - 10, enemy.width, 10);
          return;
        }

        if (!enemy.alive) return;

        if (enemy.type === 'goomba') {
          // Body
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height - 8);
          // Feet
          ctx.fillStyle = '#654321';
          ctx.fillRect(enemy.x, enemy.y + enemy.height - 8, enemy.width, 8);
          // Eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(enemy.x + 6, enemy.y + 8, 8, 8);
          ctx.fillRect(enemy.x + 18, enemy.y + 8, 8, 8);
          ctx.fillStyle = '#000';
          ctx.fillRect(enemy.x + 8, enemy.y + 10, 4, 4);
          ctx.fillRect(enemy.x + 20, enemy.y + 10, 4, 4);
        } else if (enemy.type === 'koopa') {
          // Shell
          ctx.fillStyle = '#228B22';
          ctx.fillRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10);
          ctx.strokeStyle = '#006400';
          ctx.strokeRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10);

          if (!enemy.inShell) {
            // Head
            ctx.fillStyle = '#ADFF2F';
            ctx.fillRect(enemy.x + 8, enemy.y, 16, 16);
            // Eyes
            ctx.fillStyle = '#000';
            ctx.fillRect(enemy.x + 10, enemy.y + 4, 4, 4);
            ctx.fillRect(enemy.x + 18, enemy.y + 4, 4, 4);
          }
        }
      });

      // Draw flag pole
      if (game.level.flagPole) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(game.level.flagPole.x, game.level.flagPole.y, game.level.flagPole.width, game.level.flagPole.height);
        // Flag
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(game.level.flagPole.x + game.level.flagPole.width, game.level.flagPole.y, 40, 30);
      }

      // Draw Mario
      const mario = game.mario;
      const blinking = mario.invincible && Math.floor(Date.now() / 100) % 2 === 0;

      if (!blinking) {
        // Body
        if (mario.powerUp === 'big') {
          ctx.fillStyle = '#FF0000';
        } else {
          ctx.fillStyle = '#FF0000';
        }
        ctx.fillRect(mario.x, mario.y, mario.width, mario.height);

        // Overalls
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(mario.x + 4, mario.y + mario.height - 16, mario.width - 8, 16);

        // Face
        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(mario.x + 8, mario.y + 4, 16, 12);

        // Hat
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(mario.x + 4, mario.y, 24, 6);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(mario.x + 10, mario.y + 8, 3, 3);
        ctx.fillRect(mario.x + 19, mario.y + 8, 3, 3);

        // Mustache
        ctx.fillStyle = '#654321';
        ctx.fillRect(mario.x + 10, mario.y + 12, 12, 3);
      }

      // Restore context
      ctx.restore();

      // Draw HUD
      ctx.fillStyle = '#000';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(`Score: ${game.score}`, 10, 30);
      ctx.fillText(`Coins: ${game.coins}`, 200, 30);
      ctx.fillText(`Lives: ${game.lives}`, 400, 30);
      ctx.fillText(`World 1-1`, 600, 30);
    };

    // Game loop
    const gameLoop = () => {
      update();
      render();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setGameState('start');

    if (gameRef.current) {
      gameRef.current.score = 0;
      gameRef.current.lives = 3;
      gameRef.current.coins = 0;
      gameRef.current.mario.x = 100;
      gameRef.current.mario.y = 400;
      gameRef.current.mario.powerUp = 'small';
      gameRef.current.mario.height = 32;
      gameRef.current.gameState = 'playing';
      gameRef.current.camera.x = 0;
      setGameState('playing');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ marginBottom: '20px', fontSize: '36px' }}>Super Mario Bros</h1>

      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            border: '4px solid #fff',
            backgroundColor: '#5c94fc',
            imageRendering: 'pixelated'
          }}
        />

        {gameState === 'start' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '30px',
            borderRadius: '10px'
          }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>Press Start</h2>
            <button
              onClick={restartGame}
              style={{
                padding: '15px 30px',
                fontSize: '20px',
                backgroundColor: '#FF0000',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Start Game
            </button>
            <div style={{ marginTop: '20px', fontSize: '14px' }}>
              <p>Arrow Keys or A/D - Move</p>
              <p>Space/W/Up Arrow - Jump</p>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '30px',
            borderRadius: '10px'
          }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#FF0000' }}>Game Over</h2>
            <p style={{ fontSize: '24px', marginBottom: '20px' }}>Final Score: {score}</p>
            <button
              onClick={restartGame}
              style={{
                padding: '15px 30px',
                fontSize: '20px',
                backgroundColor: '#FF0000',
                color: '#fff',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {gameState === 'win' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '30px',
            borderRadius: '10px'
          }}>
            <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#00FF00' }}>You Win!</h2>
            <p style={{ fontSize: '24px', marginBottom: '20px' }}>Final Score: {score}</p>
            <button
              onClick={restartGame}
              style={{
                padding: '15px 30px',
                fontSize: '20px',
                backgroundColor: '#00FF00',
                color: '#000',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
        <p>Use Arrow Keys or A/D to move, Space/W/Up Arrow to jump</p>
        <p>Jump on enemies to defeat them! Collect coins and power-ups!</p>
        <p>Reach the flag at the end to win!</p>
      </div>
    </div>
  );
};

export default MarioGame;
