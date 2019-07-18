var DIRECTION_UP = 'DIRECTION_UP';
var DIRECTION_LEFT = 'DIRECTION_LEFT';
var DIRECTION_RIGHT = 'DIRECTION_RIGHT';
var DIRECTION_DOWN = 'DIRECTION_DOWN';
var DIRECTION_STOP = 'DIRECTION_STOP';

var TILE_SIZE = 30;

var ANIMATION_LOOP_DELAY = 100;  // ms
var SNAKE_SPEED = 0.002;

var DEFAULT_BG_COLOR = 'white';

var DEFAULT_COLOR_SNAKE = 'white';
var DEFAULT_COLOR_BORDER_SNAKE = '';

var DEFAULT_COLOR_BLOCK = '#b9c49d';
var DEFAULT_COLOR_BORDER_BLOCK = '#000000';

var DEFAULT_COLOR_FOOD = '#ffdd57';
var DEFAULT_COLOR_BORDER_FOOD = 'black';

var DEFAULT_NET_COLOR = 'blue';
var DEFAULT_THEORY_SNAKE_COLOR = '#0000ff';

function getTimestamp() {
  return new Date().getTime();
}

function runDeltaLoop(callback, delay) {
  var startedAt = getTimestamp();
  return setInterval(function () {
    var now = getTimestamp();
    var delta = now - startedAt;
    startedAt = now;
    callback(delta);
  }, delay);
}

function makeIterator(seq, cycle) {
  var i = 0;

  return function () {
    if (i >= seq.length && cycle) {
      i = 0;
    }
    return seq[i++];
  }
}

function renderBorder(context, x, y, width, height)  {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y);
  context.stroke();
}

function renderTile(context, x, y) {
  context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  renderBorder(context, x, y, TILE_SIZE, TILE_SIZE);
}

function renderSnake(context, body, color, borderColor) {
  context.fillStyle = color || DEFAULT_COLOR_SNAKE;
  context.strokeStyle = borderColor || DEFAULT_COLOR_BORDER_SNAKE;

  body.forEach(function(cell) {
    renderTile(context, cell.col * TILE_SIZE, cell.row * TILE_SIZE);
  });
}

function renderBlocks(context, blocks, color, borderColor) {
  context.fillStyle = color || DEFAULT_COLOR_BLOCK;
  context.strokeStyle = borderColor || DEFAULT_COLOR_BORDER_BLOCK;
  blocks.forEach(function(cell) {
    renderTile(context, cell.col * TILE_SIZE, cell.row * TILE_SIZE);
  })
}

function renderFood(context, food, color, borderColor) {
  context.fillStyle = color || DEFAULT_COLOR_FOOD;
  context.strokeStyle = borderColor || DEFAULT_COLOR_BORDER_FOOD;
  renderTile(context, food.col * TILE_SIZE, food.row * TILE_SIZE)
}

function renderBackground(context, width, height, color) {
  context.fillStyle = color || DEFAULT_BG_COLOR;
  context.fillRect(0, 0, width, height);
}

function renderAnimation(context, animation, styles) {
  context.clearRect(0, 0, animation.width, animation.height);

  renderBackground(context, animation.width, animation.height, styles.bgColor);
  renderFullNet(context, animation.width, animation.height);

  if (animation.food) {
    renderFood(context, animation.food,
      styles.foodColor, styles.foodBorderColor);
  }

  if (animation.snake) {
    renderSnake(context, animation.snake.body,
      styles.snakeColor, styles.snakeBorderColor
    );
  }

  if (animation.blocks) {
    renderBlocks(context, animation.blocks,
      styles.blockColor, styles.blockBorderColor)
  }
}

