/**
 * Elenchi aggiuntivi. Contengono solo i NOMI e il livello, non le descrizioni:
 * - ROGUE_TRICKS: spell del Ladro, letta dal documento Rogue (capitolo 3), divisa per livello 1-7 e per abilità.
 * - SHADOW_HAND: le 25 manovre della Mano d'Ombra di Tome of Battle: The Book of Nine Swords (d&d 3.5),
 *   elencate tra le spell del Mago. Il testo non è nel Drive: si cerca online.
 */
export interface ListItem {
  level: number;
  group: string;
  name: string;
}

export const ROGUE_TRICKS: ListItem[] = [
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "accelerated movement"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "catfall"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "catsfeet"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "feather step"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "grace"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "rooftop strider"
 },
 {
  "level": 1,
  "group": "Acrobatics",
  "name": "stand"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "branch to branch"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "expeditious retreat"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "handy grapnel"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "jump"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "monkey fish"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "quickswim"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "swift expeditious retreat"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "spider climb"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "swim"
 },
 {
  "level": 1,
  "group": "Athletics",
  "name": "touch of the sea"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "bane"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "lesser compelling question"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "delusional pride"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "distract"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "innocence"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "insightful feint"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "insightful feint"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "interrogation"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "message"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "persuasive goad"
 },
 {
  "level": 1,
  "group": "Bluff",
  "name": "unwitting ally"
 },
 {
  "level": 1,
  "group": "Craft (Alchemy)",
  "name": "bomber’s eye"
 },
 {
  "level": 1,
  "group": "Craft (Alchemy)",
  "name": "flare burst"
 },
 {
  "level": 1,
  "group": "Craft (Toxicology)",
  "name": "detect poison"
 },
 {
  "level": 1,
  "group": "Craft (Toxicology)",
  "name": "extract drug"
 },
 {
  "level": 1,
  "group": "Craft (Toxicology)",
  "name": "quick sober"
 },
 {
  "level": 1,
  "group": "Diplomacy",
  "name": "bless"
 },
 {
  "level": 1,
  "group": "Diplomacy",
  "name": "charm person"
 },
 {
  "level": 1,
  "group": "Diplomacy",
  "name": "friendly face"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "damp powder"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "detect secret doors"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "hold portal"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "instant locksmith"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "jury-rig"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "peacebond"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "safe search"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "understand object"
 },
 {
  "level": 1,
  "group": "Disable Device",
  "name": "weaken powder"
 },
 {
  "level": 1,
  "group": "Endurance",
  "name": "blissful sleep"
 },
 {
  "level": 1,
  "group": "Endurance",
  "name": "invigorate"
 },
 {
  "level": 1,
  "group": "Endurance",
  "name": "remove sickness"
 },
 {
  "level": 1,
  "group": "Endurance",
  "name": "vigor"
 },
 {
  "level": 1,
  "group": "Escape Artist",
  "name": "liberating command"
 },
 {
  "level": 1,
  "group": "Escape Artist",
  "name": "protection from possession"
 },
 {
  "level": 1,
  "group": "Escape Artist",
  "name": "remove paralysis"
 },
 {
  "level": 1,
  "group": "Knowledge (Linguistics)",
  "name": "comprehend languages"
 },
 {
  "level": 1,
  "group": "Knowledge (Linguistics)",
  "name": "erase"
 },
 {
  "level": 1,
  "group": "Knowledge (Linguistics)",
  "name": "vocal alteration"
 },
 {
  "level": 1,
  "group": "Knowledge (Lore)",
  "name": "appraising touch"
 },
 {
  "level": 1,
  "group": "Knowledge (Lore)",
  "name": "identify"
 },
 {
  "level": 1,
  "group": "Knowledge (Lore)",
  "name": "object loresight"
 },
 {
  "level": 1,
  "group": "Knowledge (the Planes)",
  "name": "detect undead"
 },
 {
  "level": 1,
  "group": "Knowledge (Warfare)",
  "name": "phantom threat"
 },
 {
  "level": 1,
  "group": "Knowledge (Warfare)",
  "name": "tactical acumen"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "alarm"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "instant search"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "longshot"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "seeker"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "sniper’s shot"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "true strike"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "unerring weapon"
 },
 {
  "level": 1,
  "group": "Perception",
  "name": "vigilant slumber"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "combined talent"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "cultural adaptation"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "disguise self"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "Elina’s wardrobe"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "haunted fey aspect"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "illusion of calm"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "hypnotism"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "lock gaze"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "ventriloquism"
 },
 {
  "level": 1,
  "group": "Perform (Acting)",
  "name": "vocal alteration"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "animate rope"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "cheat"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "mage hand"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "mirror strike"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "prestidigitation"
 },
 {
  "level": 1,
  "group": "Sleight of Hand",
  "name": "shadow weapon"
 },
 {
  "level": 1,
  "group": "Spellcraft",
  "name": "detect magic"
 },
 {
  "level": 1,
  "group": "Spellcraft",
  "name": "hex ward"
 },
 {
  "level": 1,
  "group": "Spellcraft",
  "name": "magic aura"
 },
 {
  "level": 1,
  "group": "Stealth",
  "name": "mask dweomer"
 },
 {
  "level": 1,
  "group": "Stealth",
  "name": "obscure object"
 },
 {
  "level": 1,
  "group": "Stealth",
  "name": "relative identity"
 },
 {
  "level": 1,
  "group": "Stealth",
  "name": "remove scent"
 },
 {
  "level": 1,
  "group": "Stealth",
  "name": "vanish"
 },
 {
  "level": 1,
  "group": "Streetwise",
  "name": "locate city"
 },
 {
  "level": 1,
  "group": "Survival",
  "name": "endure elements"
 },
 {
  "level": 1,
  "group": "Survival",
  "name": "marked man"
 },
 {
  "level": 2,
  "group": "Any",
  "name": "immediate assistance"
 },
 {
  "level": 2,
  "group": "Acrobatics",
  "name": "balancing lorecall"
 },
 {
  "level": 2,
  "group": "Acrobatics",
  "name": "cat’s grace"
 },
 {
  "level": 2,
  "group": "Acrobatics",
  "name": "water walking"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "champion swimmer"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "certain grip"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "lesser celerity"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "slipstream"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "speed swim"
 },
 {
  "level": 2,
  "group": "Athletics",
  "name": "wall walker"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "alibi"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "cause fear"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "detect anxieties"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "detect desires"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "detect thoughts"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "distract assailant"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "hidden speech"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "incite"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "private conversation"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "qualm"
 },
 {
  "level": 2,
  "group": "Bluff",
  "name": "shock and awe"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "alchemical allocation"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "dust of twilight"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "fire breath"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "fog cloud"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "glitterdust"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "grease"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "pyrotechnics"
 },
 {
  "level": 2,
  "group": "Craft (Alchemy)",
  "name": "sound burst"
 },
 {
  "level": 2,
  "group": "Craft (Construction)",
  "name": "break"
 },
 {
  "level": 2,
  "group": "Craft (Fine Arts)",
  "name": "create treasure map"
 },
 {
  "level": 2,
  "group": "Craft (Fine Arts)",
  "name": "silent image"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "accelerate poison"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "memory lapse"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "pernicious poison"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "touch injection"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "toxic gift"
 },
 {
  "level": 2,
  "group": "Craft (Toxicology)",
  "name": "transmute potion to poison"
 },
 {
  "level": 2,
  "group": "Diplomacy",
  "name": "build trust"
 },
 {
  "level": 2,
  "group": "Diplomacy",
  "name": "eagle’s splendor"
 },
 {
  "level": 2,
  "group": "Diplomacy",
  "name": "honeyed tongue"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "arcane lock"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "destabilize powder"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "knock"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "recoil fire"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "snare"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "stabilize powder"
 },
 {
  "level": 2,
  "group": "Disable Device",
  "name": "thunder fire"
 },
 {
  "level": 2,
  "group": "Endurance",
  "name": "bear’s endurance"
 },
 {
  "level": 2,
  "group": "Escape Artist",
  "name": "cushioning bands"
 },
 {
  "level": 2,
  "group": "Escape Artist",
  "name": "surmount affliction"
 },
 {
  "level": 2,
  "group": "Knowledge (Linguistics)",
  "name": "codespeak"
 },
 {
  "level": 2,
  "group": "Knowledge (Linguistics)",
  "name": "litany of eloquence"
 },
 {
  "level": 2,
  "group": "Knowledge (Lore)",
  "name": "fool’s gold"
 },
 {
  "level": 2,
  "group": "Knowledge (Lore)",
  "name": "fox’s cunning"
 },
 {
  "level": 2,
  "group": "Knowledge (Lore)",
  "name": "know value"
 },
 {
  "level": 2,
  "group": "Knowledge (Lore)",
  "name": "object reading"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "acute senses"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "critical aim"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "guided shot"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "keen senses"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "listening lorecall"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "owl’s wisdom"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "scent"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "see invisibility"
 },
 {
  "level": 2,
  "group": "Perception",
  "name": "sniper’s eye"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "compel hostility"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "disguise other"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "ghostly disguise"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "imbue with aura"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "misdirection"
 },
 {
  "level": 2,
  "group": "Perform (Acting)",
  "name": "miserable pity"
 },
 {
  "level": 2,
  "group": "Profession (Sailing)",
  "name": "stormrunner’s ward"
 },
 {
  "level": 2,
  "group": "Profession (Sailing)",
  "name": "swift water"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "abundant ammunition"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "pilfering hand"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "reloading hands"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "returning weapon"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "ricochet shot"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "silk to steel"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "summon weapon"
 },
 {
  "level": 2,
  "group": "Sleight of Hand",
  "name": "wracking touch"
 },
 {
  "level": 2,
  "group": "Spellcraft",
  "name": "bypass ward"
 },
 {
  "level": 2,
  "group": "Spellcraft",
  "name": "dispel wards"
 },
 {
  "level": 2,
  "group": "Spellcraft",
  "name": "Enkiki’s prank"
 },
 {
  "level": 2,
  "group": "Stealth",
  "name": "invisibility"
 },
 {
  "level": 2,
  "group": "Stealth",
  "name": "rogue’s stab"
 },
 {
  "level": 2,
  "group": "Stealth",
  "name": "sudden blur"
 },
 {
  "level": 2,
  "group": "Streetwise",
  "name": "summon swarm"
 },
 {
  "level": 3,
  "group": "Acrobatics",
  "name": "burst of speed"
 },
 {
  "level": 3,
  "group": "Acrobatics",
  "name": "shadowslip"
 },
 {
  "level": 3,
  "group": "Athletics",
  "name": "champion swimmer"
 },
 {
  "level": 3,
  "group": "Athletics",
  "name": "haste"
 },
 {
  "level": 3,
  "group": "Bluff",
  "name": "glibness"
 },
 {
  "level": 3,
  "group": "Bluff",
  "name": "inevitable defeat"
 },
 {
  "level": 3,
  "group": "Bluff",
  "name": "instrument of agony"
 },
 {
  "level": 3,
  "group": "Bluff",
  "name": "vital strike"
 },
 {
  "level": 3,
  "group": "Craft (Alchemy)",
  "name": "amplify elixir"
 },
 {
  "level": 3,
  "group": "Craft (Alchemy)",
  "name": "fundamental breakdown"
 },
 {
  "level": 3,
  "group": "Craft (Toxicology)",
  "name": "rusted blade"
 },
 {
  "level": 3,
  "group": "Craft (Toxicology)",
  "name": "spit venom"
 },
 {
  "level": 3,
  "group": "Diplomacy",
  "name": "good hope"
 },
 {
  "level": 3,
  "group": "Diplomacy",
  "name": "suggestion"
 },
 {
  "level": 3,
  "group": "Disable Device",
  "name": "disable construct"
 },
 {
  "level": 3,
  "group": "Disable Device",
  "name": "malfunction"
 },
 {
  "level": 3,
  "group": "Endurance",
  "name": "lesser age resistance"
 },
 {
  "level": 3,
  "group": "Endurance",
  "name": "nap stack"
 },
 {
  "level": 3,
  "group": "Escape Artist",
  "name": "resinous skin"
 },
 {
  "level": 3,
  "group": "Heal",
  "name": "healing thief"
 },
 {
  "level": 3,
  "group": "Knowledge (Linguistics)",
  "name": "enthrall"
 },
 {
  "level": 3,
  "group": "Knowledge (Linguistics)",
  "name": "tongues"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "clairaudience/clairvoyance"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "deathsight"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "find the gap"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "hunter’s eye"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "litany of sight"
 },
 {
  "level": 3,
  "group": "Perception",
  "name": "locate weakness"
 },
 {
  "level": 3,
  "group": "Perform (Acting)",
  "name": "aura of the unremarkable"
 },
 {
  "level": 3,
  "group": "Perform (Acting)",
  "name": "screech"
 },
 {
  "level": 3,
  "group": "Perform (Acting)",
  "name": "veil of lust"
 },
 {
  "level": 3,
  "group": "Profession (Sailing)",
  "name": "billowed sail"
 },
 {
  "level": 3,
  "group": "Profession (Sailing)",
  "name": "wake trailing"
 },
 {
  "level": 3,
  "group": "Sleight of Hand",
  "name": "absorbing touch"
 },
 {
  "level": 3,
  "group": "Sleight of Hand",
  "name": "shadow cache"
 },
 {
  "level": 3,
  "group": "Sleight of Hand",
  "name": "shrink item"
 },
 {
  "level": 3,
  "group": "Spellcraft",
  "name": "arcane sight"
 },
 {
  "level": 3,
  "group": "Spellcraft",
  "name": "dispel magic"
 },
 {
  "level": 3,
  "group": "Stealth",
  "name": "assassin’s stance"
 },
 {
  "level": 3,
  "group": "Stealth",
  "name": "dead end"
 },
 {
  "level": 3,
  "group": "Stealth",
  "name": "nondetection"
 },
 {
  "level": 3,
  "group": "Stealth",
  "name": "swift displacement"
 },
 {
  "level": 3,
  "group": "Stealth",
  "name": "swift invisibility"
 },
 {
  "level": 3,
  "group": "Streetwise",
  "name": "enduring scrutiny"
 },
 {
  "level": 3,
  "group": "Streetwise",
  "name": "winding alleys"
 },
 {
  "level": 4,
  "group": "Acrobatics",
  "name": "shadow step"
 },
 {
  "level": 4,
  "group": "Athletics",
  "name": "heart of water"
 },
 {
  "level": 4,
  "group": "Athletics",
  "name": "ride the waves"
 },
 {
  "level": 4,
  "group": "Bluff",
  "name": "aura of doom"
 },
 {
  "level": 4,
  "group": "Bluff",
  "name": "battlemind link"
 },
 {
  "level": 4,
  "group": "Bluff",
  "name": "discern lies"
 },
 {
  "level": 4,
  "group": "Bluff",
  "name": "greater interrogation"
 },
 {
  "level": 4,
  "group": "Craft (Alchemy)",
  "name": "firefall"
 },
 {
  "level": 4,
  "group": "Craft (Alchemy)",
  "name": "solid fog"
 },
 {
  "level": 4,
  "group": "Craft (Fine Art)",
  "name": "tattoo item"
 },
 {
  "level": 4,
  "group": "Craft (Tailor)",
  "name": "treasure stitching"
 },
 {
  "level": 4,
  "group": "Craft (Toxicology)",
  "name": "absorb toxicity"
 },
 {
  "level": 4,
  "group": "Craft (Toxicology)",
  "name": "Melf’s slumber arrows"
 },
 {
  "level": 4,
  "group": "Craft (Toxicology)",
  "name": "neutralize poison"
 },
 {
  "level": 4,
  "group": "Craft (Toxicology)",
  "name": "poison"
 },
 {
  "level": 4,
  "group": "Diplomacy",
  "name": "charm monster"
 },
 {
  "level": 4,
  "group": "Diplomacy",
  "name": "control summoned creature"
 },
 {
  "level": 4,
  "group": "Diplomacy",
  "name": "denounce"
 },
 {
  "level": 4,
  "group": "Diplomacy",
  "name": "mass charm person"
 },
 {
  "level": 4,
  "group": "Diplomacy",
  "name": "mass charm person"
 },
 {
  "level": 4,
  "group": "Endurance",
  "name": "age resistance"
 },
 {
  "level": 4,
  "group": "Escape Artist",
  "name": "freedom of movement"
 },
 {
  "level": 4,
  "group": "Escape Artist",
  "name": "primal scream"
 },
 {
  "level": 4,
  "group": "Heal",
  "name": "cursed blade"
 },
 {
  "level": 4,
  "group": "Knowledge (as appropriate for creature type)",
  "name": "named bullet"
 },
 {
  "level": 4,
  "group": "Knowledge (Linguistics)",
  "name": "fool’s speech"
 },
 {
  "level": 4,
  "group": "Perception",
  "name": "detect scrying"
 },
 {
  "level": 4,
  "group": "Perception",
  "name": "echolocation"
 },
 {
  "level": 4,
  "group": "Perform (Dance)",
  "name": "dance of a hundred cuts"
 },
 {
  "level": 4,
  "group": "Planar Sense",
  "name": "mirror safe"
 },
 {
  "level": 4,
  "group": "Profession (Sailing)",
  "name": "detect ship"
 },
 {
  "level": 4,
  "group": "Profession (Sailing)",
  "name": "disguise ship"
 },
 {
  "level": 4,
  "group": "Profession (Sailing)",
  "name": "favorable wind"
 },
 {
  "level": 4,
  "group": "Profession (Sailing)",
  "name": "mystic anchor"
 },
 {
  "level": 4,
  "group": "Sleight of Hand",
  "name": "death blade"
 },
 {
  "level": 4,
  "group": "Spellcraft",
  "name": "arcana theft"
 },
 {
  "level": 4,
  "group": "Spellcraft",
  "name": "curse of magic negation"
 },
 {
  "level": 4,
  "group": "Spellcraft",
  "name": "ghostdweomer"
 },
 {
  "level": 4,
  "group": "Stealth",
  "name": "greater invisibility"
 },
 {
  "level": 4,
  "group": "Stealth",
  "name": "shadow form"
 },
 {
  "level": 4,
  "group": "Streetwise",
  "name": "locate person"
 },
 {
  "level": 5,
  "group": "Bluff",
  "name": "mind fog"
 },
 {
  "level": 5,
  "group": "Craft (Toxicology)",
  "name": "cloudkill"
 },
 {
  "level": 5,
  "group": "Diplomacy",
  "name": "adoring crowd"
 },
 {
  "level": 5,
  "group": "Disable Device",
  "name": "symbol of striking"
 },
 {
  "level": 5,
  "group": "Endurance",
  "name": "greater age resistance"
 },
 {
  "level": 5,
  "group": "Escape Artist",
  "name": "break enchantment"
 },
 {
  "level": 5,
  "group": "Escape Artist",
  "name": "swift etherealness"
 },
 {
  "level": 5,
  "group": "Knowledge (Lore)",
  "name": "contact other plane"
 },
 {
  "level": 5,
  "group": "Perception",
  "name": "true seeing"
 },
 {
  "level": 5,
  "group": "Perform (Acting)",
  "name": "false vision"
 },
 {
  "level": 5,
  "group": "Perform (Acting)",
  "name": "maligned performance"
 },
 {
  "level": 5,
  "group": "Perform (Acting)",
  "name": "seeming"
 },
 {
  "level": 5,
  "group": "Profession (Sailing)",
  "name": "ship snare"
 },
 {
  "level": 5,
  "group": "Sleight of Hand",
  "name": "telekinesis"
 },
 {
  "level": 5,
  "group": "Sleight of Hand",
  "name": "wreath of blades"
 },
 {
  "level": 5,
  "group": "Spellcraft",
  "name": "thief of spells"
 },
 {
  "level": 5,
  "group": "Stealth",
  "name": "mislead"
 },
 {
  "level": 5,
  "group": "Stealth",
  "name": "unseen strike"
 },
 {
  "level": 5,
  "group": "Streetwise",
  "name": "commune with city"
 },
 {
  "level": 6,
  "group": "Acrobatics",
  "name": "air walk"
 },
 {
  "level": 6,
  "group": "Athletics",
  "name": "cloak of the sea"
 },
 {
  "level": 6,
  "group": "Bluff",
  "name": "greater incite"
 },
 {
  "level": 6,
  "group": "Craft (Toxicology)",
  "name": "euphoric tranquility"
 },
 {
  "level": 6,
  "group": "Diplomacy",
  "name": "aura of trust"
 },
 {
  "level": 6,
  "group": "Diplomacy",
  "name": "mass suggestion"
 },
 {
  "level": 6,
  "group": "Escape Artist",
  "name": "phase door"
 },
 {
  "level": 6,
  "group": "Knowledge (Linguistics)",
  "name": "speak with monsters"
 },
 {
  "level": 6,
  "group": "Knowledge (Linguistics)",
  "name": "suppress glyph"
 },
 {
  "level": 6,
  "group": "Knowledge (Linguistics)",
  "name": "transcribe symbol"
 },
 {
  "level": 6,
  "group": "Knowledge (Lore)",
  "name": "legend lore"
 },
 {
  "level": 6,
  "group": "Perform (Dance)",
  "name": "dance of a thousand cuts"
 },
 {
  "level": 6,
  "group": "Perform (Dance)",
  "name": "dance of seduction"
 },
 {
  "level": 6,
  "group": "Planar Sense",
  "name": "gate seal"
 },
 {
  "level": 6,
  "group": "Sleight of Hand",
  "name": "animate objects"
 },
 {
  "level": 6,
  "group": "Sleight of Hand",
  "name": "instant summons"
 },
 {
  "level": 6,
  "group": "Sleight of Hand",
  "name": "wraithstrike"
 },
 {
  "level": 6,
  "group": "Spellcraft",
  "name": "analyze dweomer"
 },
 {
  "level": 6,
  "group": "Spellcraft",
  "name": "greater dispel magic"
 },
 {
  "level": 6,
  "group": "Streetwise",
  "name": "city stride"
 },
 {
  "level": 6,
  "group": "Streetwise",
  "name": "incite riot"
 },
 {
  "level": 7,
  "group": "Bluff",
  "name": "expend"
 },
 {
  "level": 7,
  "group": "Bluff",
  "name": "mind blank"
 },
 {
  "level": 7,
  "group": "Craft (Alchemy)",
  "name": "incendiary cloud"
 },
 {
  "level": 7,
  "group": "Diplomacy",
  "name": "charm’s aegis"
 },
 {
  "level": 7,
  "group": "Diplomacy",
  "name": "marks of forbiddance"
 },
 {
  "level": 7,
  "group": "Diplomacy",
  "name": "mass charm monster"
 },
 {
  "level": 7,
  "group": "Escape Artist",
  "name": "etherealness"
 },
 {
  "level": 7,
  "group": "Escape Artist",
  "name": "freedom"
 },
 {
  "level": 7,
  "group": "Escape Artist",
  "name": "passwall"
 },
 {
  "level": 7,
  "group": "Knowledge (as appropriate for creature type)",
  "name": "greater named bullet"
 },
 {
  "level": 7,
  "group": "Knowledge (Linguistics)",
  "name": "power word stun"
 },
 {
  "level": 7,
  "group": "Knowledge (Lore)",
  "name": "vision"
 },
 {
  "level": 7,
  "group": "Knowledge (the Planes)",
  "name": "soul bind"
 },
 {
  "level": 7,
  "group": "Perception",
  "name": "deathsight"
 },
 {
  "level": 7,
  "group": "Perform (Acting)",
  "name": "project image"
 },
 {
  "level": 7,
  "group": "Perform (Acting)",
  "name": "veil"
 },
 {
  "level": 7,
  "group": "Spellcraft",
  "name": "control construct"
 },
 {
  "level": 7,
  "group": "Spellcraft",
  "name": "greater arcane sight"
 },
 {
  "level": 7,
  "group": "Spellcraft",
  "name": "mage’s disjunction"
 },
 {
  "level": 7,
  "group": "Stealth",
  "name": "superior invisibility"
 },
 {
  "level": 7,
  "group": "Streetwise",
  "name": "city transport"
 }
];

