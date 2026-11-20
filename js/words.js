// 영어 단어 3개와 그림 3개 잇기: 단어 목록과 문제 고르기.
// 그림은 Microsoft Fluent Emoji (MIT) 평면 SVG를 assets/words/<파일>.svg 로 받아 둔다 (tools/fetch-words.js).
// w: 단어, e: Fluent Emoji 폴더 이름, g: 그림이 헷갈리는 묶음 (같은 묶음은 한 문제에 같이 나오지 않는다)
(function (root) {
  const WORDS = [
    // 3글자
    { w: 'cat', e: 'Cat' }, { w: 'dog', e: 'Dog' }, { w: 'pig', e: 'Pig' }, { w: 'cow', e: 'Cow', g: 'cow' },
    { w: 'fox', e: 'Fox' }, { w: 'owl', e: 'Owl' }, { w: 'bat', e: 'Bat' }, { w: 'ant', e: 'Ant', g: 'bug' },
    { w: 'bee', e: 'Honeybee' }, { w: 'bug', e: 'Bug' }, { w: 'sun', e: 'Sun' }, { w: 'egg', e: 'Egg' },
    { w: 'car', e: 'Automobile', g: 'car' }, { w: 'bus', e: 'Bus' }, { w: 'hat', e: 'Top hat' }, { w: 'key', e: 'Key' },
    { w: 'box', e: 'Package' }, { w: 'pen', e: 'Pen', g: 'pen' }, { w: 'bed', e: 'Bed' }, { w: 'eye', e: 'Eye' },
    { w: 'ear', e: 'Ear' }, { w: 'leg', e: 'Leg' }, { w: 'pie', e: 'Pie' },
    { w: 'rat', e: 'Rat', g: 'mouse' }, { w: 'axe', e: 'Axe' }, { w: 'saw', e: 'Carpentry saw' }, { w: 'fly', e: 'Fly', g: 'bug' },
    { w: 'web', e: 'Spider web' }, { w: 'jar', e: 'Jar' }, { w: 'van', e: 'Minibus', g: 'car' }, { w: 'gem', e: 'Gem stone' },
    { w: 'log', e: 'Wood' }, { w: 'bow', e: 'Ribbon' }, { w: 'cup', e: 'Cup with straw', g: 'cup' },
    { w: 'nut', e: 'Chestnut' }, { w: 'ram', e: 'Ram', g: 'sheep' },
    // 4글자
    { w: 'bear', e: 'Bear' }, { w: 'frog', e: 'Frog' }, { w: 'duck', e: 'Duck', g: 'duck' }, { w: 'fish', e: 'Tropical fish' },
    { w: 'goat', e: 'Goat', g: 'sheep' }, { w: 'lion', e: 'Lion' }, { w: 'deer', e: 'Deer', g: 'deer' }, { w: 'crab', e: 'Crab' },
    { w: 'wolf', e: 'Wolf' }, { w: 'seal', e: 'Seal' }, { w: 'swan', e: 'Swan', g: 'duck' }, { w: 'worm', e: 'Worm' },
    { w: 'bird', e: 'Bird' }, { w: 'kite', e: 'Kite' }, { w: 'ball', e: 'Soccer ball' }, { w: 'cake', e: 'Birthday cake' },
    { w: 'corn', e: 'Ear of corn' }, { w: 'pear', e: 'Pear' }, { w: 'lime', e: 'Lime', g: 'lemon' }, { w: 'milk', e: 'Glass of milk', g: 'cup' },
    { w: 'rice', e: 'Cooked rice' }, { w: 'taco', e: 'Taco' }, { w: 'boat', e: 'Sailboat' }, { w: 'tree', e: 'Deciduous tree', g: 'tree' },
    { w: 'rose', e: 'Rose', g: 'flower' }, { w: 'leaf', e: 'Maple leaf' }, { w: 'moon', e: 'Crescent moon' }, { w: 'star', e: 'Star' },
    { w: 'fire', e: 'Fire' }, { w: 'rain', e: 'Cloud with rain', g: 'cloud' }, { w: 'drum', e: 'Drum' }, { w: 'bell', e: 'Bell' },
    { w: 'book', e: 'Closed book' }, { w: 'sock', e: 'Socks' }, { w: 'coat', e: 'Coat' }, { w: 'door', e: 'Door' },
    { w: 'lock', e: 'Locked' }, { w: 'ring', e: 'Ring' }, { w: 'tent', e: 'Tent' }, { w: 'shoe', e: 'Running shoe' },
    { w: 'gift', e: 'Wrapped gift' }, { w: 'sled', e: 'Sled' }, { w: 'bone', e: 'Bone' }, { w: 'foot', e: 'Foot' },
    { w: 'nose', e: 'Nose' }, { w: 'hook', e: 'Hook' }, { w: 'kiwi', e: 'Kiwi fruit' }, { w: 'soap', e: 'Soap' },
    { w: 'taxi', e: 'Taxi', g: 'car' }, { w: 'wand', e: 'Magic wand' }, { w: 'yarn', e: 'Yarn' },
    { w: 'dice', e: 'Game die' }, { w: 'coin', e: 'Coin' }, { w: 'rock', e: 'Rock' }, { w: 'bowl', e: 'Bowl with spoon' },
    { w: 'nest', e: 'Nest with eggs' }, { w: 'snow', e: 'Cloud with snow', g: 'cloud' }, { w: 'lamb', e: 'Ewe', g: 'sheep' },
    // 5글자
    { w: 'horse', e: 'Horse', g: 'horse' }, { w: 'mouse', e: 'Mouse', g: 'mouse' }, { w: 'tiger', e: 'Tiger' }, { w: 'zebra', e: 'Zebra', g: 'horse' },
    { w: 'camel', e: 'Camel' }, { w: 'snake', e: 'Snake' }, { w: 'whale', e: 'Spouting whale' }, { w: 'shark', e: 'Shark' },
    { w: 'panda', e: 'Panda' }, { w: 'koala', e: 'Koala' }, { w: 'llama', e: 'Llama' }, { w: 'otter', e: 'Otter' },
    { w: 'skunk', e: 'Skunk' }, { w: 'bison', e: 'Bison', g: 'cow' }, { w: 'moose', e: 'Moose', g: 'deer' }, { w: 'eagle', e: 'Eagle' },
    { w: 'goose', e: 'Goose', g: 'duck' }, { w: 'squid', e: 'Squid' }, { w: 'sloth', e: 'Sloth' }, { w: 'snail', e: 'Snail' },
    { w: 'apple', e: 'Red apple' }, { w: 'grape', e: 'Grapes' }, { w: 'lemon', e: 'Lemon', g: 'lemon' }, { w: 'mango', e: 'Mango' },
    { w: 'melon', e: 'Melon' }, { w: 'peach', e: 'Peach' }, { w: 'onion', e: 'Onion' }, { w: 'bread', e: 'Bread' },
    { w: 'pizza', e: 'Pizza' }, { w: 'candy', e: 'Candy' }, { w: 'donut', e: 'Doughnut' }, { w: 'robot', e: 'Robot' },
    { w: 'clock', e: 'Alarm clock' }, { w: 'house', e: 'House' }, { w: 'chair', e: 'Chair' }, { w: 'plant', e: 'Potted plant' },
    { w: 'cloud', e: 'Cloud', g: 'cloud' }, { w: 'flute', e: 'Flute' }, { w: 'piano', e: 'Musical keyboard' }, { w: 'train', e: 'Locomotive' },
    { w: 'truck', e: 'Delivery truck' }, { w: 'plane', e: 'Airplane' }, { w: 'ruler', e: 'Straight ruler' }, { w: 'brush', e: 'Paintbrush' },
    { w: 'crown', e: 'Crown' }, { w: 'scarf', e: 'Scarf' }, { w: 'jeans', e: 'Jeans' }, { w: 'dress', e: 'Dress' },
    { w: 'shirt', e: 'T-shirt' }, { w: 'broom', e: 'Broom' }, { w: 'ghost', e: 'Ghost' }, { w: 'heart', e: 'Red heart' },
    { w: 'tooth', e: 'Tooth' }, { w: 'phone', e: 'Telephone' }, { w: 'radio', e: 'Radio' }, { w: 'watch', e: 'Watch' },
    { w: 'spoon', e: 'Spoon' }, { w: 'honey', e: 'Honey pot' }, { w: 'juice', e: 'Beverage box', g: 'cup' }, { w: 'salad', e: 'Green salad' },
    { w: 'chick', e: 'Baby chick', g: 'chick' }, { w: 'shell', e: 'Spiral shell' }, { w: 'globe', e: 'Globe showing americas' }, { w: 'beach', e: 'Beach with umbrella' },
    // 6글자
    { w: 'rabbit', e: 'Rabbit' }, { w: 'monkey', e: 'Monkey', g: 'ape' }, { w: 'turtle', e: 'Turtle' }, { w: 'parrot', e: 'Parrot' },
    { w: 'spider', e: 'Spider' }, { w: 'beetle', e: 'Beetle', g: 'bug' }, { w: 'turkey', e: 'Turkey', g: 'chick' }, { w: 'donkey', e: 'Donkey', g: 'horse' },
    { w: 'lizard', e: 'Lizard' }, { w: 'dragon', e: 'Dragon' }, { w: 'shrimp', e: 'Shrimp' }, { w: 'banana', e: 'Banana' },
    { w: 'cherry', e: 'Cherries' }, { w: 'carrot', e: 'Carrot' }, { w: 'potato', e: 'Potato' }, { w: 'tomato', e: 'Tomato' },
    { w: 'pepper', e: 'Bell pepper' }, { w: 'garlic', e: 'Garlic' }, { w: 'cookie', e: 'Cookie' }, { w: 'waffle', e: 'Waffle' },
    { w: 'cheese', e: 'Cheese wedge' }, { w: 'rocket', e: 'Rocket' }, { w: 'planet', e: 'Ringed planet' }, { w: 'cactus', e: 'Cactus' },
    { w: 'flower', e: 'Tulip', g: 'flower' }, { w: 'guitar', e: 'Guitar' }, { w: 'violin', e: 'Violin' }, { w: 'pencil', e: 'Pencil', g: 'pen' },
    { w: 'crayon', e: 'Crayon', g: 'pen' }, { w: 'candle', e: 'Candle' }, { w: 'basket', e: 'Basket' }, { w: 'bucket', e: 'Bucket' },
    { w: 'ladder', e: 'Ladder' }, { w: 'hammer', e: 'Hammer' }, { w: 'magnet', e: 'Magnet' }, { w: 'ticket', e: 'Admission tickets' },
    { w: 'camera', e: 'Camera' }, { w: 'castle', e: 'Castle' }, { w: 'school', e: 'School' }, { w: 'window', e: 'Window' },
    { w: 'anchor', e: 'Anchor' }, { w: 'trophy', e: 'Trophy' }, { w: 'puzzle', e: 'Puzzle piece' }, { w: 'sponge', e: 'Sponge' },
    { w: 'toilet', e: 'Toilet' }, { w: 'mirror', e: 'Mirror' }, { w: 'gloves', e: 'Gloves' }, { w: 'feather', e: 'Feather' },
    // 7글자 이상
    { w: 'giraffe', e: 'Giraffe' }, { w: 'penguin', e: 'Penguin' }, { w: 'dolphin', e: 'Dolphin' }, { w: 'octopus', e: 'Octopus' },
    { w: 'hamster', e: 'Hamster', g: 'mouse' }, { w: 'chicken', e: 'Chicken', g: 'chick' }, { w: 'rooster', e: 'Rooster', g: 'chick' }, { w: 'elephant', e: 'Elephant' },
    { w: 'kangaroo', e: 'Kangaroo' }, { w: 'flamingo', e: 'Flamingo' }, { w: 'butterfly', e: 'Butterfly' }, { w: 'hedgehog', e: 'Hedgehog' },
    { w: 'crocodile', e: 'Crocodile' }, { w: 'raccoon', e: 'Raccoon' }, { w: 'gorilla', e: 'Gorilla', g: 'ape' }, { w: 'peacock', e: 'Peacock' },
    { w: 'unicorn', e: 'Unicorn', g: 'horse' }, { w: 'dinosaur', e: 'T-rex' }, { w: 'jellyfish', e: 'Jellyfish' }, { w: 'ladybug', e: 'Lady beetle', g: 'bug' },
    { w: 'lobster', e: 'Lobster' }, { w: 'pumpkin', e: 'Jack-o-lantern' }, { w: 'broccoli', e: 'Broccoli', g: 'tree' }, { w: 'avocado', e: 'Avocado' },
    { w: 'coconut', e: 'Coconut' }, { w: 'pineapple', e: 'Pineapple' }, { w: 'strawberry', e: 'Strawberry' }, { w: 'watermelon', e: 'Watermelon' },
    { w: 'cucumber', e: 'Cucumber' }, { w: 'eggplant', e: 'Eggplant' }, { w: 'cupcake', e: 'Cupcake' }, { w: 'popcorn', e: 'Popcorn' },
    { w: 'pancakes', e: 'Pancakes' }, { w: 'sandwich', e: 'Sandwich' }, { w: 'hamburger', e: 'Hamburger' }, { w: 'pretzel', e: 'Pretzel' },
    { w: 'noodles', e: 'Steaming bowl' }, { w: 'rainbow', e: 'Rainbow' }, { w: 'volcano', e: 'Volcano' }, { w: 'snowman', e: 'Snowman' },
    { w: 'sunflower', e: 'Sunflower', g: 'flower' }, { w: 'mushroom', e: 'Mushroom' }, { w: 'balloon', e: 'Balloon' }, { w: 'trumpet', e: 'Trumpet' },
    { w: 'umbrella', e: 'Umbrella' }, { w: 'backpack', e: 'Backpack' }, { w: 'scissors', e: 'Scissors' }, { w: 'glasses', e: 'Glasses' },
    { w: 'tractor', e: 'Tractor' }, { w: 'bicycle', e: 'Bicycle' }, { w: 'scooter', e: 'Kick scooter' }, { w: 'helicopter', e: 'Helicopter' },
    { w: 'ambulance', e: 'Ambulance' }, { w: 'fire truck', e: 'Fire engine' }, { w: 'skateboard', e: 'Skateboard' }, { w: 'telescope', e: 'Telescope' },
    { w: 'envelope', e: 'Envelope' }, { w: 'computer', e: 'Laptop' }, { w: 'television', e: 'Television' }, { w: 'toothbrush', e: 'Toothbrush' },
    { w: 'bathtub', e: 'Bathtub' }, { w: 'teddy bear', e: 'Teddy bear' }, { w: 'snowflake', e: 'Snowflake' }, { w: 'ice cream', e: 'Soft ice cream' },
  ];
  WORDS.forEach((x) => { x.file = x.w.replace(/ /g, '-'); x.len = x.w.replace(/ /g, '').length; });

  const PER_ROUND = 3;
  const ROUNDS = 5;
  // 레벨별 글자 수 (1: 3글자, 2: 4글자, 3: 5글자, 4: 6글자, 5: 7글자 이상, 6: 모두)
  const BANDS = [null, [3, 3], [4, 4], [5, 5], [6, 6], [7, 99], [3, 99]];
  const MAX_LEVEL = BANDS.length - 1;

  function poolFor(level) {
    const [lo, hi] = BANDS[Math.max(1, Math.min(MAX_LEVEL, level))];
    return WORDS.filter((x) => x.len >= lo && x.len <= hi);
  }

  // 한 문제(단어 3개) 고르기. seen: { 단어: 마지막으로 나온 순번 } - 한 번도 안 나왔거나 가장 오래전에 나온 단어부터.
  // skip: 이번 판에 이미 나온 단어. 같은 묶음(g)의 단어는 함께 고르지 않는다.
  function pickRound(level, seen, rand, skip) {
    const r = rand || Math.random;
    const order = poolFor(level)
      .filter((x) => !(skip && skip.has(x.w)))
      .map((x) => ({ x, k: (seen && seen[x.w] !== undefined ? seen[x.w] : -1), t: r() }))
      .sort((a, b) => a.k - b.k || a.t - b.t)
      .map((o) => o.x);
    const out = [];
    for (const x of order) {
      if (out.length === PER_ROUND) break;
      if (x.g && out.some((y) => y.g === x.g)) continue;
      out.push(x);
    }
    return out;
  }

  const Words = { WORDS, PER_ROUND, ROUNDS, MAX_LEVEL, poolFor, pickRound };
  if (typeof module !== 'undefined' && module.exports) module.exports = Words;
  else root.Words = Words;
})(typeof self !== 'undefined' ? self : this);
