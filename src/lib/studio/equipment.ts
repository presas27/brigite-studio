/**
 * Equipment, read back out of an exercise's tags.
 *
 * The library has no equipment field: exercises carry one flat `tags` array,
 * and the Trainerize import that filled it collapsed six typed vocabularies
 * (muscle, equipment, level, mechanics, movement, force) into that one array —
 * see `scripts/trainerize/import.ts`, which lowercases each value and drops the
 * type. The equipment names below are that vocabulary, taken from the captured
 * export (`scripts/trainerize/export/library.json`, `tags[].type === "equipment"`),
 * lowercased the same way the importer lowercased them.
 *
 * So this is a filter, not a new model: a tag is equipment if the platform the
 * library came from called it equipment. A tag naming a muscle or a difficulty
 * is left where it is, and an exercise a coach typed by hand simply has no
 * equipment unless they happened to tag it with one of these words.
 */
const EQUIPMENT_TAGS: Record<string, true> = {
  balanceboard: true,
  bands: true,
  barbell: true,
  battlingrope: true,
  bench: true,
  bodyweight: true,
  bosu: true,
  box: true,
  cable: true,
  dumbbell: true,
  ezbar: true,
  foamroller: true,
  jumprope: true,
  kettlebells: true,
  lacrosseball: true,
  landmine: true,
  machine: true,
  mat: true,
  medicineball: true,
  miniband: true,
  plate: true,
  pullupbar: true,
  sandbag: true,
  sled: true,
  sliders: true,
  smithmachine: true,
  superband: true,
  suspension: true,
  swissball: true,
};

/**
 * The equipment a list of exercises calls for, in the order the exercises use
 * it and without repeats — what a coach has to have on the floor before the
 * session starts.
 */
export function equipmentOf(exercises: { tags: string[] }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const exercise of exercises) {
    for (const tag of exercise.tags) {
      if (!EQUIPMENT_TAGS[tag] || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}
