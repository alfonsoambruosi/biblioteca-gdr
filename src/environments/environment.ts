/**
 * CONFIGURAZIONE
 *
 * driveRootId: l'ID della cartella principale del Drive (già inserito).
 * apiKey:      la chiave API Google (vedi README.md, passo 2).
 * mergeGroups: file della stessa cartella da mostrare come un unico documento.
 *              Vengono uniti in ordine alfabetico del nome.
 *
 * Il Drive viene riletto solo quando la pagina viene aperta o aggiornata (F5).
 */
export const environment = {
  driveRootId: '1zyULW02GoZhcXmsVODW0m4jaxsKIcHkB',
  apiKey: 'AIzaSyAkhocEH46g04jOJit8vbRpXLGT5_1Uugw',
  mergeGroups: [
    { pattern: /^Ch\.?\s*8a?\b/i, name: 'Ch 8 + 8a - Spells e Spells Grimoire' },
  ] as { pattern: RegExp; name: string }[],
};
