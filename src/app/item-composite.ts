/**
 * Oggetti composti dell'Item Compendium (Ch 6a): più parti, ognuna con il suo costo.
 * - 'formula': livello × CL × prezzo × moltiplicatore, ricalcolata dal livello indicato nel libro.
 * - 'fixed': valore che il libro stampa direttamente per quella parte (es. feat, dono, costo fisso),
 *   usato quando la formula stampata non dà lo stesso numero.
 * Il totale stampato (stated) è quello del libro. Se la somma delle parti non coincide, la pagina lo segnala.
 */

export type CompositePart =
  | { kind: 'formula'; label: string; level: number; cl: number; price: number; mult: number }
  | { kind: 'fixed'; label: string; total: number };

export interface CompositeItem {
  name: string;
  unit: 'numen' | 'gp';
  parts: CompositePart[];
  stated: number;
  note?: string;
}

export const COMPOSITE_ITEMS: CompositeItem[] = [
  { name: 'Null Blade', unit: 'numen', stated: 83600, parts: [
    { kind: 'fixed', label: '+1 bastard sword', total: 2000 },
    { kind: 'fixed', label: 'adamantine', total: 18100 },
    { kind: 'fixed', label: 'construct bane', total: 14000 },
    { kind: 'fixed', label: 'charge-activated quickened dispel magic, CL 11', total: 49500 },
  ] },
  { name: 'Holy Avenger', unit: 'numen', stated: 219000, note: 'Il libro indica 59.500 per il dispel magic (la formula darebbe 59.400).', parts: [
    { kind: 'fixed', label: '+5 arming sword', total: 50000 },
    { kind: 'fixed', label: 'cold iron', total: 3500 },
    { kind: 'fixed', label: 'holy property', total: 16000 },
    { kind: 'fixed', label: 'greater dispel magic a comando', total: 59500 },
    { kind: 'formula', label: 'spell resistance continua 5 ft., SR 25', level: 5, cl: 9, price: 1000, mult: 2 },
  ] },
  { name: 'Luck Blade', unit: 'numen', stated: 34600, note: 'Senza desideri, come da libro.', parts: [
    { kind: 'fixed', label: '+2 short sword', total: 8000 },
    { kind: 'fixed', label: '+1 luck bonus ai tiri salvezza', total: 5000 },
    { kind: 'formula', label: 'moment of prescience 1/giorno', level: 8, cl: 15, price: 900, mult: 0.2 },
  ] },
  { name: 'Rod of Smiting', unit: 'numen', stated: 26000, parts: [
    { kind: 'fixed', label: '+3 heavy mace', total: 18000 },
    { kind: 'fixed', label: 'penetra DR/adamantio', total: 6000 },
    { kind: 'formula', label: 'energy mace con costrutti e esterni', level: 1, cl: 4, price: 500, mult: 1 },
  ] },
  { name: 'Staff of Striking', unit: 'numen', stated: 16000, parts: [
    { kind: 'fixed', label: '+2 quarterstaff', total: 8000 },
    { kind: 'formula', label: 'energy mace, +2d6', level: 1, cl: 2, price: 500, mult: 8 },
  ] },
  { name: 'Staff of Withering', unit: 'numen', stated: 50000, note: 'Le parti sommano 50.500: il libro stampa 50.000.', parts: [
    { kind: 'fixed', label: '+1 quarterstaff', total: 2000 },
    { kind: 'fixed', label: 'talenti e Severing Strike (BAB +11)', total: 26000 },
    { kind: 'formula', label: 'pass the years', level: 5, cl: 9, price: 500, mult: 1 },
  ] },
  { name: 'Sylvan Scimitar', unit: 'numen', stated: 21000, note: 'Le parti sommano 22.000: il libro stampa 21.000.', parts: [
    { kind: 'fixed', label: '+3 scimitar', total: 18000 },
    { kind: 'fixed', label: 'Cleave', total: 2000 },
    { kind: 'fixed', label: 'invocation of the knife', total: 2000 },
  ] },
  { name: 'Warding (resurrezione)', unit: 'numen', stated: 24500, parts: [
    { kind: 'formula', label: 'warding, sulla morte', level: 5, cl: 9, price: 500, mult: 1 },
    { kind: 'fixed', label: 'feat Soulcrafting', total: 2000 },
  ] },
  { name: 'Thundering', unit: 'numen', stated: 4500, note: 'La formula della prima parte dà 3.000: il libro stampa 2.500.', parts: [
    { kind: 'fixed', label: 'energia sonica, arma', total: 2500 },
    { kind: 'formula', label: 'energia sonica, burst', level: 2, cl: 2, price: 500, mult: 1 },
  ] },
  { name: 'Frost Brand', unit: 'numen', stated: 27000, parts: [
    { kind: 'fixed', label: 'Frost (+1d6)', total: 2000 },
    { kind: 'fixed', label: 'resistenza al fuoco 10', total: 10000 },
    { kind: 'formula', label: 'warding (fuoco), continuo', level: 3, cl: 5, price: 1000, mult: 1 },
  ] },
  { name: 'Determination', unit: 'numen', stated: 10350, parts: [
    { kind: 'formula', label: 'breath of life, 1/giorno', level: 5, cl: 9, price: 900, mult: 0.2 },
    { kind: 'formula', label: 'costo della spell latente', level: 5, cl: 9, price: 50, mult: 1 },
  ] },
  { name: 'Grinding', unit: 'numen', stated: 3025, note: 'La formula stampata dà livello 0 e 0 numen: uso i valori del libro.', parts: [
    { kind: 'fixed', label: 'continuo, 6 round', total: 3000 },
    { kind: 'fixed', label: 'effetto latente', total: 25 },
  ] },
  { name: 'Stanching', unit: 'numen', stated: 4000, note: 'La formula stampata è incoerente (livello 0): uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'stabilize, continuo', total: 4000 },
  ] },
  { name: 'Reliquary', unit: 'numen', stated: 5000, note: 'La formula dà 6.000: il libro stampa 5.000.', parts: [
    { kind: 'formula', label: 'consecrate o desecrate', level: 2, cl: 3, price: 1000, mult: 1 },
  ] },
  { name: 'Buccaneer’s', unit: 'numen', stated: 7500, note: 'La formula dà 9.000: il libro stampa 7.500.', parts: [
    { kind: 'formula', label: 'water walk', level: 2, cl: 3, price: 1000, mult: 1.5 },
  ] },
  { name: 'Belt of Dwarvenkind', unit: 'numen', stated: 12000, note: 'La formula dà 20.000: il libro stampa 12.000.', parts: [
    { kind: 'formula', label: 'polymorph (dwarf), continuo', level: 2, cl: 5, price: 1000, mult: 2 },
  ] },
  { name: 'Rope of Entanglement', unit: 'numen', stated: 2700, note: 'La formula dà 13.500: il libro stampa 2.700.', parts: [
    { kind: 'formula', label: 'bind inexorable', level: 3, cl: 5, price: 900, mult: 1 },
  ] },
  { name: 'Blinding', unit: 'numen', stated: 1800, note: 'La formula dà 2.160: il libro stampa 1.800.', parts: [
    { kind: 'formula', label: 'pyrotechnics, 2/giorno', level: 2, cl: 3, price: 900, mult: 0.4 },
  ] },
  { name: 'Potion of Longevity', unit: 'gp', stated: 4450, note: 'La formula dà 4.550 gp: il libro stampa 4.450.', parts: [
    { kind: 'formula', label: 'extend life con mass effect', level: 7, cl: 13, price: 50, mult: 1 },
  ] },
  { name: 'Belladonna', unit: 'gp', stated: 75, note: 'Il libro indica 75 gp a dose (100 in listino) e 450 numen per la scorta: la scorta dal libro non coincide con 18 volte i gp.', parts: [
    { kind: 'fixed', label: 'dose', total: 75 },
  ] },
  { name: 'Tears of Death', unit: 'gp', stated: 1800, note: 'Scorta privata: 32.400 numen.', parts: [
    { kind: 'formula', label: 'damage attribute e modificatori', level: 6, cl: 6, price: 50, mult: 1 },
  ] },
  { name: 'Spread of Savagery', unit: 'gp', stated: 1800, note: 'Il libro non indica l’unità del prezzo: trattato come gp.', parts: [
    { kind: 'formula', label: 'savagery', level: 4, cl: 9, price: 50, mult: 1 },
  ] },
  { name: 'Dust of Tracelessness', unit: 'gp', stated: 250, note: 'Il libro dà un livello frazionario: uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'dose', total: 250 },
  ] },
  { name: 'Unholy', unit: 'numen', stated: 24000, note: 'La formula dà 16.000: il libro stampa 24.000.', parts: [
    { kind: 'formula', label: 'ray of entropy, 8 istantaneo', level: 2, cl: 2, price: 500, mult: 8 },
  ] },
  { name: 'Distracting', unit: 'numen', stated: 5000, note: 'La formula dà 10.000 per CL 10: il libro stampa 5.000.', parts: [
    { kind: 'formula', label: 'skill enhancement + channel, 2 (1 min./livello)', level: 1, cl: 10, price: 500, mult: 2 },
  ] },
  { name: 'Entangling', unit: 'numen', stated: 2000, note: 'Ogni round di durata in più costa altri 2.000 numen.', parts: [
    { kind: 'fixed', label: 'bind, istantaneo', total: 2000 },
  ] },
  { name: 'Holy', unit: 'numen', stated: 16000, parts: [
    { kind: 'formula', label: 'bolt of force con consecrate, istantaneo', level: 2, cl: 2, price: 500, mult: 8 },
  ] },
  { name: 'Shieldsplitter', unit: 'numen', stated: 6000, note: 'La formula stampata è incoerente (livello 0): uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'invocation of the knife, 8', total: 6000 },
  ] },
  { name: 'Vicious', unit: 'numen', stated: 8000, note: 'La formula stampata è incoerente (livello 0): uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'ray of entropy, 8', total: 8000 },
  ] },
  { name: 'Wounding', unit: 'numen', stated: 6000, note: 'La formula stampata è incoerente (livello 0): uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'invocation of the knife, 8', total: 6000 },
  ] },
  { name: 'Weakening', unit: 'numen', stated: 250, note: 'Livello frazionario nel libro: uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'damage attribute, 8', total: 250 },
  ] },
  { name: 'Spark of life', unit: 'numen', stated: 2500, note: 'La formula dà 3.000: il libro stampa 2.500.', parts: [
    { kind: 'fixed', label: 'spark of life, contingente', total: 2500 },
  ] },
  { name: 'Sickening touch (paura)', unit: 'numen', stated: 250, note: 'Livello 0 nel libro: uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'sickening touch, contingente', total: 250 },
  ] },
  { name: 'Everburning Torch', unit: 'numen', stated: 750, note: 'Livello 0 nel libro: uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'light, continuo', total: 750 },
  ] },
  { name: 'Stream', unit: 'numen', stated: 900, note: 'Livello 0 nel libro: uso il totale del libro.', parts: [
    { kind: 'fixed', label: 'create water', total: 900 },
  ] },
  { name: 'Amulet of Spell Resistance', unit: 'numen', stated: 90000, note: 'SR 25 con Carisma = metà del livello. Ogni punto in più o in meno: ±10.000 numen.', parts: [
    { kind: 'formula', label: 'spell resistance', level: 5, cl: 9, price: 1000, mult: 2 },
  ] },
  { name: 'Amulet of Spell Resistance (Carisma del possessore)', unit: 'numen', stated: 132000, note: 'Con Amplify Spell. Ogni punto in più o in meno: ±12.000 numen.', parts: [
    { kind: 'formula', label: 'spell resistance con amplify', level: 6, cl: 11, price: 1000, mult: 2 },
  ] },
];
