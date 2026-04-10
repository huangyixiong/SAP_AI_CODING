export interface DetectedObject {
  name: string;
  type: string;       // PROG/I, FUNC, CLAS, INTF, TABL, DTEL, DOMA
  category: string;   // 'include' | 'function' | 'class' | 'table' | 'type'
  autoInclude: boolean;
}

/**
 * Parse ABAP source code and detect referenced objects.
 */
export function analyzeABAPSource(source: string): DetectedObject[] {
  const found = new Map<string, DetectedObject>();

  const add = (obj: DetectedObject) => {
    if (!found.has(obj.name)) found.set(obj.name, obj);
  };

  // INCLUDE programs: INCLUDE <name>.
  const includeRe = /^\s*INCLUDE\s+(\w+)\s*\./gim;
  for (const m of source.matchAll(includeRe)) {
    add({ name: m[1].toUpperCase(), type: 'PROG/I', category: 'include', autoInclude: true });
  }

  // Function modules: CALL FUNCTION '<name>'
  const funcRe = /CALL\s+FUNCTION\s+'([A-Z0-9_/]+)'/gi;
  for (const m of source.matchAll(funcRe)) {
    const name = m[1].toUpperCase();
    // Skip built-in / RFC-style without Z/Y prefix just flag them, user decides
    add({ name, type: 'FUNC', category: 'function', autoInclude: false });
  }

  // Class instantiation: CREATE OBJECT ... TYPE <class>
  const createObjRe = /CREATE\s+OBJECT\s+\w+\s+TYPE\s+(\w+)/gi;
  for (const m of source.matchAll(createObjRe)) {
    add({ name: m[1].toUpperCase(), type: 'CLAS', category: 'class', autoInclude: false });
  }

  // NEW <class>( ), CLASS-BASED
  const newRe = /\bNEW\s+(\w+)\s*\(/gi;
  for (const m of source.matchAll(newRe)) {
    const name = m[1].toUpperCase();
    if (!['IF', 'TRY', 'DO', 'WHILE'].includes(name)) {
      add({ name, type: 'CLAS', category: 'class', autoInclude: false });
    }
  }

  // Database tables referenced: FROM <table> / INTO TABLE <table>
  const tableRe = /\bFROM\s+(\w+)\b/gi;
  for (const m of source.matchAll(tableRe)) {
    const name = m[1].toUpperCase();
    if (name.startsWith('Z') || name.startsWith('Y')) {
      add({ name, type: 'TABL', category: 'table', autoInclude: false });
    }
  }

  return Array.from(found.values());
}
