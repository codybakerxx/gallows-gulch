# builds test/s134.json: v32, the getaway's run can always be ridden clean. 300 courses (the game's own generator, seed by seed) searched
# frame by frame for a way through with no hit at all: exactly as the game has it; with a horse 12 cm wider either side and 40 cm longer at
# each end; with lane changes and jumps only every 0.1 s; with both; and with both and only every 0.15 s. Also the most of each kind of
# obstacle a course has out at once, against what the game keeps (if it ran short, a row would come out with something missing). v34: the
# run is flat out from the start, and no row may be free (ridden through without a swipe or a jump): freeRows must be 0. v35: every row
# needs a swipe (a jump alone won't do): stillRows must be 0 too. twoLane: rows whose only way on is two lanes across
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
steps = [["click", "#startBtn"], ["wait", 1500]]
E = lambda js: steps.append(["eval", js])
E(open(os.path.join(HERE, "chase_helpers.js")).read())
E(open(os.path.join(HERE, "course_solver.js")).read())
E("""(async () => { startGetaway(); await __go(300, () => CHASE.state === 'ride'); return CHASE.state; })()""")
for name, opt in [("exact", {}), ("bigger horse", {"wide": 0.12, "long": 0.4}), ("actions every 0.1 s", {"every": 6}), ("both", {"wide": 0.12, "long": 0.4, "every": 6}),
                  ("both, every 0.15 s", {"wide": 0.12, "long": 0.4, "every": 9})]:
    E(f"""(() => {{ const seeds = []; for (let i = 1; i <= 300; i++) seeds.push(i * 7919 % 233280); const r = __courses(seeds, {json.dumps(opt)});
      return {json.dumps(name)} + ' ' + JSON.stringify({{ courses: r.seeds, fails: r.fails.length, sample: r.fails.slice(0, 3), rows: [r.minRowsPerCourse, r.maxRowsPerCourse], freeRows: r.freeRows, freeSample: r.freeSample, stillRows: r.stillRows, stillSample: r.stillSample, twoLane: r.swipeRows, rowsAll: r.rows, jumpRows: r.jumpRows, mostAtOnce: r.pool, kept: r.kept }}); }})()""")
json.dump(steps, open("test/s134.json", "w"), indent=0)
print(len(steps), "steps")
