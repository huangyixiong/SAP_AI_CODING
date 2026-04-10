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

  // Type references: TYPE REF TO <class> or TYPE <class>
  const typeRefRe = /\bTYPE\s+(REF\s+TO\s+)?(\w+)/gi;
  for (const m of source.matchAll(typeRefRe)) {
    const className = m[2].toUpperCase();
    // Skip basic types and keywords
    if (!['STRING', 'INTEGER', 'I', 'N', 'P', 'DECIMALS', 'ANY', 'DATA'].includes(className)) {
      add({ name: className, type: 'CLAS', category: 'class', autoInclude: false });
    }
  }

  // Interface implementation: INTERFACES <iface>
  const interfaceRe = /\bINTERFACES\s+(\w+)/gi;
  for (const m of source.matchAll(interfaceRe)) {
    add({ name: m[1].toUpperCase(), type: 'INTF', category: 'interface', autoInclude: false });
  }

  // Database tables referenced: FROM <table>
  const fromTableRe = /\bFROM\s+(\w+)\b/gi;
  for (const m of source.matchAll(fromTableRe)) {
    const tableName = m[1].toUpperCase();
    // Include both custom and standard tables, excluding common SQL keywords misinterpreted as tables
    if (!['DUAL', 'SELECT'].includes(tableName)) {
      add({ name: tableName, type: 'TABL', category: 'table', autoInclude: false });
    }
  }

  // INTO TABLE <table> or APPENDING TABLE <table>
  const intoTableRe = /\b(?:INTO|APPENDING)\s+TABLE\s+(\w+)/gi;
  for (const m of source.matchAll(intoTableRe)) {
    add({ name: m[1].toUpperCase(), type: 'TABL', category: 'table', autoInclude: false });
  }

  // Data element references: TYPE <ddic_type> (Custom types starting with Z or Y)
  const ddicTypeRe = /\bTYPE\s+(?:REF\s+TO\s+)?(Z\w+|Y\w+)/gi;
  for (const m of source.matchAll(ddicTypeRe)) {
    const typeName = m[1].toUpperCase();
    // Could be DTEL, TABL, or CLAS - mark as DTEL/Type by default
    add({ name: typeName, type: 'DTEL', category: 'type', autoInclude: false });
  }

  // Constant/Type definitions referencing DDIC: LIKE <ddic_object>
  const likeRe = /\bLIKE\s+(\w+)/gi;
  for (const m of source.matchAll(likeRe)) {
    const objName = m[1].toUpperCase();
    if (objName.startsWith('Z') || objName.startsWith('Y')) {
      add({ name: objName, type: 'DTEL', category: 'type', autoInclude: false });
    }
  }

  return Array.from(found.values());
}