function makeAnimation(config) {
  var animation = {
    foodIter: null,
    snakeCtrl: null,
    width: config.width,
    height: config.height,
    food: null,
    snake: null,
    blocks: null,
    updateSnakeDirection: function () {
      if (this.snake && this.snakeCtrl) {
        var headRow = this.snake.body[0].row;
        var headCol = this.snake.body[0].col;
        var direction = this.snakeCtrl.getDirection(headRow, headCol);
        if (direction === DIRECTION_STOP) {
          this.reset();
        }
        else if (direction) {
          this.snake.direction = direction;
        }
      }
    },
    updateFood: function () {
      this.food = this.foodIter();
    },
    snakeGrowing: function (cell) {
      var growingLimit = config.snakeGrowingLimit || this.snake.body.length;
      if (config.snakeGrowing !== false) {
        if (growingLimit && this.snake.body.length < growingLimit) {
          this.snake.body.push(cell);
        }
      }
    },
    reset: function () {
      if (config.foodPositions) {
        this.foodIter = makeIterator(config.foodPositions, config.foodCycle);
        this.food = this.foodIter();
      }
      if (config.snakePositions && config.snakeDirection) {
        this.snake = makeSnake(
          config.snakePositions,
          config.snakeDirection
        )
      }
      if (this.snake && config.snakePath) {
        this.snakeCtrl = makeSnakeController(
          config.snakePath, config.snakePathCycle);
      }
      this.blocks = config.blocks || [];
    }
  };
  animation.reset();
  return animation;
}

function runAnimation(context, animation, styles) {
  runDeltaLoop(function (delta) {
    updateAnimation(animation, delta);
    renderAnimation(context, animation, styles);
  }, ANIMATION_LOOP_DELAY);
}

function updateAnimation(animation, delta) {
  if (animation.snake) {
    var newBodyCell = copyLastCell(animation.snake);
    var movement = updateSnakePos(animation.snake, delta);


    if (!isValidMovement(movement)) {
      animation.reset();
      return;
    }

    if (movement.rows === 0 && movement.cols == 0) {
      return;
    }

    if (animation.food) {
      if (posEquals(animation.snake.body[0], animation.food)) {
        animation.snakeGrowing(newBodyCell);
        animation.updateFood();
      }
    }

    animation.updateSnakeDirection();
  }
}

function isValidMovement(movement) {
  return !(
    Math.abs(movement.rows) > 1 ||
    Math.abs(movement.cols) > 1
  );
}

function makeSnake(body, direction) {
  return {
    direction: direction,
    accX: 0,
    accY: 0,
    body: copyBody(body)
  }
}

function copyBody(body) {
  return body.map(copyCell);
}

function copyCell(cell) {
  return {row: cell.row, col: cell.col};
}

function copyLastCell(snake) {
  return copyCell(snake.body[snake.body.length - 1]);
}

function posEquals(a, b) {
  return a.row === b.row && a.col === b.col;
}

function updateSnakePos(snake, delta) {
  var distance = delta * SNAKE_SPEED;

  if (snake.direction === DIRECTION_UP) {
    snake.accY -= distance;
  }
  else if (snake.direction === DIRECTION_DOWN) {
    snake.accY += distance;
  }
  else if (snake.direction === DIRECTION_RIGHT) {
    snake.accX += distance;
  }
  else if (snake.direction === DIRECTION_LEFT) {
    snake.accX -= distance;
  }

  var movement = {rows: 0, cols: 0};

  if (snake.accX > 0) {
    while (snake.accX >= 1) {
      snake.accX -= 1;
      movement.cols += 1;
    }
  }
  else if (snake.accX < 0) {
    while (snake.accX <= -1) {
      snake.accX += 1;
      movement.cols -= 1;
    }
  }

  if (snake.accY > 0) {
    while (snake.accY >= 1) {
      snake.accY -= 1;
      movement.rows += 1;
    }
  }
  else if (snake.accY < 0) {
    while (snake.accY <= -1) {
      snake.accY += 1;
      movement.rows -= 1;
    }
  }

  if (movement.rows || movement.cols) {
    for (var i = snake.body.length - 1; i > 0; i--) {
      snake.body[i].row = snake.body[i - 1].row;
      snake.body[i].col = snake.body[i - 1].col;
    }

    snake.body[0].row += movement.rows;
    snake.body[0].col += movement.cols;
  }

  return movement;
}

