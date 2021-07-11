const distance = require('manhattan');
const input = require('./input');
const cloned_input = JSON.parse(JSON.stringify(input));

cloned_input.sort((a, b) => {
    if (a.r < b.r) return -1;
    else if (a.r > b.r) return 1;
    else return 0;
});

let largest = cloned_input[cloned_input.length - 1];

let in_range = 0;
for (let i = 0; i < input.length - 1; i++) {
    let bot = input[i];
    if (distance(bot.pos, largest.pos) <= largest.r) {
        in_range++;
    }
}

console.log(in_range);
