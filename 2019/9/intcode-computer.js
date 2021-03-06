const ADD = '01'; // Add
const MUL = '02'; // Multiply
const INP = '03'; // Input
const OUT = '04'; // Output
const JIT = '05'; // Jump-if-true
const JIF = '06'; // Jump-if-false
const LTH = '07'; // Less Than
const EQU = '08'; // Equals
const ARB = '09'; // Adjust relative base
const STP = '99'; // Stop

const POSITION_MODE = '0';
const IMMEDIATE_MODE = '1';
const RELATIVE_MODE = '2';

class Computer {
	constructor(memory, inputs, pause_on_output = true, id = 0, clone_memory = false) {
		// For debugging
		this.id = String.fromCharCode('A'.charCodeAt(0) + id);

		this.original_memory = clone_memory && memory.slice(0);
		this.memory = memory.slice(0);
		this.pointer = 0;
		this.relative_base = 0;
		this.pause_on_output = pause_on_output;

		this.inputs = Array.isArray(inputs) ? inputs.slice(0) : [inputs];
		this.outputs = [];

		this.OPS = {
			[ADD]: {
				name: ADD,
				realName: 'ADD',
				params: 3,
				fn: (a, b, c) => {
					this.memory[c] = a + b;
				},
				write: true,
			},

			[MUL]: {
				name: MUL,
				realName: 'MUL',
				params: 3,
				fn: (a, b, c) => {
					this.memory[c] = a * b;
				},
				write: true,
			},

			[INP]: {
				name: INP,
				realName: 'INP',
				params: 1,
				fn: a => {
					this.memory[a] = this.inputs.shift();
				},
				write: true,
			},

			[OUT]: {
				name: OUT,
				realName: 'OUT',
				params: 1,
				fn: a => this.output(a),
			},

			[ARB]: {
				name: ARB,
				realName: 'ARB',
				params: 1,
				fn: a => (this.relative_base += a),
			},

			[STP]: {
				name: STP,
				realName: 'STP',
				params: 0,
				fn: () => (this.halted = true),
			},

			[JIT]: {
				name: JIT,
				realName: 'JIT',
				params: 2,
				fn: (a, b) => {
					if (a) {
						this.pointer = b;
						return true;
					}
					return false;
				},
				jumps: true,
			},

			[JIF]: {
				name: JIF,
				realName: 'JIF',
				params: 2,
				fn: (a, b) => {
					if (!a) {
						this.pointer = b;
						return true;
					}
					return false;
				},
				jumps: true,
			},

			[LTH]: {
				name: LTH,
				realName: 'LTH',
				params: 3,
				fn: (a, b, c) => {
					this.memory[c] = a < b ? 1 : 0;
				},
				write: true,
			},

			[EQU]: {
				name: EQU,
				realName: 'EQU',
				params: 3,
				fn: (a, b, c) => {
					this.memory[c] = a === b ? 1 : 0;
				},
				write: true,
			},
		};

		this.halted = false;
	}

	run() {
		let op = this.parseOp();

		while (!this.halted) {
			this.runOp(op);

			/**
			 * In circuits, computer execution should be paused on outout so that value can be passed to the next computer.
			 * Additionally, execution should immediately stopped if we have halted.
			 */
			if ((this.pause_on_output && op.name === OUT) || this.halted) {
				break;
			}

			op = this.parseOp();
		}

		return this.outputs;
	}

	parseOp() {
		let temp_op = String(this.memory[this.pointer]).padStart(2, '0');

		// "The opcode is a two-digit number based only on the ones and tens digit of the value, that is, the opcode is the rightmost two digits of the first value in an instruction"
		let op = this.OPS[temp_op.substr(-2, 2)];

		let full_op = temp_op.padStart(op.params + 2, '0');

		let modes = [];

		// "Parameter modes are single digits, one per parameter, read **right-to-left** from the opcode"
		for (let i = op.params - 1; i >= 0; i--) {
			modes.push(full_op[i]);
		}

		return {
			...op,
			modes,
		};
	}