function makeSnakeController(path, cycle) {
  return {
    index: 0,
    getDirection: function (headRow, headCol) {
      if (this.index >= path.length && cycle) {
        this.index = 0;
      }

      if (this.index < path.length) {
        var directionInfo = path[this.index];
        if (directionInfo.row === headRow && directionInfo.col === headCol) {
          this.index += 1;
          return directionInfo.direction;
        }
        else {
          return null;
        }
      }
      return DIRECTION_STOP;
    }
  }
}

function setupSnakeAnimation(config) {
  var canvas = config.$canvas[0];
  var $container = null;
  if (config.$canvasContainer) {
    $container = config.$canvasContainer;
  }
  else {
    $container = $(window);
  }
  canvas.width = $container.width();

  var innerConfig = {
    width: $container.width(),
    height: config.$canvas.height(),
    blocks: config.blocks,
    styles: config.styles || {},
    snakePositions: config.snakePositions,
    snakePath: config.snakePath,
    snakeGrowing: config.snakeGrowing,
    snakeGrowingLimit: config.snakeGrowingLimit,
    snakePathCycle: config.snakePathCycle,
    snakeDirection: config.snakeDirection,
    foodPositions: config.foodPositions,
    foodCycle: config.foodCycle
  };

  $(window).resize(function () {
    config.$canvas.width($container.width());
    innerConfig.width = $container.width();
  });

  var context = canvas.getContext('2d');
  var animation = makeAnimation(innerConfig);
  runAnimation(context, animation, config.styles || {});
}


