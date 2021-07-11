const distance = require('manhattan');
const input = require('./input');
// const input = require('./sample-input2');
const cloned_input = JSON.parse(JSON.stringify(input));

xs = cloned_input.map(p => p.pos[0]);
ys = cloned_input.map(p => p.pos[1]);
zs = cloned_input.map(p => p.pos[2]);

const sortNum = (a, b) => {
    if (a < b) return -1;
    else if (a > b) return 1;
    else return 0;
};

xs.sort(sortNum);
ys.sort(sortNum);
zs.sort(sortNum);

const min_x = xs[0];
const max_x = xs[xs.length - 1];

const min_y = ys[0];
const max_y = ys[ys.length - 1];

const min_z = zs[0];
const max_z = zs[zs.length - 1];

let best_coord = {
    coord: [null, null, null],
    inRangeOf: -1
};

console.log(`Running ${((max_x - min_x) * (max_y - min_y) * (max_z - min_z)).toLocaleString()}`)



for (let x = min_x; x < max_x; x++) {
    for (let y = min_y; y < max_y; y++) {
        for (let z = min_z; z < max_z; z++) {
            let coord = [x,y,z];

            let inRangeOf = 0;
            input.forEach(bot => {
                let d = distance(coord, bot.pos);
                if (d <= bot.r) {
                    inRangeOf++;
                }
            });


            if (inRangeOf > best_coord.inRangeOf) {
                console.log(`New best [${x}, ${y}, ${z}], in range of ${inRangeOf}`);

                best_coord.coord[0] = x;
                best_coord.coord[1] = y;
                best_coord.coord[2] = z;
                best_coord.inRangeOf = inRangeOf;
            }
        }
    }
}

console.log(best_coord);
console.log(distance(best_coord.coord, [0,0,0]))