	runOp({ modes, fn, jumps, write }) {
		this.pointer++;
		let values = [];
		for (let i = 0; i < modes.length; i++) {
			let mode = modes[i];
			let value = this.memory[this.pointer + i];

			// Values can overflow existing memory. If so, value should be 0
			if (value === undefined) {
				value = 0;
			}

			// Immediate Mode uses the value as is, no need to make adjustments
			if (mode !== IMMEDIATE_MODE) {
				/**
				 * While working in Position or Relative Mode, it is (at first)
				 * unituitive why I need to _skip_ the value re-mapping if we
				 * are at the _last_ value to calculate.
				 *
				 * Consider the ADD operation `1001,9,8,7`.
				 *
				 * Parsing this out gives us:
				 *
				 *     ABCDE
				 *      1001
				 *     
				 *     DE - two-digit opcode,      01 == opcode 1
				 *      C - mode of 1st parameter,  0 == position mode
				 *      B - mode of 2nd parameter,  1 == immediate mode
				 *      A - mode of 3rd parameter,  0 == position mode,
				 *                                  omitted due to being a leading zero
				 *
				 * If I were to write this addition operation as a standard made equation,
				 * where number literals (immediate mode) are written as the number, and
				 * position numbers are written with a prefixed `@` symbol, the equation
				 * might look like
				 *
				 *     @3 = @1 + 2
				 *
				 * Now, if I were to re-map the pointer'd `@` symbols, I'd get
				 *
				 *     7 = 9 + 2
				 *
				 * But _that isn't what we want!_ Namely, it doesn't make sense
				 * to set the _literal_ number 7 equal to some addition operation.
				 *
				 * So, the assignment part _always_ retains its pointer aspect.
				 *
				 *     @3 = 9 + 2
				 *
				 * Because of this, when I do the re-mapping, I skip the last arugment
				 * whenever I am performing an operation that writes to memory. On operations
				 * that _don't_ write to memory, I can re-map regardless of which parameter I am
				 * inspecting.
				 *
				 * For example, on a JIT operation `5,3,4` (implicitly `0005,3,4`) on the computer
				 * `5,3,4,1001,0` would be executed as:
				 *
				 *     if @3 != 0; then Jump to @4
				 *
				 * Re-mapping these pointers to the values from memory, the code becomes
				 *
				 *     if 1001 != 0; then Jump to 0
				 *
				 * That is, even though the `@4` position parameter was the last parameter,
				 * I still performed the look up because the JIT op does _not_ write to memory.
				 *
				 * To, to recap, I want to re-map my value to the value stored in memory at
				 * a certain _position_ if:
				 *
				 * - I am running an op that does _not_ write to memory
				 * - Or if I am not at the last parameter in the op
				 */
				const can_switch_to_position = !write || i < modes.length - 1;

				if (can_switch_to_position && mode === POSITION_MODE) {
					value = this.memory[value];
				} else if (mode === RELATIVE_MODE) {
					/**
					 * In relative mode, value is always updated. However, again for the reasons
					 * above, the last parameter on operations that write to memory should only
					 * have the value adjusted by the relative base. For all other instances,
					 * the value should be looked up from memory (in a relative fashion, of course).
					 */
					if (can_switch_to_position) {
						value = this.memory[value + this.relative_base];
					} else {
						value = value + this.relative_base;
					}
				}
			}

			// After remapping (if any) again adjust to 0 if we overflowed our memory read
			if (value === undefined) {
				value = 0;
			}

			values.push(value);
		}

		// If result is `true`, we moved the pointer
		let result = fn(...values);

		if (!jumps || (jumps && !result)) {
			this.pointer += modes.length;
		}
	}

	output(v) {
		this.outputs.push(v);
	}

	// For debugging
	get _() {
		return this.memory.slice(Math.max(0, this.pointer - 1), this.pointer + 8);
	}
}

class Circuit {
	constructor(memory, phase_settings, circuit_size = 5) {
		this.memory = memory;
		this.phase_settings = phase_settings;
		this.circuit = Array(circuit_size)
			.fill()
			.map((c, i) => {
				let phase_setting = [phase_settings[i]];
				if (i === 0) {
					// "The first amplifier's input value is 0"
					phase_setting.push(0);
				}

				return new Computer(memory, phase_setting, i);
			});

		this.current_computer = 0;
	}

	run() {
		let computer = this.circuit[this.current_computer];
		let output, last_output;

		while (!computer.halted) {
			let new_output = computer.run();
			if (computer.halted) {
				break;
			}

			output = new_output;

			let next_computer = this.moveToNextComputer();

			// `output.pop` removes the value from the computers `this.outputs` array,
			// meaning the next computer effectively "consumes" the value
			last_output = output.shift();
			next_computer.inputs.push(last_output);

			computer = next_computer;
		}

		return last_output;
	}

	moveToNextComputer() {
		// Move through array in circular fashion
		this.current_computer++;
		this.current_computer %= this.circuit.length;

		return this.circuit[this.current_computer];
	}
}

module.exports = {
	Computer,
	Circuit,
};