function renderTheoryCanvas(ctx, width, height, progress) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  renderNet(ctx, width, height, progress);
  renderTheorySnake(ctx, progress);
}
function renderFullNet(ctx, width, height) {
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = DEFAULT_NET_COLOR;

  for (var x = 0; x <= width; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (var y = 0; y <= height; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function renderNet(ctx, width, height, progress) {
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = DEFAULT_NET_COLOR;

  for (var x = 0; x <= width; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  if (progress > 5) {
    for (var y = 0; y <= height; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

// TODO[low] lekki refaktor
function renderTheorySnake(ctx, progress) {
  var positions = [];
  ctx.fillStyle = DEFAULT_THEORY_SNAKE_COLOR;
  ctx.lineWidth = 3.0;

  if (progress > 10) {
    positions.push({row: 3, col: 3});
  }

  if (progress > 15) {
    positions.push({row: 3, col: 4})
  }

  if (progress > 20) {
    positions.push({row: 3, col: 5})
  }

  if (positions.length > 0) {
    ctx.lineWidth = 3;
    positions.forEach(function (pos) {
      renderBorder(ctx,
        pos.col * TILE_SIZE,
        pos.row * TILE_SIZE,
        TILE_SIZE, TILE_SIZE);
    });
  }
}

// TODO[low] lekki refaktor
function setupTheoryCanvas() {
  var canvasContainer = $('#canvas-theory-container');
  var canvas = $('#canvas-theory')[0];
  canvas.width = canvasContainer.width();
  $(window).resize(function () {
    canvas.width = canvasContainer.width();
  });
  var context = canvas.getContext('2d');
  var progress = 0;
  setInterval(function () {
    progress += 1;
    if (progress > 35) {
      progress = 0;
    }
    renderTheoryCanvas(context, canvas.width, canvas.height, progress);
  }, 300);
}

function setupMaxLength() {
  $('#contact__message').maxlength({
    max: 300,
    feedbackText: '{c}/{m}',
    feedbackTarget: '#contact-message-limit'
  });
}

function setupHideOnClick() {
  $('.hide-on-click').click(function () {
    var elementId = $(this).data('element');
    if (elementId) {
      $('#' + elementId).hide();
    }
  });
}

function setupHideOnTimeout() {
  $('.hide-on-timeout').each(function () {
    var elementId = $(this).data('element');
    var timeout = $(this).data('timeout');
    if (timeout) {
      var delay = parseInt(timeout, 10);
      setTimeout(function () {
        if (elementId) {
         $('#' + elementId).hide();
        }
      }, delay);
    }
  });
}

function setupAnimations() {
  var level1 = 7;
  var level2 = 14;
  var level3 = 21;
  var level4 = 28;

  setupSnakeAnimation({
    $canvas: $('#canvas-cover'),
    $canvasContainer: $('.canvas-container'),
    styles: {
      snakeColor:'#00d1b2',
      snakeBorderColor: 'black'
    },
    blocks: [
      // linia 1
      {row: 5, col: 5},
      {row: 6, col: 6},
      {row: 6, col: 7},
      {row: 6, col: 5},
      {row: 11, col: 11},
      {row: 12, col: 12},
      {row: 12, col: 11},
      {row: 6, col: 13},
      {row: 8, col: 15},
      {row: 8, col: 14},
      {row: 8, col: 13},
      {row: 8, col: 16},
      {row: 11, col: 18},
      {row: 4, col: 18},
      {row: 9, col: 23},
      {row: 9, col: 22},
      {row: 9, col: 14},
      {row: 5, col: 26},
      {row: 6, col: 27},
      {row: 7, col: 30},
      {row: 8, col: 30},
      {row: 9, col: 30},
      {row: 4, col: 32},
      {row: 5, col: 33},
      {row: 11, col: 40},
      {row: 12, col: 39},
    ],
    snakeGrowing: true,
    snakeGrowingLimit: 13,
    snakePositions: [
      {row: 10, col: 15},
      {row: 10, col: 14},
      {row: 10, col: 13}
    ],
    foodPositions: [
      {row: 10, col: 20},
      {row: 10, col: 25},
      {row: 8, col: 20},
      {row: 10, col: 6},
      {row: 9, col: 21},
      {row: 7, col: 14},
    ],
    foodCycle: true,
    snakeDirection: DIRECTION_RIGHT,
    snakePath: [
      {row: 10, col: 16, direction: DIRECTION_RIGHT},
      {row: 10, col: 25, direction: DIRECTION_UP},
      {row: 8, col: 25, direction: DIRECTION_LEFT},
      {row: 8, col: 20, direction: DIRECTION_DOWN},
      {row: 10, col: 20, direction: DIRECTION_LEFT},
      {row: 10, col: 6, direction: DIRECTION_UP},
      {row: 9, col: 6, direction: DIRECTION_RIGHT},
      {row: 9, col: 21, direction: DIRECTION_UP},
      {row: 7, col: 21, direction: DIRECTION_LEFT},
      {row: 7, col: 12, direction: DIRECTION_DOWN},
      {row: 10, col: 12, direction: DIRECTION_RIGHT}
    ],
    snakePathCycle: true
  });
}

function animateCSS($element, animationName, callback) {
    $element.toggleClass("animated " + animationName);
    console.log($element);

    function handleAnimationEnd() {
        console.log('czyszczenie');
        $element.removeClass("animated " + animationName);
        $element.off('animationend', handleAnimationEnd);


        if (typeof callback === 'function') {
          callback()
        }
    }

    $element.on('animationend', handleAnimationEnd)
}

function setupCSSAnimation($elements) {
  var locked = false;
  $elements.mouseover(function (event) {
    if (!locked) {
      locked = true;
      animateCSS($(event.currentTarget), 'pulse');
    }
  });

  $elements.mouseleave(function (event) {
    locked = false;
  });

}

function setupPopup() {
  $('.image-popup').magnificPopup({
    type: 'image'
  });
}

$(function () {
  setTimeout(function () {
    setupCSSAnimation($('.pricing-plan'), 'pulse');
    setupCSSAnimation($('article.tile'), 'pulse');

    setupAnimations();
    setupPopup();
  }, 0);
});
