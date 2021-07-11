const distance = require('manhattan');

class Unit {
    constructor(type, x, y, attack = 3, hp = 200) {}
}

class MapPoint {
    constructor(type, x, y) {
        this.x = x;
        this.y = y;

        this.type = type;
        this.isWall = this.type === '#';
    }
}

class Combat {
    constructor(raw_map) {
        let map_and_units = this.parseMap(raw_map);
        this.map = map_and_units.map;
        this.units = map_and_units.units;
    }

    parseMap(raw_map) {
        let initial_map = raw_map.split('\n').map(row => row.split(''));
        let map = initial_map.map((row, y) =>
            row.map((cell, x) => new MapPoint(cell === '#' ? '#' : '.', x, y))
        );

        return {
            map,
            units,
        };
    }
}

module.exports = Combat;