export const SHADOW_HAND: ListItem[] = [
 {
  "level": 1,
  "group": "Mano d'Ombra",
  "name": "Child of Shadow"
 },
 {
  "level": 1,
  "group": "Mano d'Ombra",
  "name": "Clinging Shadow Strike"
 },
 {
  "level": 1,
  "group": "Mano d'Ombra",
  "name": "Island of Blades"
 },
 {
  "level": 1,
  "group": "Mano d'Ombra",
  "name": "Shadow Blade Technique"
 },
 {
  "level": 2,
  "group": "Mano d'Ombra",
  "name": "Cloak of Deception"
 },
 {
  "level": 2,
  "group": "Mano d'Ombra",
  "name": "Drain Vitality"
 },
 {
  "level": 2,
  "group": "Mano d'Ombra",
  "name": "Shadow Jaunt"
 },
 {
  "level": 3,
  "group": "Mano d'Ombra",
  "name": "Assassin's Stance"
 },
 {
  "level": 3,
  "group": "Mano d'Ombra",
  "name": "Dance of the Spider"
 },
 {
  "level": 3,
  "group": "Mano d'Ombra",
  "name": "Shadow Garrotte"
 },
 {
  "level": 3,
  "group": "Mano d'Ombra",
  "name": "Strength Draining Strike"
 },
 {
  "level": 4,
  "group": "Mano d'Ombra",
  "name": "Hand of Death"
 },
 {
  "level": 4,
  "group": "Mano d'Ombra",
  "name": "Obscuring Shadow Veil"
 },
 {
  "level": 5,
  "group": "Mano d'Ombra",
  "name": "Bloodletting Strike"
 },
 {
  "level": 5,
  "group": "Mano d'Ombra",
  "name": "Shadow Stride"
 },
 {
  "level": 5,
  "group": "Mano d'Ombra",
  "name": "Step of the Dancing Moth"
 },
 {
  "level": 6,
  "group": "Mano d'Ombra",
  "name": "Ghost Blade"
 },
 {
  "level": 6,
  "group": "Mano d'Ombra",
  "name": "Shadow Noose"
 },
 {
  "level": 6,
  "group": "Mano d'Ombra",
  "name": "Stalker in the Night"
 },
 {
  "level": 7,
  "group": "Mano d'Ombra",
  "name": "Death in the Dark"
 },
 {
  "level": 7,
  "group": "Mano d'Ombra",
  "name": "Shadow Blink"
 },
 {
  "level": 8,
  "group": "Mano d'Ombra",
  "name": "Balance on the Sky"
 },
 {
  "level": 8,
  "group": "Mano d'Ombra",
  "name": "Enervating Shadow Strike"
 },
 {
  "level": 8,
  "group": "Mano d'Ombra",
  "name": "One with Shadow"
 },
 {
  "level": 9,
  "group": "Mano d'Ombra",
  "name": "Five-Shadow Creeping Ice Enervation Strike"
 }
];

/** Ricerca online, per le spell non presenti nel Drive (Pathfinder 1e o D&D 3.5). */
export function onlineUrl(name: string, suffix: string): string {
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${name} ${suffix}`);
}
